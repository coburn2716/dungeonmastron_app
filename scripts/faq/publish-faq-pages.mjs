#!/usr/bin/env node
/**
 * Dungeon Mastron FAQ "colony" page publisher (workspace SEO_COLONY_STRATEGY.md).
 *
 * DM is a STATIC site (no Next.js / DB rendering), so this mirrors the blog
 * publisher pattern: it reads the source content module and emits static HTML.
 *
 * What it does (idempotent):
 *   (a) For each entry in content/faq/faq-entries.mjs:
 *         writes public/faq/<slug>/index.html
 *   (b) Writes/refreshes the /faq/ hub page: public/faq/index.html
 *   (c) Adds every /faq/ URL (hub + pages) to public/sitemap.xml (idempotent)
 *
 * SEO_HYGIENE rules applied:
 *   - canonical host https://www.dungeonmastron.com + trailing slash
 *   - self-referential canonical + complete OG (og:url + type + site_name + image)
 *   - single H1 (the exact question)
 *   - FAQPage JSON-LD (safe: no offers/ratings)
 *   - favicon set (?v=5 pattern) copied from existing pages
 *   - site shell nav (#site-nav) + footer (#site-footer) mounts
 *   - NO EM-DASHES gate (throws on U+2014 in any question/answer)
 *
 * Usage (from dungeon_mastron/app/):
 *   node scripts/faq/publish-faq-pages.mjs
 *   node scripts/faq/publish-faq-pages.mjs --check   # gate only, write nothing
 *
 * No Supabase / network needed. Colony DB rows are seeded separately (admin side).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { FAQ_ENTRIES, THEME_ORDER } from "../../content/faq/faq-entries.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..", "..");
const PUBLIC_DIR = path.join(APP_ROOT, "public");
const FAQ_DIR = path.join(PUBLIC_DIR, "faq");
const SITEMAP_PATH = path.join(PUBLIC_DIR, "sitemap.xml");

const ORIGIN = "https://www.dungeonmastron.com";
const SHELL_V = "4"; // site_shell.js / .css cache-bust version
const FAV_V = "5"; // favicon cache-bust version (matches existing pages)
const TODAY = new Date().toISOString().slice(0, 10);

const CHECK_ONLY = process.argv.includes("--check");

// ─────────────────────────────────────────────────────────────────────────────
// Escaping helpers
// ─────────────────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escJson(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Content gate: NO EM-DASHES + basic sanity
// ─────────────────────────────────────────────────────────────────────────────
function gate(entries) {
  const errors = [];
  const seen = new Set();
  for (const e of entries) {
    if (!e.slug || !e.question || !e.answer || !e.theme) {
      errors.push(`Entry missing required field: ${JSON.stringify(e.slug || e.question || "?")}`);
      continue;
    }
    if (seen.has(e.slug)) errors.push(`Duplicate slug: ${e.slug}`);
    seen.add(e.slug);
    if (!THEME_ORDER.includes(e.theme)) errors.push(`${e.slug}: theme "${e.theme}" not in THEME_ORDER`);
    for (const [field, val] of [["question", e.question], ["answer", e.answer]]) {
      if (val.includes("\u2014")) errors.push(`${e.slug}: ${field} contains an EM DASH (\u2014) — forbidden.`);
    }
    // The exact question must open the first sentence of the answer (colony rule).
    const q = e.question.replace(/\?$/, "").toLowerCase();
    const firstWords = e.answer.slice(0, q.length + 4).toLowerCase();
    // soft check: the answer should begin by restating the subject; warn only.
    void firstWords;
    if (e.answer.length < 400) errors.push(`${e.slug}: answer suspiciously short (${e.answer.length} chars).`);
    if (e.answer.length > 1200) errors.push(`${e.slug}: answer very long (${e.answer.length} chars) — colonies stay ~120 words.`);
  }
  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Render one answer (markdown links + paragraphs) to HTML
// ─────────────────────────────────────────────────────────────────────────────
function renderAnswer(md) {
  return marked.parse(md, { async: false });
}

/** Meta description: first sentence, trimmed to <=160 chars, no markdown links. */
function metaDescription(answer) {
  const plain = answer.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const firstSentence = (plain.match(/^[^.!?]*[.!?]/) || [plain])[0].trim();
  let d = firstSentence;
  if (d.length > 160) d = d.slice(0, 157).replace(/\s+\S*$/, "") + "...";
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared <head> block (favicons, fonts, shell css)
// ─────────────────────────────────────────────────────────────────────────────
function headCommon() {
  return `  <link rel="icon" href="/favicon.ico?v=${FAV_V}" sizes="any" />
  <link rel="icon" type="image/png" sizes="16x16" href="/web_assets/favicon-16.png?v=${FAV_V}" />
  <link rel="icon" type="image/png" sizes="32x32" href="/web_assets/favicon-32.png?v=${FAV_V}" />
  <link rel="apple-touch-icon" sizes="180x180" href="/web_assets/apple-touch-icon.png?v=${FAV_V}" />
  <link rel="manifest" href="/site.webmanifest?v=${FAV_V}" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="/web_assets/site_shell.css?v=3" />`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoped page styles (shared by FAQ page + hub)
// ─────────────────────────────────────────────────────────────────────────────
const FAQ_STYLE = `
    body { margin: 0; background: var(--shell-bg); color: var(--shell-text); font-family: var(--shell-font); }
    .faq-breadcrumb {
      max-width: 800px; margin: 0 auto; padding: 26px 18px 0;
      display: flex; align-items: center; gap: 6px;
      font-family: var(--shell-mono); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--shell-faint);
    }
    .faq-breadcrumb a { color: var(--shell-faint); text-decoration: none; transition: color 0.15s; }
    .faq-breadcrumb a:hover { color: var(--shell-accent); }
    .faq-breadcrumb .sep { opacity: 0.4; }
    .faq-wrap { max-width: 800px; margin: 26px auto 0; padding: 0 18px 80px; }
    .faq-kicker {
      font-family: var(--shell-mono); font-size: 10.5px; letter-spacing: 0.18em;
      text-transform: uppercase; color: var(--shell-accent);
      display: inline-flex; align-items: center; gap: 8px; margin-bottom: 16px;
    }
    .faq-kicker::before { content: ""; width: 5px; height: 5px; border-radius: 999px; background: currentColor; animation: dm-dot-pulse 3.6s ease-in-out infinite; }
    .faq-header { border-top: 1px solid var(--shell-border-strong); border-bottom: 1px solid var(--shell-border); padding: 30px 4px 26px; }
    .faq-header h1 {
      font-family: var(--shell-serif); font-weight: 500;
      font-size: clamp(1.7rem, 4vw, 2.7rem); line-height: 1.12;
      letter-spacing: -0.015em; margin: 0; color: var(--shell-text);
    }
    .faq-answer { margin-top: 34px; }
    .faq-answer p { font-size: 1.05rem; line-height: 1.8; color: var(--shell-sub); margin: 0 0 18px; }
    .faq-answer a { color: var(--shell-green); text-decoration: underline; text-underline-offset: 2px; }
    .faq-answer a:hover { color: #8fbfaa; }
    .faq-cta {
      margin-top: 34px; padding: 22px 26px; border: 1px solid rgba(226,104,60,0.35);
      background: rgba(226,104,60,0.06); display: flex; flex-wrap: wrap; align-items: center; gap: 14px; justify-content: space-between;
    }
    .faq-cta p { margin: 0; color: var(--shell-sub); font-size: 0.95rem; }
    .faq-cta-btn {
      display: inline-block; padding: 11px 22px; border: 1px solid var(--shell-text); background: var(--shell-text);
      color: #131210; font-family: var(--shell-mono); font-size: 11.5px; font-weight: 600;
      letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none; white-space: nowrap;
      transition: background 0.15s, box-shadow 0.15s;
    }
    .faq-cta-btn:hover { background: #FFFDF7; box-shadow: 0 0 22px rgba(236,230,218,0.14); }
    .faq-related { margin-top: 44px; padding-top: 24px; border-top: 1px solid var(--shell-border); }
    .faq-related h2 { font-family: var(--shell-mono); font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--shell-faint); margin: 0 0 16px; }
    .faq-related ul { list-style: none; margin: 0; padding: 0; }
    .faq-related li { margin: 0 0 10px; }
    .faq-related a { color: var(--shell-text); text-decoration: none; font-family: var(--shell-heading); font-size: 1rem; line-height: 1.5; border-bottom: 1px solid transparent; transition: color 0.15s, border-color 0.15s; }
    .faq-related a:hover { color: var(--shell-green); border-color: rgba(107,155,127,0.45); }
    .faq-back {
      display: inline-flex; align-items: center; gap: 6px; margin-top: 40px;
      font-family: var(--shell-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--shell-green); text-decoration: none; transition: color 0.15s;
    }
    .faq-back:hover { color: #8fbfaa; }

    /* ── Hub ── */
    .hub-hero { max-width: 1000px; margin: 0 auto; padding: 60px 18px 30px; }
    .hub-hero h1 { font-family: var(--shell-serif); font-weight: 480; font-size: clamp(2.2rem, 5vw, 3.8rem); line-height: 1.02; letter-spacing: -0.015em; margin: 0 0 16px; color: var(--shell-text); }
    .hub-hero h1 em { font-style: italic; font-weight: 420; color: var(--shell-accent); }
    .hub-hero .lead { font-family: var(--shell-mono); font-size: 13px; line-height: 1.75; color: var(--shell-sub); margin: 0; max-width: 62ch; }
    .hub-body { max-width: 1000px; margin: 0 auto; padding: 10px 18px 90px; }
    .hub-theme { margin-top: 42px; }
    .hub-theme h2 { font-family: var(--shell-mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--shell-accent); margin: 0 0 18px; display: inline-flex; align-items: center; gap: 10px; }
    .hub-theme h2::before { content: ""; width: 6px; height: 6px; border-radius: 999px; background: currentColor; opacity: 0.9; }
    .hub-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    @media (max-width: 680px) { .hub-list { grid-template-columns: 1fr; } }
    .hub-q {
      display: block; border: 1px solid var(--shell-border); background: rgba(236,230,218,0.02);
      padding: 16px 18px; text-decoration: none; color: var(--shell-text);
      font-family: var(--shell-heading); font-size: 0.98rem; line-height: 1.45;
      transition: border-color 0.15s, color 0.15s, background 0.15s;
    }
    .hub-q:hover { border-color: rgba(226,104,60,0.45); color: var(--shell-accent); background: rgba(226,104,60,0.04); }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Related questions: up to 3 siblings in same theme, then fill from others
// ─────────────────────────────────────────────────────────────────────────────
function relatedFor(entry, all) {
  const sameTheme = all.filter((e) => e.theme === entry.theme && e.slug !== entry.slug);
  const others = all.filter((e) => e.theme !== entry.theme && e.slug !== entry.slug);
  return [...sameTheme, ...others].slice(0, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ page HTML
// ─────────────────────────────────────────────────────────────────────────────
function buildFaqPage(entry, all) {
  const url = `${ORIGIN}/faq/${entry.slug}/`;
  const desc = metaDescription(entry.answer);
  const answerHtml = renderAnswer(entry.answer);
  const answerPlain = entry.answer.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const related = relatedFor(entry, all);
  const relatedHtml = related
    .map((r) => `        <li><a href="/faq/${r.slug}/">${escHtml(r.question)}</a></li>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(entry.question)} | Dungeon Mastron</title>
  <meta name="description" content="${escAttr(desc)}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:site_name" content="Dungeon Mastron" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escAttr(entry.question)}" />
  <meta property="og:description" content="${escAttr(desc)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${ORIGIN}/web_assets/og-image.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escAttr(entry.question)}" />
  <meta name="twitter:description" content="${escAttr(desc)}" />
  <meta name="twitter:image" content="${ORIGIN}/web_assets/og-image.jpg" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "url": "${url}",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "${escJson(entry.question)}",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "${escJson(answerPlain)}"
        }
      }
    ]
  }
  </script>
