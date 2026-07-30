#!/usr/bin/env node
/**
 * sync-header-images.mjs — bake blog header images from Supabase into the static site.
 *
 * Dungeon Mastron's blog is STATIC HTML, but header images are generated AFTER
 * publish via the flow-support-admin app ("Blog Header Images" tab), which
 * uploads to the `blog-images` storage bucket and sets blog_posts.image.
 *
 * This script closes the loop: it reads blog_posts (slug, title, image) from
 * DM's Supabase and patches the already-published static files:
 *   - public/blog/<slug>/index.html : hero <figure> between POST_HERO markers,
 *     og:image / twitter:image metas, JSON-LD "image", hero CSS if missing
 *   - public/blog/index.html        : .card-img block on the post's card
 *
 * Idempotent — re-runs with no DB changes produce no file changes.
 * Prints "CHANGED" on the last line when any file was modified (cron uses this
 * to decide whether to commit + push + deploy).
 *
 * Usage: cd dungeon_mastron/app && node --env-file=.env.local scripts/blog/sync-header-images.mjs
 */

import fs from "node:fs";
import path from "node:path";

// ── env (fallback loader for when --env-file isn't used) ─────────────────────
function loadEnvFromFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnvFromFile(path.join(process.cwd(), ".env.local"));

const SUPABASE_URL =
  process.env.DUNGEONMASTRON_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY =
  process.env.DUNGEONMASTRON_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  // ⚠️ Jul 30 2026: DM Supabase retired (project repurposed for SaaS Rocket).
  // Blog images are self-hosted in public/blog-images/ now — nothing to sync.
  console.error("sync-header-images.mjs: DM Supabase retired Jul 30 2026 — images live in public/blog-images/. Exiting.");
  process.exit(0);
}

// NOTE: keep in sync with the .post-hero styles in publish-blog-post.mjs's template.
const HERO_CSS = `  <style id="dm-post-hero-css">
    .post-hero-wrap { max-width: 800px; margin: 30px auto 0; padding: 0 18px; }
    .post-hero { position: relative; margin: 0; }
    .post-hero img { display: block; width: 100%; height: auto; border: 1px solid var(--shell-border-strong); filter: saturate(0.97); }
    .post-hero::before, .post-hero::after { content: ""; position: absolute; width: 16px; height: 16px; pointer-events: none; border: 0 solid rgba(226,104,60,0.6); }
    .post-hero::before { top: -6px; left: -6px; border-top-width: 1px; border-left-width: 1px; }
    .post-hero::after { bottom: -6px; right: -6px; border-bottom-width: 1px; border-right-width: 1px; }
  </style>
`;

function escAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
}

function heroBlock(imageUrl, title) {
  return `<!-- POST_HERO_START -->
  <div class="post-hero-wrap">
    <figure class="post-hero"><img src="${escAttr(imageUrl)}" alt="${escAttr(title)}" width="1536" height="1024" fetchpriority="high" /></figure>
  </div>
  <!-- POST_HERO_END -->`;
}

function absoluteUrl(image) {
  return image.startsWith("http") ? image : `https://www.dungeonmastron.com${image}`;
}

/** Patch one static post page. Returns true if the file changed. */
function patchPostPage(postPath, imageUrl, title) {
  let html = fs.readFileSync(postPath, "utf8");
  const before = html;
  const abs = absoluteUrl(imageUrl);

  // 1. Meta tags + JSON-LD image
  html = html.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${abs}$2`);
  html = html.replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${abs}$2`);
  html = html.replace(/("image":\s*")[^"]*(")/g, `$1${abs}$2`);

  // 2. Hero CSS (older pages were rendered before the template carried it)
  if (!html.includes(".post-hero-wrap {") && !html.includes('id="dm-post-hero-css"')) {
    html = html.replace("</head>", HERO_CSS + "</head>");
  }

  // 3. Hero figure
  const block = heroBlock(imageUrl, title);
  if (html.includes("<!-- POST_HERO_START -->")) {
    html = html.replace(/<!-- POST_HERO_START -->[\s\S]*?<!-- POST_HERO_END -->/, block);
  } else {
    // Pages rendered before markers existed: insert above the prose.
    const anchor = '<div class="post-prose-wrap">';
    const idx = html.indexOf(anchor);
    if (idx === -1) {
      console.warn(`  ⚠️  ${postPath}: no POST_HERO markers and no .post-prose-wrap anchor — skipped hero insert`);
    } else {
      html = html.slice(0, idx) + block + "\n\n  " + html.slice(idx);
    }
  }

  if (html !== before) {
    fs.writeFileSync(postPath, html);
    return true;
  }
  return false;
}

/** Patch the post's card in public/blog/index.html. Returns true if changed. */
function patchBlogIndexCard(indexPath, slug, imageUrl) {
  let html = fs.readFileSync(indexPath, "utf8");
  const before = html;

  const cardRe = /<article class="post-card">[\s\S]*?<\/article>/g;
  html = html.replace(cardRe, (card) => {
    if (!card.includes(`/blog/${slug}/`)) return card;
    const imgTag = `\n      <a class="card-img" href="/blog/${slug}/" tabindex="-1" aria-hidden="true"><img src="${escAttr(imageUrl)}" alt="" loading="lazy" /></a>`;
    if (card.includes('class="card-img"')) {
      // Update existing image src
      return card.replace(/(<a class="card-img"[^>]*><img src=")[^"]*(")/, `$1${escAttr(imageUrl)}$2`);
    }
    return card.replace('<article class="post-card">', `<article class="post-card">${imgTag}`);
  });

  if (html !== before) {
    fs.writeFileSync(indexPath, html);
    return true;
  }
  return false;
}

async function main() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?select=slug,title,image,published&published=eq.true&order=date.desc`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!res.ok) {
    console.error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const posts = await res.json();

  const blogDir = path.join(process.cwd(), "public", "blog");
  const indexPath = path.join(blogDir, "index.html");
  const indexExists = fs.existsSync(indexPath);
  if (indexExists && !fs.readFileSync(indexPath, "utf8").includes(".card-img")) {
    console.warn("⚠️  public/blog/index.html is missing the .card-img CSS — card images will render unstyled.");
  }

  let changed = 0, unchanged = 0, skipped = 0;

  for (const post of posts) {
    const img = (post.image || "").trim();
    if (!img) { skipped++; continue; }

    const postPath = path.join(blogDir, post.slug, "index.html");
    if (!fs.existsSync(postPath)) {
      console.warn(`  ⚠️  ${post.slug}: static page not found — skipped`);
      skipped++;
      continue;
    }

    let touched = patchPostPage(postPath, img, post.title || post.slug);
    if (indexExists) touched = patchBlogIndexCard(indexPath, post.slug, img) || touched;

    if (touched) {
      console.log(`  ✅ ${post.slug}: header image synced`);
      changed++;
    } else {
      unchanged++;
    }
  }

  console.log(`\n[sync-header-images] Done. posts=${posts.length} changed=${changed} unchanged=${unchanged} no-image/skipped=${skipped}`);
  if (changed > 0) console.log("CHANGED");
}

main().catch((err) => {
  console.error("❌ SYNC FAILED:", err.message);
  process.exit(1);
});
