#!/usr/bin/env node
/**
 * Dungeon Mastron blog post publisher.
 *
 * Input: a markdown file with frontmatter (slug, title, description, date, author,
 *        category, tags, image).
 *
 * What it does:
 *   (a) Renders markdown -> HTML using `marked`
 *   (b) Writes static HTML at public/blog/<slug>/index.html (EXACT cornerstone template)
 *   (c) Inserts a card into public/blog/index.html (newest first)
 *   (d) Adds the URL to public/sitemap.xml
 *   (e) Upserts a row into DM's Supabase blog_posts table
 *   (f) Best-effort IndexNow ping
 *
 * SEO guards applied (mirrors directree pattern, Ahrefs audit lessons):
 *   - Auto-demotes body H1 -> H2 (single-H1 rule)
 *   - Warns on bare-apex dungeonmastron.com internal links
 *   - Description length gate (110-160 chars)
 *   - Title length gate (<=65 chars)
 *   - Em-dash warning in title/description
 *
 * Usage:
 *   cd dungeon_mastron/app
 *   node --env-file=.env.local scripts/blog/publish-blog-post.mjs ../../content/blog/my-post.md
 *   node --env-file=.env.local scripts/blog/publish-blog-post.mjs ../../content/blog/my-post.md --strict
 *
 * SEPARATION: writes ONLY to DM's Supabase (wppcbpbrustgcdqhfuqs).
 *             Never touches VNDLY / QRhubly / Lapsewise / directree.
 *
 * DEPS: marked, @supabase/supabase-js, gray-matter (listed in package.json)
 *       Run `npm install` in dungeon_mastron/app/ before first use.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import matter from "gray-matter";
import { marked } from "marked";
import { submitUrlIndexNow } from "../seo/indexnow.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// Env loader (reads .env.local from app/ cwd)
// ─────────────────────────────────────────────────────────────────────────────
function loadEnvFromFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8");
  contents.split(/\r?\n/).forEach((line) => {
    if (!line || line.trim().startsWith("#")) return;
    const [key, ...rest] = line.split("=");
    if (!key) return;
    const value = rest.join("=").trim();
    if (!process.env[key]) process.env[key] = value.replace(/^"|"$/g, "");
  });
}

function calculateReadingTime(content) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ─────────────────────────────────────────────────────────────────────────────
// Static HTML generation helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Format a Date object as "July 9, 2026" */
function formatDisplayDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/** Generate the full static post HTML — new directree-quality DM dark-fantasy design. */
function buildPostHtml({ slug, title, description, date, contentHtml, readingTimeMinutes, image, category, author, tags }) {
  const canonicalUrl = `https://www.dungeonmastron.com/blog/${slug}/`;
  const ogImage = image
    ? (image.startsWith("http") ? image : `https://www.dungeonmastron.com${image}`)
    : "https://www.dungeonmastron.com/web_assets/og-image.jpg";
  const displayDate = formatDisplayDate(date);
  const cat = category || "Blog";
  const postAuthor = author || "Dungeon Mastron";
  const postTags = Array.isArray(tags) ? tags : [];

  const tagsHtml = postTags.length
    ? `\n      <div class="post-tags">${postTags.map(t => `<a class="post-tag" href="/blog/?tag=${encodeURIComponent(t)}">#${escHtml(t)}</a>`).join("")}\n      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)} \u2014 Dungeon Mastron</title>
  <meta name="description" content="${escAttr(description)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:site_name" content="Dungeon Mastron" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escAttr(title)}" />
  <meta property="og:description" content="${escAttr(description)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${ogImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escAttr(title)}" />
  <meta name="twitter:description" content="${escAttr(description)}" />
  <meta name="twitter:image" content="${ogImage}" />
  <link rel="icon" type="image/png" sizes="32x32" href="/web_assets/favicon-32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/web_assets/apple-touch-icon.png" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": "${canonicalUrl}",
    "name": "${escJson(title)}",
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.dungeonmastron.com/" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://www.dungeonmastron.com/blog/" },
        { "@type": "ListItem", "position": 3, "name": "${escJson(title)}", "item": "${canonicalUrl}" }
      ]
    },
    "mainEntity": {
      "@type": "BlogPosting",
      "headline": "${escJson(title)}",
      "description": "${escJson(description)}",
      "url": "${canonicalUrl}",
      "datePublished": "${date}",
      "dateModified": "${date}",
      "image": "${ogImage}",
      "author": { "@type": "Organization", "name": "Dungeon Mastron", "url": "https://www.dungeonmastron.com/" },
      "publisher": { "@type": "Organization", "name": "Dungeon Mastron", "url": "https://www.dungeonmastron.com/" }
    }
  }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="/web_assets/site_shell.css" />
  <style>
    /* \u2500\u2500 Post page scoped styles \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
    body { margin: 0; background: var(--shell-bg); color: var(--shell-text); font-family: var(--shell-font); }
    .post-breadcrumb {
      max-width: 780px; margin: 0 auto; padding: 22px 18px 0;
      display: flex; align-items: center; gap: 6px;
      font-family: var(--shell-mono); font-size: 11px; letter-spacing: 0.07em; text-transform: uppercase;
      color: rgba(232,227,217,0.40);
    }
    .post-breadcrumb a { color: rgba(232,227,217,0.45); text-decoration: none; transition: color 0.15s; }
    .post-breadcrumb a:hover { color: #6B9B7F; }
    .post-breadcrumb .sep { opacity: 0.4; }
    .post-header-wrap { max-width: 780px; margin: 20px auto 0; padding: 0 18px; }
    .post-header {
      position: relative; border-radius: 16px;
      border: 1px solid rgba(217,119,87,0.25);
      background: linear-gradient(135deg, rgba(217,119,87,0.10) 0%, rgba(107,155,127,0.06) 60%, transparent 100%);
      padding: 32px 36px 28px; overflow: hidden;
    }
    .post-header::before {
      content: ""; position: absolute; top: -60px; right: -60px;
      width: 220px; height: 220px; border-radius: 50%;
      background: radial-gradient(circle, rgba(217,119,87,0.15) 0%, transparent 70%);
      pointer-events: none;
    }
    @media (max-width: 640px) { .post-header { padding: 22px 18px 20px; } }
    .post-cat {
      font-family: var(--shell-mono); font-size: 10.5px; letter-spacing: 0.13em;
      text-transform: uppercase; color: #D97757; display: inline-block; margin-bottom: 14px;
    }
    .post-header h1 {
      font-family: var(--shell-heading); font-weight: 700;
      font-size: clamp(1.6rem, 3.8vw, 2.4rem); line-height: 1.18;
      letter-spacing: 0.01em; margin: 0 0 12px; color: var(--shell-text);
    }
    .post-lede { font-size: 1.05rem; line-height: 1.65; color: var(--shell-sub); margin: 0 0 20px; }
    .post-meta-row {
      display: flex; align-items: center; flex-wrap: wrap; gap: 10px 16px;
      font-family: var(--shell-mono); font-size: 11px; letter-spacing: 0.08em;
      color: rgba(232,227,217,0.45); text-transform: uppercase;
    }
    .post-meta-row .meta-author { color: rgba(232,227,217,0.6); }
    .post-meta-row .sep { opacity: 0.4; }
    .post-prose-wrap { max-width: 780px; margin: 0 auto; padding: 0 18px 80px; }
    .post-prose { margin-top: 36px; }
    .post-prose h2 {
      font-family: var(--shell-heading); font-weight: 700; font-size: 1.4rem; line-height: 1.25;
      margin: 46px 0 14px; color: var(--shell-text);
      border-left: 3px solid #D97757; padding-left: 14px;
    }
    .post-prose h3 {
      font-family: var(--shell-heading); font-weight: 600; font-size: 1.1rem; line-height: 1.3;
      margin: 32px 0 10px; color: var(--shell-text);
    }
    .post-prose p { font-size: 1rem; line-height: 1.78; color: var(--shell-sub); margin: 0 0 18px; }
    .post-prose ul, .post-prose ol { margin: 0 0 18px; padding-left: 24px; color: var(--shell-sub); }
    .post-prose li { line-height: 1.72; margin-bottom: 8px; }
    .post-prose a { color: #6B9B7F; text-decoration: underline; text-underline-offset: 2px; }
    .post-prose a:hover { color: #8fbfaa; }
    .post-prose strong { color: var(--shell-text); font-weight: 600; }
    .post-prose em { color: rgba(232,227,217,0.80); }
    .post-prose blockquote {
      border-left: 3px solid #D97757; margin: 24px 0;
      padding: 10px 0 10px 22px; color: rgba(232,227,217,0.75);
      font-style: italic; font-size: 1.05rem; line-height: 1.7;
    }
    .post-prose code {
      font-family: var(--shell-mono); font-size: 0.875em;
      background: rgba(0,0,0,0.35); padding: 2px 7px; border-radius: 5px; color: #D97757;
    }
    .post-prose pre {
      background: rgba(0,0,0,0.45); border: 1px solid var(--shell-border);
      border-radius: 10px; padding: 18px 20px; overflow-x: auto; margin: 0 0 20px;
    }
    .post-prose pre code { background: none; padding: 0; font-size: 0.875rem; color: #b8b3a9; }
    .post-prose hr { border: none; border-top: 1px solid var(--shell-border); margin: 36px 0; }
    .post-prose .cta {
      border: 1px solid rgba(217,119,87,0.35); border-radius: 14px;
      background: rgba(217,119,87,0.06); padding: 22px 26px; margin: 32px 0;
    }
    .post-prose .cta p { margin: 0; color: var(--shell-sub); }
    .compare { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 0 0 22px; }
    @media (max-width: 620px) { .compare { grid-template-columns: 1fr; } }
    .compare .col { border: 1px solid var(--shell-border); border-radius: 12px; background: rgba(0,0,0,0.22); padding: 18px 20px; }
    .compare .col h3 { margin: 0 0 10px; font-family: var(--shell-heading); font-weight: 700; font-size: 1rem; color: var(--shell-text); }
    .compare .col ul { margin: 0; font-size: 0.9rem; }
    .post-tags { margin-top: 44px; padding-top: 24px; border-top: 1px solid var(--shell-border); display: flex; flex-wrap: wrap; gap: 8px; }
    .post-tag {
      font-family: var(--shell-mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase;
      color: rgba(232,227,217,0.50); border: 1px solid var(--shell-border); border-radius: 999px;
      padding: 5px 12px; text-decoration: none; transition: color 0.15s, border-color 0.15s;
    }
    .post-tag:hover { color: #6B9B7F; border-color: rgba(107,155,127,0.45); }
    .post-cta-panel {
      margin-top: 44px; padding: 28px 30px;
      border: 1px solid rgba(217,119,87,0.30); border-radius: 16px;
      background: linear-gradient(135deg, rgba(217,119,87,0.08) 0%, rgba(0,0,0,0.20) 100%);
      text-align: center;
    }
    .post-cta-panel h3 { font-family: var(--shell-heading); font-weight: 700; font-size: 1.25rem; margin: 0 0 10px; color: var(--shell-text); }
    .post-cta-panel p { margin: 0 0 18px; color: var(--shell-sub); font-size: 0.9375rem; line-height: 1.6; }
    .post-cta-btn {
      display: inline-block; padding: 11px 24px; border-radius: 10px;
      border: 1px solid rgba(217,119,87,0.55); background: rgba(217,119,87,0.22);
      color: #FFFCF7; font-family: var(--shell-mono); font-size: 12px;
      letter-spacing: 0.08em; text-transform: uppercase; text-decoration: none;
      transition: background 0.15s, border-color 0.15s;
    }
    .post-cta-btn:hover { background: rgba(217,119,87,0.30); border-color: rgba(217,119,87,0.80); }
    .post-back {
      display: inline-flex; align-items: center; gap: 6px; margin-top: 40px;
      font-family: var(--shell-mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
      color: #6B9B7F; text-decoration: none; transition: color 0.15s;
    }
    .post-back:hover { color: #8fbfaa; }
  </style>
</head>
<body>
  <div id="site-nav"></div>

  <nav class="post-breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a>
    <span class="sep">/</span>
    <a href="/blog/">Blog</a>
    <span class="sep">/</span>
    <span>${escHtml(cat)}</span>
  </nav>

  <div class="post-header-wrap">
    <header class="post-header">
      <span class="post-cat">${escHtml(cat)}</span>
      <h1>${escHtml(title)}</h1>
      <p class="post-lede">${escHtml(description)}</p>
      <div class="post-meta-row">
        <span class="meta-author">${escHtml(postAuthor)}</span>
        <span class="sep">\u00b7</span>
        <span>${displayDate}</span>
        <span class="sep">\u00b7</span>
        <span>${readingTimeMinutes} min read</span>
      </div>
    </header>
  </div>

  <div class="post-prose-wrap">
    <article class="post-prose">
      ${contentHtml}
      ${tagsHtml}

      <div class="post-cta-panel">
        <h3>Build your own story game</h3>
        <p>The Visual Builder is free, open source, and runs in your browser. No account needed.</p>
        <a class="post-cta-btn" href="/builder/">Open the Visual Builder</a>
      </div>

      <a class="post-back" href="/blog/">\u2190 Back to all posts</a>
    </article>
  </div>

  <div id="site-footer"></div>

  <script src="/web_assets/site_shell.js?v=2" defer></script>
</body>
</html>`;
}

/** Generate a post-card HTML block for the new grid blog index. */
function buildPostCard({ slug, title, description, date, category, readingTimeMinutes }) {
  // Short date: "Jul 9, 2026"
  const d = new Date(date + "T12:00:00Z");
  const shortDate = d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  const cat = category || "Blog";
  const mins = readingTimeMinutes || 5;

  // Infer a nice "Read the X" label from the category/slug
  const readLabel = (cat.toLowerCase().includes("comparison") || slug.includes("vs-") || slug.includes("-vs-"))
    ? "Read the comparison"
    : cat.toLowerCase().includes("tutorial") || slug.includes("tutorial") || slug.includes("how-to") || slug.includes("make-a")
    ? "Read the tutorial"
    : cat.toLowerCase().includes("guide") || slug.includes("guide")
    ? "Read the guide"
    : cat.toLowerCase().includes("essay")
    ? "Read the essay"
    : "Read the post";

  return `
    <article class="post-card">
      <span class="card-cat">${escHtml(cat)}</span>
      <h2><a href="/blog/${slug}/" style="color:inherit;text-decoration:none;">${escHtml(title)}</a></h2>
      <p class="card-excerpt">${escHtml(description)}</p>
      <div class="card-meta">
        <span>${shortDate}</span>
        <span class="sep">\u00b7</span>
        <span>${mins} min read</span>
      </div>
      <a class="card-read" href="/blog/${slug}/">${readLabel} <span class="card-arrow">\u2192</span></a>
    </article>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML / JSON string escaping helpers
// ─────────────────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escAttr(str) {
  return String(str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escJson(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// ─────────────────────────────────────────────────────────────────────────────
// Blog index updater: insert new card after the opening <main …> tag (newest first)
// ─────────────────────────────────────────────────────────────────────────────
function insertCardIntoBlogIndex(indexPath, card, slug) {
  let html = fs.readFileSync(indexPath, "utf8");

  // Guard: don't double-insert if the slug is already in the index
  if (html.includes(`href="/blog/${slug}/"`)) {
    console.log(`  blog/index.html already contains /blog/${slug}/ — skipping card insert`);
    return;
  }

  // Injection point: right after <!-- POSTS_START --> marker (newest first).
  // Fallback: before <!-- POSTS_END --> marker.
  // Second fallback: before </div><!-- /blog-grid --> pattern.
  const startMarker = "<!-- POSTS_START -->";
  const endMarker = "<!-- POSTS_END -->";

  if (html.includes(startMarker)) {
    const insertAfter = html.indexOf(startMarker) + startMarker.length;
    html = html.slice(0, insertAfter) + "\n" + card + html.slice(insertAfter);
  } else if (html.includes(endMarker)) {
    html = html.replace(endMarker, card + "\n    " + endMarker);
  } else {
    // Legacy fallback: inject after <p class="lead"> block
    const marker = /(<p class="lead">[\s\S]*?<\/p>)/;
    const match = html.match(marker);
    if (!match) {
      console.warn("  Could not find insertion anchor in blog/index.html — appending before </div>");
      html = html.replace("</div><!-- /blog-grid -->", card + "\n    </div><!-- /blog-grid -->");
    } else {
      const insertAfter = match.index + match[0].length;
      html = html.slice(0, insertAfter) + "\n" + card + html.slice(insertAfter);
    }
  }

  fs.writeFileSync(indexPath, html);
  console.log(`  Inserted post card into blog/index.html`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sitemap updater: add <url> entry before </urlset>
// ─────────────────────────────────────────────────────────────────────────────
function addToSitemap(sitemapPath, slug, date) {
  let xml = fs.readFileSync(sitemapPath, "utf8");
  const newUrl = `https://www.dungeonmastron.com/blog/${slug}/`;

  if (xml.includes(newUrl)) {
    console.log(`  sitemap.xml already contains ${newUrl} — skipping`);
    return;
  }

  const entry = `  <url>
    <loc>${newUrl}</loc>
    <lastmod>${date}</lastmod>
    <priority>0.6</priority>
  </url>`;

  xml = xml.replace("</urlset>", entry + "\n</urlset>");
  fs.writeFileSync(sitemapPath, xml);
  console.log(`  Added ${newUrl} to sitemap.xml`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node scripts/blog/publish-blog-post.mjs <path-to-post.md> [--strict]");
    process.exit(1);
  }

  // Load .env.local (cwd = dungeon_mastron/app when running via package.json script)
  loadEnvFromFile(path.join(process.cwd(), ".env.local"));

  const supabaseUrl =
    process.env.DUNGEONMASTRON_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const serviceKey =
    process.env.DUNGEONMASTRON_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing DUNGEONMASTRON_SUPABASE_URL / DUNGEONMASTRON_SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  const fullPath = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);

  if (!data.slug || !data.title || !data.description) {
    throw new Error("Frontmatter must include slug, title, and description.");
  }

  // ── Frontmatter quality gate ──────────────────────────────────────────────
  const strict = process.argv.includes("--strict");
  const hardErrors = [];
  const warnings = [];
  const title = data.title;
  const desc = data.description;

  for (const [field, val] of [["title", title], ["description", desc]]) {
    if (typeof val !== "string") {
      hardErrors.push(`${field} is not a string (got ${typeof val}) — likely malformed YAML.`);
      continue;
    }
    const trimmed = val.trim();
    if (["", ">-", ">", "|", "|-"].includes(trimmed)) {
      hardErrors.push(`${field} is empty or a broken YAML scalar marker ("${trimmed}").`);
    }
  }
  if (typeof desc === "string") {
    if (desc.length > 160) warnings.push(`description is ${desc.length} chars (target 150-155, hard max 160).`);
    if (desc.length > 0 && desc.length < 110) warnings.push(`description is only ${desc.length} chars (target 150-155).`);
    if (desc.includes("\u2014")) warnings.push("description contains an em dash (\u2014) — use a regular dash or rewrite.");
  }
  if (typeof title === "string") {
    if (title.length > 65) warnings.push(`title is ${title.length} chars (target <=60, hard max ~65).`);
    if (title.includes("\u2014")) warnings.push("title contains an em dash (\u2014) — use a regular dash or rewrite.");
  }
  if (warnings.length) {
    console.warn(`\n\u26a0\ufe0f  Frontmatter warnings for ${data.slug}:`);
    for (const w of warnings) console.warn("   - " + w);
    if (strict) hardErrors.push(`${warnings.length} soft warning(s) treated as errors under --strict.`);
    else console.warn("   (publishing anyway; re-run with --strict to block on these)\n");
  }
  if (hardErrors.length) {
    throw new Error(`Frontmatter quality gate FAILED for ${data.slug}:\n   - ${hardErrors.join("\n   - ")}`);
  }

  // ── Content SEO-hygiene gate ──────────────────────────────────────────────
  let body = content;

  // SINGLE H1: body starts at h2 — auto-demote any body H1.
  if (/^#\s+/m.test(body) || /<h1[\s>]/i.test(body)) {
    body = body
      .replace(/^#\s+/gm, "## ")
      .replace(/<h1(\s[^>]*)?>/gi, "<h2$1>")
      .replace(/<\/h1>/gi, "</h2>");
    console.warn(`\n\u26a0\ufe0f  Body H1 found and auto-demoted to H2 for ${data.slug}.`);
  }

  // NON-CANONICAL internal links: bare-apex dungeonmastron.com -> should be www.
  if (/href="https?:\/\/dungeonmastron\.com/i.test(body)) {
    console.warn(
      `\n\u26a0\ufe0f  ${data.slug}: internal link uses bare apex dungeonmastron.com (redirects) — use https://www.dungeonmastron.com`
    );
    if (strict) throw new Error("bare-apex internal link under --strict.");
  }

  // ── Render markdown -> HTML ───────────────────────────────────────────────
  const readingTimeMinutes = calculateReadingTime(body);
  const contentHtml = await marked.parse(body);

  // ── Static file paths (relative to dungeon_mastron/app/) ─────────────────
  // When run as: cd dungeon_mastron/app && node scripts/blog/publish-blog-post.mjs ...
  // process.cwd() = dungeon_mastron/app/
  const publicDir = path.join(process.cwd(), "public");
  const blogPublicDir = path.join(publicDir, "blog");
  const postDir = path.join(blogPublicDir, data.slug);
  const postHtmlPath = path.join(postDir, "index.html");
  const blogIndexPath = path.join(blogPublicDir, "index.html");
  const sitemapPath = path.join(publicDir, "sitemap.xml");

  // ── (b) Write static post HTML ────────────────────────────────────────────
  fs.mkdirSync(postDir, { recursive: true });
  const postHtml = buildPostHtml({
    slug: data.slug,
    title: data.title,
    description: data.description,
    date: data.date || new Date().toISOString().slice(0, 10),
    contentHtml,
    readingTimeMinutes,
    image: data.image || "",
    category: data.category || "Blog",
    author: data.author ?? "Dungeon Mastron",
    tags: data.tags ?? [],
  });
  fs.writeFileSync(postHtmlPath, postHtml);
  console.log(`\u2705 Wrote static post: public/blog/${data.slug}/index.html`);

  // ── (c) Insert card into blog listing ─────────────────────────────────────
  if (fs.existsSync(blogIndexPath)) {
    const card = buildPostCard({
      slug: data.slug,
      title: data.title,
      description: data.description,
      date: data.date || new Date().toISOString().slice(0, 10),
      category: data.category || "Blog",
      readingTimeMinutes,
    });
    insertCardIntoBlogIndex(blogIndexPath, card, data.slug);
  } else {
    console.warn(`  blog/index.html not found at ${blogIndexPath} — skipping card insert`);
  }

  // ── (d) Add to sitemap ────────────────────────────────────────────────────
  if (fs.existsSync(sitemapPath)) {
    addToSitemap(sitemapPath, data.slug, data.date || new Date().toISOString().slice(0, 10));
  } else {
    console.warn(`  sitemap.xml not found at ${sitemapPath} — skipping`);
  }

  // ── (e) Upsert to DM Supabase blog_posts ─────────────────────────────────
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: inserted, error } = await supabase
    .from("blog_posts")
    .upsert(
      {
        slug: data.slug,
        title: data.title,
        description: data.description,
        content,
        content_html: contentHtml,
        date: data.date || new Date().toISOString().slice(0, 10),
        author: data.author ?? "Dungeon Mastron",
        tags: data.tags ?? [],
        category: data.category ?? "Blog",
        image: data.image ?? "",
        published: data.published ?? true,
        reading_time_minutes: readingTimeMinutes,
      },
      { onConflict: "slug" }
    )
    .select("slug, title, date, category")
    .single();

  if (error) {
    console.error(`\u274c Supabase upsert failed: ${error.message}`);
    // Don't exit — static files are already written; the DB is secondary.
    console.warn("  Static files were written. Fix Supabase and re-run to sync the DB row.");
  } else {
    console.log("\u2705 Upserted to DM Supabase blog_posts:", inserted);
  }

  // ── (f) Best-effort IndexNow ping ─────────────────────────────────────────
  const blogUrl = `https://www.dungeonmastron.com/blog/${data.slug}/`;
  await submitUrlIndexNow(blogUrl);

  console.log(`\n\u2705 Done. Post live at: ${blogUrl}`);
  console.log(`\nNext steps (run from dungeon_mastron/app/):`);
  console.log(`  git add public/blog/${data.slug}/ public/blog/index.html public/sitemap.xml`);
  console.log(`  git commit -m "blog: add ${data.slug}"`);
  console.log(`  git push  # Vercel auto-deploys`);
}

main().catch((err) => {
  console.error("\u274c PUBLISH FAILED:", err.message);
  process.exit(1);
});