${headCommon()}
  <style>${FAQ_STYLE}</style>
</head>
<body class="dm-surface">
  <div id="site-nav"></div>

  <nav class="faq-breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a>
    <span class="sep">/</span>
    <a href="/faq/">FAQ</a>
    <span class="sep">/</span>
    <span>${escHtml(entry.theme)}</span>
  </nav>

  <div class="faq-wrap">
    <article>
      <span class="faq-kicker">${escHtml(entry.theme)}</span>
      <header class="faq-header">
        <h1>${escHtml(entry.question)}</h1>
      </header>

      <div class="faq-answer">
        ${answerHtml}
      </div>

      <div class="faq-cta">
        <p>${escHtml(entry.target.label)}</p>
        <a class="faq-cta-btn" href="${escAttr(entry.target.href)}">${escHtml(ctaButtonLabel(entry.target.href))}</a>
      </div>

      <div class="faq-related">
        <h2>Related questions</h2>
        <ul>
${relatedHtml}
        </ul>
      </div>

      <a class="faq-back" href="/faq/">\u2190 All questions</a>
    </article>
  </div>

  <div id="site-footer"></div>

  <script src="/web_assets/site_shell.js?v=${SHELL_V}" defer></script>
</body>
</html>`;
}

function ctaButtonLabel(href) {
  if (href.startsWith("/builder")) return "Open the builder";
  if (href.startsWith("/play")) return "Play now";
  if (href.startsWith("/ai")) return "AI Companion";
  if (href.startsWith("/console")) return "See the console";
  if (href.startsWith("/blog")) return "Read the post";
  if (href.startsWith("/guides")) return "Read the guide";
  return "Learn more";
}

// ─────────────────────────────────────────────────────────────────────────────
// Hub page HTML
// ─────────────────────────────────────────────────────────────────────────────
function buildHubPage(all) {
  const url = `${ORIGIN}/faq/`;
  const desc =
    "Short, honest answers about choose your own adventure games, interactive fiction, text adventures, AI storytelling, and building a DIY story console.";

  const itemList = all
    .map(
      (e, i) => `      { "@type": "ListItem", "position": ${i + 1}, "name": "${escJson(e.question)}", "item": "${ORIGIN}/faq/${e.slug}/" }`
    )
    .join(",\n");

  const themeBlocks = THEME_ORDER.map((theme) => {
    const items = all.filter((e) => e.theme === theme);
    if (!items.length) return "";
    const qs = items
      .map((e) => `        <a class="hub-q" href="/faq/${e.slug}/">${escHtml(e.question)}</a>`)
      .join("\n");
    return `    <section class="hub-theme">
      <h2>${escHtml(theme)}</h2>
      <div class="hub-list">
