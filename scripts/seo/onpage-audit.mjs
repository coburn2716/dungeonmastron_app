#!/usr/bin/env node
/**
 * Dungeon Mastron OnPage Audit (technical SEO spot-check).
 * Ported from directree/app/scripts/seo/onpage-audit.mjs (Jul 10 2026).
 * SEPARATION: DM only. Never touches other products' DBs or dirs.
 *
 * Audits a curated list of our most important pages (homepage, play, builder,
 * ai, console, key blog/faq posts) for technical SEO issues:
 *   - missing/too-short/too-long title or meta description
 *   - missing/multiple H1
 *   - thin content (low word count)
 *   - slow load
 *   - broken (non-200) pages
 *
 * Uses DataForSEO OnPage "instant_pages" (synchronous, ~$0.0006/page) so a
 * 35-page audit costs ~$0.02. The page list is built dynamically from our
 * sitemap so new pages get audited automatically, capped to keep cost trivial.
 *
 * READ-ONLY to our systems. Only external writes are DataForSEO API reads (paid).
 * Run monthly -- technical issues don't change daily.
 *
 * Usage:
 *   node scripts/seo/onpage-audit.mjs              # audit (auto page list from sitemap)
 *   node scripts/seo/onpage-audit.mjs --max 40
 *   node scripts/seo/onpage-audit.mjs --dry
 */
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { balance, onpageInstant, totalCost } from "./lib/dataforseo.mjs";
import { writeDash } from "./lib/publish.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/seo/ -> scripts/ -> app/ -> dungeon_mastron/ -> workspace root
const DM_ROOT = path.resolve(__dirname, "..", "..", "..");
const BLOG_DIR = path.join(DM_ROOT, "content", "blog");
const OUT_MD = path.join(BLOG_DIR, "ONPAGE_AUDIT.md");

const SITE = "https://www.dungeonmastron.com";
const SITEMAP = `${SITE}/sitemap.xml`;

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const argVal = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const MAX = parseInt(argVal("--max", "35"), 10);

// SEO best-practice thresholds
const TITLE_MIN = 30, TITLE_MAX = 65;
const DESC_MIN = 70, DESC_MAX = 160;
const THIN_WORDS = 300;
const SLOW_MS = 3000;

// Always-audit core pages (DM's money pages, prioritized), then fill with sitemap URLs.
const PRIORITY_PATHS = [
  "/",
  "/play/",
  "/builder/",
  "/ai/",
  "/console/",
  "/library/",
  "/blog/",
  "/faq/",
  "/guides/",
];

async function getSitemapUrls() {
  try {
    const res = await fetch(SITEMAP);
    const xml = await res.text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    return urls;
  } catch (e) {
    console.log(`  (sitemap fetch failed: ${e.message})`);
    return [];
  }
}

