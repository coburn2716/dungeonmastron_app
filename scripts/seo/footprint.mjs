#!/usr/bin/env node
/**
 * Dungeon Mastron SEO Footprint report.
 * Ported from directree/app/scripts/seo/footprint.mjs (Jul 10 2026).
 * SEPARATION: DM only. Never touches other products' DBs or dirs.
 *
 * Two jobs the blog/GSC reports DON'T cover:
 *
 *  (A) FULL ranked-keyword snapshot of dungeonmastron.com from DataForSEO -- every
 *      keyword Google ranks us for + our exact position + which URL ranks. This is
 *      the external/objective view (DataForSEO's index), complementing GSC.
 *
 *  (B) NON-BLOG page tracking. Surfaces how our PRODUCT / LANDING / HOMEPAGE pages
 *      rank (/, /play/*, /builder/*, /ai/*, /faq/*, etc.) so the money pages get
 *      monitored, not just the blog.
 *
 * Diffs against the previous snapshot (FOOTPRINT.json) to show movement
 * week-over-week: keywords that climbed, dropped, newly appeared, or fell out
 * of the top 100.
 *
 * READ-ONLY to our systems. Only external writes are DataForSEO API reads (paid).
 *
 * Usage:
 *   node scripts/seo/footprint.mjs            # full run (~$0.02-0.04)
 *   node scripts/seo/footprint.mjs --dry      # print, don't write/diff-save
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { balance, rankedKeywords, totalCost } from "./lib/dataforseo.mjs";
import { writeDash } from "./lib/publish.mjs";
import { OUR_DOMAIN } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/seo/ -> scripts/ -> app/ -> dungeon_mastron/ -> workspace root
const DM_ROOT = path.resolve(__dirname, "..", "..", "..");
const BLOG_DIR = path.join(DM_ROOT, "content", "blog");
const OUT_MD = path.join(BLOG_DIR, "FOOTPRINT.md");
const OUT_JSON = path.join(BLOG_DIR, "FOOTPRINT.json"); // gitignored snapshot for diffing

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const argVal = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const LIMIT = parseInt(argVal("--limit", "1000"), 10);

// Classify which URL bucket a ranking page falls into (DM pages).
function pageBucket(url) {
  if (!url) return "other";
  const p = url.replace(/^https?:\/\/[^/]+/, "") || "/";
  if (p === "/" || p === "") return "homepage";
  if (p.startsWith("/blog/")) return "blog";
  if (p.startsWith("/play/")) return "play (money)";
  if (p.startsWith("/builder/")) return "builder (money)";
  if (p.startsWith("/ai/")) return "ai (money)";
  if (p.startsWith("/console/")) return "console (money)";
  if (p.startsWith("/faq/")) return "faq";
  if (p.startsWith("/library/")) return "library";
  if (p.startsWith("/guides/")) return "guides";
  if (/^\/(tools|about|community|license)/.test(p)) return "other landing";
  return "other";
}

function loadPrev() {
  try {
    if (existsSync(OUT_JSON)) return JSON.parse(readFileSync(OUT_JSON, "utf8"));
  } catch {}
  return null;
}

async function main() {
  console.log(`SEO footprint -- ${OUR_DOMAIN}`);
  const startBal = await balance();
  console.log(`Balance before: $${startBal}`);

  const rows = await rankedKeywords(OUR_DOMAIN, LIMIT);
  // keep only rows where we actually rank (position present), top 100
  const ranked = rows
    .filter((r) => r.position != null && r.position <= 100)
    .map((r) => ({
      keyword: r.keyword,
      position: r.position,
      volume: r.volume || 0,
      cpc: r.cpc || 0,
      difficulty: r.difficulty ?? null,
      url: r.url || null,
      bucket: pageBucket(r.url),
    }))
    .sort((a, b) => a.position - b.position);

  console.log(`Ranked keywords (top 100): ${ranked.length}`);

  // ---- diff vs previous snapshot ----
  const prev = loadPrev();
  const prevMap = new Map((prev?.ranked || []).map((r) => [r.keyword, r]));
  const curMap = new Map(ranked.map((r) => [r.keyword, r]));

  const climbed = [];
  const dropped = [];
  const newKw = [];
  const lostKw = [];
  for (const r of ranked) {
    const p = prevMap.get(r.keyword);
    if (!p) {
      newKw.push(r);
    } else if (r.position < p.position - 0.4) {
      climbed.push({ ...r, from: p.position, delta: +(p.position - r.position).toFixed(1) });
    } else if (r.position > p.position + 0.4) {
      dropped.push({ ...r, from: p.position, delta: +(r.position - p.position).toFixed(1) });
    }
  }
  if (prev) {
    for (const p of prev.ranked || []) {
      if (!curMap.has(p.keyword)) lostKw.push(p);
    }
  }
  climbed.sort((a, b) => b.delta - a.delta);
  dropped.sort((a, b) => b.delta - a.delta);
  newKw.sort((a, b) => a.position - b.position);

  // ---- bucket summary ----
  const buckets = {};
  for (const r of ranked) {
    const b = (buckets[r.bucket] ||= { count: 0, top3: 0, top10: 0, top20: 0, sumVol: 0 });
    b.count++;
    if (r.position <= 3) b.top3++;
    if (r.position <= 10) b.top10++;
    if (r.position <= 20) b.top20++;
    b.sumVol += r.volume;
  }

  const cost = totalCost();
  const endBal = await balance();
  console.log(`Done. API cost: $${cost.toFixed(4)} | balance now: $${endBal}`);

  if (DRY) {
    console.log("\nBuckets:");
    for (const [k, v] of Object.entries(buckets))
      console.log(`  ${k.padEnd(20)} ${v.count} kw (top3:${v.top3} top10:${v.top10})`);
    console.log(`\nTop 15 ranked:`);
    for (const r of ranked.slice(0, 15))
      console.log(`  pos ${String(r.position).padStart(4)}  "${r.keyword}"  [${r.bucket}]`);
    if (prev) console.log(`\nMovement: ${climbed.length} up, ${dropped.length} down, ${newKw.length} new, ${lostKw.length} lost`);
    console.log(`\n--dry: not writing.`);
    return;
  }

  writeReport({ ranked, buckets, climbed, dropped, newKw, lostKw, cost, startBal, endBal, hadPrev: !!prev });
  console.log(`Wrote ${OUT_MD}`);

  // dashboard payload
  writeDash("footprint", {
    summary: {
      totalRanked: ranked.length,
      top3: ranked.filter((r) => r.position <= 3).length,
      top10: ranked.filter((r) => r.position <= 10).length,
      top20: ranked.filter((r) => r.position <= 20).length,
      climbed: climbed.length,
      dropped: dropped.length,
      newCount: newKw.length,
      lostCount: lostKw.length,
    },
    payload: {
      buckets,
      ranked: ranked.slice(0, 150),
      climbed: climbed.slice(0, 25),
      dropped: dropped.slice(0, 25),
      newKw: newKw.slice(0, 25),
      lostKw: lostKw.slice(0, 25),
    },
    costUsd: cost,
    balanceUsd: endBal,
  });
}

function writeReport(d) {
  if (!existsSync(BLOG_DIR)) mkdirSync(BLOG_DIR, { recursive: true });
  const now = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

  const top10 = d.ranked.filter((r) => r.position <= 10).length;
  const top3 = d.ranked.filter((r) => r.position <= 3).length;
  const moneyPages = d.ranked.filter((r) =>
    r.bucket.includes("money") || r.bucket === "homepage"
  );

  let md = `# Dungeon Mastron SEO Footprint (DataForSEO)\n\n`;
  md += `> Auto-generated by \`scripts/seo/footprint.mjs\` on ${now}.\n`;
  md += `> Source: DataForSEO ranked_keywords for ${OUR_DOMAIN} (US/en) -- the external/objective view of where Google ranks us.\n`;
  md += `> API cost this run: $${d.cost.toFixed(4)} - balance: $${d.startBal} -> $${d.endBal}.\n\n`;

  md += `## At a glance\n`;
  md += `- **${d.ranked.length}** keywords ranking in the top 100\n`;
  md += `- **${top10}** in the top 10, **${top3}** in the top 3\n`;
  md += `- **${moneyPages.length}** of those rankings are on money pages (homepage / play / builder / ai / console), not blog\n\n`;

  md += `## Footprint by page type\n\n`;
  md += `| page type | keywords | top 3 | top 10 | top 20 |\n|---|---:|---:|---:|---:|\n`;
  for (const [k, v] of Object.entries(d.buckets).sort((a, b) => b[1].count - a[1].count)) {
    md += `| ${k} | ${v.count} | ${v.top3} | ${v.top10} | ${v.top20} |\n`;
  }
  md += `\n`;

  // movement (only if we had a prior snapshot)
  if (d.hadPrev) {
    md += `## Movement since last run\n\n`;
    if (d.climbed.length) {
      md += `**Climbed (${d.climbed.length}):**\n\n`;
      md += `| keyword | now | was | +pos | vol | page |\n|---|---:|---:|---:|---:|---|\n`;
      md += d.climbed.slice(0, 20).map((r) => `| ${r.keyword} | ${r.position} | ${r.from} | +${r.delta} | ${r.volume} | ${r.bucket} |`).join("\n") + "\n\n";
    }
    if (d.dropped.length) {
      md += `**Dropped (${d.dropped.length}):**\n\n`;
      md += `| keyword | now | was | -pos | vol | page |\n|---|---:|---:|---:|---:|---|\n`;
      md += d.dropped.slice(0, 20).map((r) => `| ${r.keyword} | ${r.position} | ${r.from} | -${r.delta} | ${r.volume} | ${r.bucket} |`).join("\n") + "\n\n";
    }
    if (d.newKw.length) {
      md += `**Newly ranking (${d.newKw.length}):**\n\n`;
      md += `| keyword | pos | vol | page |\n|---|---:|---:|---|\n`;
      md += d.newKw.slice(0, 20).map((r) => `| ${r.keyword} | ${r.position} | ${r.volume} | ${r.bucket} |`).join("\n") + "\n\n";
    }
    if (d.lostKw.length) {
      md += `**Fell out of top 100 (${d.lostKw.length}):**\n\n`;
      md += `| keyword | was | vol |\n|---|---:|---:|\n`;
      md += d.lostKw.slice(0, 20).map((r) => `| ${r.keyword} | ${r.position} | ${r.volume} |`).join("\n") + "\n\n";
    }
    if (!d.climbed.length && !d.dropped.length && !d.newKw.length && !d.lostKw.length)
      md += `_No significant movement since last snapshot._\n\n`;
  } else {
    md += `## Movement\n_First snapshot -- movement tracking starts next run._\n\n`;
  }

  // money-page rankings called out separately
  md += `## Money-page rankings (homepage / play / builder / ai / console)\n\n`;
  md += `These are the commercial pages -- worth watching closely. Anything in pos 4-20 here is a refresh candidate.\n\n`;
  md += `| pos | keyword | vol | page type | url |\n|---:|---|---:|---|---|\n`;
  md += moneyPages.slice(0, 60).map((r) => `| ${r.position} | ${r.keyword} | ${r.volume} | ${r.bucket} | ${r.url || ""} |`).join("\n") + "\n\n";

  md += `## All ranked keywords (top 100 positions)\n\n`;
  md += `| pos | keyword | vol | diff | cpc | page type |\n|---:|---|---:|---:|---:|---|\n`;
  md += d.ranked.slice(0, 300).map((r) => `| ${r.position} | ${r.keyword} | ${r.volume} | ${r.difficulty ?? "?"} | ${r.cpc.toFixed(2)} | ${r.bucket} |`).join("\n") + "\n";

  writeFileSync(OUT_MD, md);
  // snapshot for next diff (only keyword+position+volume+url needed)
  writeFileSync(OUT_JSON, JSON.stringify({ takenAt: now, ranked: d.ranked }, null, 0));
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