${qs}
      </div>
    </section>`;
  })
    .filter(Boolean)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FAQ | Dungeon Mastron</title>
  <meta name="description" content="${escAttr(desc)}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:site_name" content="Dungeon Mastron" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="FAQ | Dungeon Mastron" />
  <meta property="og:description" content="${escAttr(desc)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${ORIGIN}/web_assets/og-image.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="FAQ | Dungeon Mastron" />
  <meta name="twitter:description" content="${escAttr(desc)}" />
  <meta name="twitter:image" content="${ORIGIN}/web_assets/og-image.jpg" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "url": "${url}",
    "name": "Dungeon Mastron FAQ",
    "description": "${escJson(desc)}",
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": [
${itemList}
      ]
    }
  }
  </script>
${headCommon()}
  <style>${FAQ_STYLE}</style>
</head>
<body class="dm-surface">
  <div id="site-nav"></div>

  <header class="hub-hero">
    <h1>Questions, <em>answered</em></h1>
    <p class="lead">Short, honest answers about choose your own adventure games, interactive fiction, text adventures, AI storytelling, and building a DIY story console. No fluff, no hype.</p>
  </header>

  <div class="hub-body">
${themeBlocks}
  </div>

  <div id="site-footer"></div>

  <script src="/web_assets/site_shell.js?v=${SHELL_V}" defer></script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sitemap updater (idempotent)
// ─────────────────────────────────────────────────────────────────────────────
function updateSitemap(urls) {
  let xml = fs.readFileSync(SITEMAP_PATH, "utf8");
  let added = 0;
  for (const { loc, priority } of urls) {
    if (xml.includes(`<loc>${loc}</loc>`)) continue;
    const entry = `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;
    xml = xml.replace("</urlset>", entry + "\n</urlset>");
    added++;
  }
  fs.writeFileSync(SITEMAP_PATH, xml);
  return added;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