function buildPageList(sitemapUrls) {
  const seen = new Set();
  const list = [];
  const push = (u) => {
    const norm = u.replace(/\/$/, "") || u;
    if (seen.has(norm)) return;
    seen.add(norm);
    list.push(u);
  };
  for (const p of PRIORITY_PATHS) push(`${SITE}${p}`);
  // money pages: faq + blog (highest content value for DM)
  const faqPages = sitemapUrls.filter((u) => /\/faq\//.test(u));
  const blogPages = sitemapUrls.filter((u) => /\/blog\//.test(u));
  const others = sitemapUrls.filter(
    (u) => !/\/faq\//.test(u) && !/\/blog\//.test(u)
  );
  // Sample evenly from content types
  faqPages.slice(0, 8).forEach(push);
  blogPages.slice(0, 6).forEach(push);
  others.forEach(push);
  return list.slice(0, MAX);
}

function findIssues(p) {
  const issues = [];
  if (p.statusCode && p.statusCode >= 400) issues.push(`HTTP ${p.statusCode}`);
  if (!p.title) issues.push("missing title");
  else if (p.titleLength < TITLE_MIN) issues.push(`title too short (${p.titleLength})`);
  else if (p.titleLength > TITLE_MAX) issues.push(`title too long (${p.titleLength})`);
  if (!p.description) issues.push("missing meta description");
  else if (p.descriptionLength < DESC_MIN) issues.push(`meta desc too short (${p.descriptionLength})`);
  else if (p.descriptionLength > DESC_MAX) issues.push(`meta desc too long (${p.descriptionLength})`);
  const h1n = (p.h1 || []).length;
  if (h1n === 0) issues.push("no H1");
  else if (h1n > 1) issues.push(`multiple H1 (${h1n})`);
  if (p.wordCount != null && p.wordCount < THIN_WORDS) issues.push(`thin content (${p.wordCount} words)`);
  if (p.loadTimeMs != null && p.loadTimeMs > SLOW_MS) issues.push(`slow load (${p.loadTimeMs}ms)`);
  const MEANINGFUL = new Set([
    "is_broken", "is_4xx_code", "is_5xx_code",
    "canonical_chain", "has_meta_refresh_redirect", "is_orphan_page",
    "duplicate_title_tag", "duplicate_description", "duplicate_content",
    "no_h1_tag", "https_to_http_links",
    "high_loading_time", "large_page_size",
    "no_favicon", "no_doctype", "no_encoding_meta_tag", "deprecated_html_tags",
    "broken_links", "broken_resources", "no_image_alt",
  ]);
  for (const [k, v] of Object.entries(p.checks || {})) {
    if (v === true && MEANINGFUL.has(k)) issues.push(k.replace(/_/g, " "));
  }
  return [...new Set(issues)];
}

async function main() {
  console.log(`OnPage audit -- ${SITE}`);
  if (DRY) {
    console.log("  --dry: building page list from sitemap but skipping API calls");
    const sitemapUrls = await getSitemapUrls();
    const pages = buildPageList(sitemapUrls);
    console.log(`\nWould audit ${pages.length} pages (of ${sitemapUrls.length} in sitemap):`);
    for (const p of pages) console.log(`  ${p}`);
    console.log(`\n--dry: not running DataForSEO calls, not writing files.`);
    return;
  }

  const startBal = await balance();
  console.log(`Balance before: $${startBal}`);

  const sitemapUrls = await getSitemapUrls();
  const pages = buildPageList(sitemapUrls);
  console.log(`Auditing ${pages.length} pages (of ${sitemapUrls.length} in sitemap)...`);

  const results = [];
  for (const url of pages) {
    try {
      const p = await onpageInstant(url);
      const issues = findIssues(p);
      results.push({ url, ...p, issues });
      console.log(`  ${issues.length ? "! " : "ok"}${url}  ${issues.length ? issues.join("; ") : "ok"}`);
    } catch (e) {
      results.push({ url, issues: [`audit error: ${e.message}`] });
      console.log(`  ERR ${url}  ERROR ${e.message}`);
    }
  }

  const cost = totalCost();
  const endBal = await balance();
  console.log(`Done. API cost: $${cost.toFixed(4)} | balance now: $${endBal}`);
  const withIssues = results.filter((r) => r.issues.length);
  console.log(`Pages with issues: ${withIssues.length}/${results.length}`);

  writeReport({ results, withIssues, cost, startBal, endBal });
  console.log(`Wrote ${OUT_MD}`);

  writeDash("onpage", {
    summary: {
      audited: results.length,
      withIssues: withIssues.length,
      clean: results.length - withIssues.length,
    },
    payload: {
      issues: withIssues.map((r) => ({
        url: r.url.replace(SITE, "") || "/",
        issues: r.issues,
        titleLength: r.titleLength ?? null,
        descriptionLength: r.descriptionLength ?? null,
        wordCount: r.wordCount ?? null,
      })),
    },
    costUsd: cost,
    balanceUsd: endBal,
  });
}

function writeReport(d) {
  if (!existsSync(BLOG_DIR)) mkdirSync(BLOG_DIR, { recursive: true });
  const now = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

  let md = `# Dungeon Mastron OnPage Audit (technical SEO)\n\n`;
  md += `> Auto-generated by \`scripts/seo/onpage-audit.mjs\` on ${now}.\n`;
  md += `> Spot-check of ${d.results.length} key pages via DataForSEO OnPage instant_pages.\n`;
  md += `> API cost this run: $${d.cost.toFixed(4)} - balance: $${d.startBal} -> $${d.endBal}.\n\n`;

  md += `## Summary\n`;
  md += `- Pages audited: **${d.results.length}**\n`;
  md += `- Pages with issues: **${d.withIssues.length}**\n`;
  md += `- Clean pages: **${d.results.length - d.withIssues.length}**\n\n`;

  if (d.withIssues.length) {
    md += `## Pages needing attention\n\n`;
    md += `| url | issues | title len | desc len | words |\n|---|---|---:|---:|---:|\n`;
    for (const r of d.withIssues) {
      const u = r.url.replace(SITE, "");
      md += `| ${u} | ${r.issues.join("; ")} | ${r.titleLength ?? "?"} | ${r.descriptionLength ?? "?"} | ${r.wordCount ?? "?"} |\n`;
    }
    md += `\n`;
  } else {
    md += `## No issues found\nAll audited pages pass the technical checks.\n\n`;
  }

  md += `## All audited pages\n\n`;
  md += `| url | status | title len | desc len | H1 | words | load ms |\n|---|---:|---:|---:|---:|---:|---:|\n`;
  for (const r of d.results) {
    const u = r.url.replace(SITE, "");
    md += `| ${u} | ${r.statusCode ?? "?"} | ${r.titleLength ?? "?"} | ${r.descriptionLength ?? "?"} | ${(r.h1 || []).length} | ${r.wordCount ?? "?"} | ${r.loadTimeMs ?? "?"} |\n`;
  }
  md += `\n`;

  writeFileSync(OUT_MD, md);
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