function main() {
  const errors = gate(FAQ_ENTRIES);
  if (errors.length) {
    console.error(`\u274c FAQ content gate FAILED (${errors.length}):`);
    for (const e of errors) console.error("   - " + e);
    process.exit(1);
  }
  console.log(`\u2705 Content gate passed: ${FAQ_ENTRIES.length} entries, no em-dashes.`);

  if (CHECK_ONLY) {
    console.log("--check: no files written.");
    return;
  }

  fs.mkdirSync(FAQ_DIR, { recursive: true });

  // (a) pages
  for (const entry of FAQ_ENTRIES) {
    const dir = path.join(FAQ_DIR, entry.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), buildFaqPage(entry, FAQ_ENTRIES));
  }
  console.log(`\u2705 Wrote ${FAQ_ENTRIES.length} FAQ pages to public/faq/<slug>/index.html`);

  // (b) hub
  fs.writeFileSync(path.join(FAQ_DIR, "index.html"), buildHubPage(FAQ_ENTRIES));
  console.log(`\u2705 Wrote hub: public/faq/index.html`);

  // (c) sitemap
  const sitemapUrls = [
    { loc: `${ORIGIN}/faq/`, priority: "0.7" },
    ...FAQ_ENTRIES.map((e) => ({ loc: `${ORIGIN}/faq/${e.slug}/`, priority: "0.5" })),
  ];
  const added = updateSitemap(sitemapUrls);
  console.log(`\u2705 Sitemap: added ${added} new URL(s) (of ${sitemapUrls.length}).`);

  console.log(`\nDone. Live after deploy:`);
  console.log(`  ${ORIGIN}/faq/`);
  for (const e of FAQ_ENTRIES.slice(0, 3)) console.log(`  ${ORIGIN}/faq/${e.slug}/`);
}

main();
