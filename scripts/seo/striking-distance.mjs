#!/usr/bin/env node
/**
 * GSC "Striking Distance" report for Dungeon Mastron.
 * Ported from directree/app/scripts/seo/striking-distance.mjs (Jul 10 2026).
 * SEPARATION: DM only. Uses DM's GSC property (sc-domain:dungeonmastron.com).
 *
 * Finds keywords where dungeonmastron.com pages ALREADY rank on the edge of page 1
 * (roughly positions 5-20) and get impressions but few clicks. These are the
 * cheapest wins in SEO: the page already ranks, it just needs a nudge
 * (better title/meta, more on-page coverage of that exact query, internal links)
 * to climb into the top 3-5 where the clicks are.
 *
 * Pulls QUERY x PAGE rows from Google Search Console (last N days), filters to
 * the striking-distance band, scores by opportunity, and writes a report.
 *
 * GSC access: requires .google-indexing-key.json in dungeon_mastron/app/.
 * If the key is missing or GSC returns an error, the script logs a warning and
 * exits cleanly (no hard failure) -- the cron should skip and continue.
 *
 * Usage:
 *   node scripts/seo/striking-distance.mjs              # last 90 days, write report
 *   node scripts/seo/striking-distance.mjs --days 28    # shorter window
 *   node scripts/seo/striking-distance.mjs --dry        # print, don't write
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { GoogleAuth } from "google-auth-library";
import { writeDash } from "./lib/publish.mjs";
import { SITE } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..", "..");
// scripts/seo/ -> scripts/ -> app/ -> dungeon_mastron/ -> workspace root
const DM_ROOT = path.resolve(__dirname, "..", "..", "..");
const KEY_PATH = path.join(APP_ROOT, ".google-indexing-key.json");
// Use DM's GSC site URL from config (sc-domain:dungeonmastron.com)
const SITE_URL = process.env.DM_GSC_SITE_URL || SITE.gscSiteUrl || "sc-domain:dungeonmastron.com";
const OUT = path.join(DM_ROOT, "content", "blog", "STRIKING_DISTANCE.md");

// ---- args ----
const args = process.argv.slice(2);
const argVal = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const DAYS = parseInt(argVal("--days", "90"), 10);
const DRY = args.includes("--dry");

// Striking-distance band + thresholds
const POS_MIN = 4.5; // already past the top 4
const POS_MAX = 20.5; // but no worse than ~page 2
const MIN_IMPRESSIONS = 30; // must have real demand

// Cooldown: a post updated within this many days is too recent to refresh again
const COOLDOWN_DAYS = 21;
const BLOG_DIR_PATH = path.join(DM_ROOT, "content", "blog");

/** Read a post's frontmatter `date` (YYYY-MM-DD) by slug; null if unknown. */
function postDate(slug) {
  try {
    // DM blog posts live in dungeon_mastron/content/blog/<slug>.md
    const f = path.join(BLOG_DIR_PATH, `${slug}.md`);
    if (!existsSync(f)) return null;
    const head = readFileSync(f, "utf8").slice(0, 600);
    const m = head.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function getToken() {
  const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  const auth = new GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

async function fetchGSC(token, body) {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  return res.json();
}

/**
 * Opportunity score for a striking-distance keyword.
 * Rewards: high impressions (demand), position just below the click zone
 * (closer to page 1 top = easier nudge), and low current CTR (clicks being left
 * on the table). 0-100.
 */
function score({ impressions, position, ctr }) {
  const demand = Math.min(1, Math.log10(impressions + 1) / Math.log10(5000));
  const proximity = Math.max(0, (POS_MAX - position) / (POS_MAX - POS_MIN));
  const headroom = ctr < 0.02 ? 1 : ctr < 0.05 ? 0.7 : 0.4;
  return Math.round((demand * 0.5 + proximity * 0.35 + headroom * 0.15) * 100);
}

function slugFromUrl(url) {
  // DM blog: /blog/<slug>/ or /faq/<slug>/
  const blogM = url.match(/\/blog\/([^/?#]+)/);
  if (blogM) return blogM[1];
  const faqM = url.match(/\/faq\/([^/?#]+)/);
  if (faqM) return `faq/${faqM[1]}`;
  return url.replace(/^https?:\/\/[^/]+/, "");
}

async function main() {
  if (!existsSync(KEY_PATH)) {
    console.warn(`[striking-distance] GSC key not found at ${KEY_PATH} -- skipping (no-op).`);
    console.warn(`  To enable: ensure .google-indexing-key.json is present in dungeon_mastron/app/`);
    return;
  }

  let token;
  try {
    token = await getToken();
  } catch (e) {
    console.warn(`[striking-distance] GSC auth failed: ${e.message} -- skipping (no-op).`);
    return;
  }

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - DAYS * 86400000).toISOString().slice(0, 10);
  console.log(`GSC striking distance -- ${startDate} to ${endDate} (${DAYS}d) [${SITE_URL}]`);

  // query x page, blog + faq pages
  const data = await fetchGSC(token, {
    startDate,
    endDate,
    dimensions: ["query", "page"],
    rowLimit: 25000,
  });

  if (data.error) {
    console.warn(`[striking-distance] GSC error: ${JSON.stringify(data.error)} -- skipping (no-op).`);
    return;
  }
  const rows = data.rows || [];
  console.log(`Got ${rows.length} query x page rows.`);

  const candidates = [];
  for (const r of rows) {
    const [query, page] = r.keys;
    const position = r.position;
    const impressions = r.impressions;
    const clicks = r.clicks;
    const ctr = r.ctr;
    if (position < POS_MIN || position > POS_MAX) continue;
    if (impressions < MIN_IMPRESSIONS) continue;
    const slug = slugFromUrl(page);
    const pd = postDate(slug);
    const daysSinceUpdate = pd ? Math.floor((Date.now() - new Date(pd).getTime()) / 86400000) : null;
    const onCooldown = daysSinceUpdate != null && daysSinceUpdate < COOLDOWN_DAYS;
    candidates.push({
      query,
      slug,
      page,
      position: +position.toFixed(1),
      impressions,
      clicks,
      ctr: +(ctr * 100).toFixed(1), // %
      score: score({ impressions, position, ctr }),
      postDate: pd,
      daysSinceUpdate,
      onCooldown,
      ctrTweakOk: ctr * 100 < 1.5 && position <= 12,
    });
  }
  candidates.sort((a, b) => b.score - a.score);
  const ready = candidates.filter((c) => !c.onCooldown);
  const cooling = candidates.filter((c) => c.onCooldown);
  console.log(
    `Striking-distance candidates: ${candidates.length} (${ready.length} ready, ${cooling.length} on cooldown <${COOLDOWN_DAYS}d)`
  );

  if (DRY) {
    for (const c of candidates.slice(0, 25)) {
      console.log(
        `  [${String(c.score).padStart(3)}] pos ${String(c.position).padStart(4)}  imp ${String(
          c.impressions
        ).padStart(5)}  ctr ${String(c.ctr).padStart(4)}%  "${c.query}"  -> ${c.slug}`
      );
    }
    console.log(`\n--dry: not writing (${candidates.length} candidates).`);
    return;
  }

  writeReport(candidates, { startDate, endDate, ready, cooling });
  console.log(`Wrote ${OUT}`);

  // group READY candidates by page for the dashboard
  const groupByPage = (list) => {
    const byPage = new Map();
    for (const c of list) {
      if (!byPage.has(c.slug)) byPage.set(c.slug, []);
      byPage.get(c.slug).push(c);
    }
    return [...byPage.entries()]
      .map(([slug, l]) => ({
        slug,
        best: Math.max(...l.map((x) => x.score)),
        daysSinceUpdate: l[0].daysSinceUpdate,
        top: l.slice(0, 4),
      }))
      .sort((a, b) => b.best - a.best);
  };
  const readyPages = groupByPage(ready).slice(0, 30);
  const coolingPages = groupByPage(cooling).slice(0, 30);
  const ctrTweaks = candidates.filter((c) => c.ctrTweakOk).slice(0, 15);

  writeDash("striking_distance", {
    summary: {
      candidates: candidates.length,
      ready: ready.length,
      onCooldown: cooling.length,
      ctrTweaks: ctrTweaks.length,
      window: `${startDate} to ${endDate}`,
    },
    payload: {
      pages: readyPages,
      coolingPages,
      ctrTweaks,
      flat: ready.slice(0, 60),
    },
  });
}

function writeReport(candidates, meta) {
  const now = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

  const groupByPage = (list) =>
    [...list.reduce((m, c) => {
      if (!m.has(c.slug)) m.set(c.slug, []);
      m.get(c.slug).push(c);
      return m;
    }, new Map()).entries()]
      .map(([slug, l]) => ({ slug, list: l, best: Math.max(...l.map((x) => x.score)), daysSinceUpdate: l[0].daysSinceUpdate }))
      .sort((a, b) => b.best - a.best);

  const readyPages = groupByPage(meta.ready);
  const coolingPages = groupByPage(meta.cooling);

  const row = (c) =>
    `| ${c.score} | ${c.query} | ${c.position} | ${c.impressions} | ${c.clicks} | ${c.ctr}% |`;

  let md = `# Dungeon Mastron Striking-Distance Report (GSC)\n\n`;
  md += `> Auto-generated by \`scripts/seo/striking-distance.mjs\` on ${now}.\n`;
  md += `> Window: ${meta.startDate} to ${meta.endDate}. Source: Google Search Console (your own data, free).\n`;
  md += `> "Striking distance" = pages already ranking ~pos ${POS_MIN}-${POS_MAX} with real impressions but leaking clicks.\n`;
  md += `> ${meta.ready.length} ready to refresh - ${meta.cooling.length} on cooldown (updated < ${COOLDOWN_DAYS}d ago -- leave them to settle).\n\n`;

  md += `## How to act on this\n`;
  md += `For each keyword below, the page already ranks but sits just outside the top few results. To push it up:\n`;
  md += `1. Make sure the exact query appears in the page title + an H2 + naturally in the body.\n`;
  md += `2. Improve the title/meta for CTR (the click is being missed even where it ranks).\n`;
  md += `3. Add internal links from related posts pointing at this page with that keyword as anchor text.\n`;
  md += `4. Expand the section that covers this query -- depth tends to move pos 8-12 into pos 3-6.\n\n`;

  md += `## Ready to refresh (off cooldown)\n\n`;
  if (!readyPages.length) {
    md += `_Nothing ready right now -- every striking-distance page was updated within the last ${COOLDOWN_DAYS} days. Let them settle so Google can re-rank before touching again._\n\n`;
  } else {
    for (const p of readyPages.slice(0, 40)) {
      const age = p.daysSinceUpdate == null ? "date unknown" : `updated ${p.daysSinceUpdate}d ago`;
      md += `### \`${p.slug}\`  (best score ${p.best}, ${age})\n`;
      md += `https://www.dungeonmastron.com/blog/${p.slug}\n\n`;
      md += `| score | query | position | impressions | clicks | ctr |\n|---:|---|---:|---:|---:|---:|\n`;
      md += p.list.sort((a, b) => b.score - a.score).slice(0, 8).map(row).join("\n");
      md += `\n\n`;
    }
  }

  if (coolingPages.length) {
    md += `## On cooldown (recently updated -- don't refresh yet)\n\n`;
    md += `These rank in the striking-distance band but were updated < ${COOLDOWN_DAYS} days ago. They'll become "ready" automatically once they age past ${COOLDOWN_DAYS} days. NOTE: a pure title/meta CTR tweak is still safe even here.\n\n`;
    for (const p of coolingPages.slice(0, 40)) {
      const age = p.daysSinceUpdate == null ? "date unknown" : `updated ${p.daysSinceUpdate}d ago`;
      md += `### \`${p.slug}\`  (best score ${p.best}, ${age} -- ${COOLDOWN_DAYS - (p.daysSinceUpdate ?? 0)}d left)\n`;
      md += `| score | query | position | impressions | clicks | ctr |\n|---:|---|---:|---:|---:|---:|\n`;
      md += p.list.sort((a, b) => b.score - a.score).slice(0, 6).map(row).join("\n");
      md += `\n\n`;
    }
  }

  md += `## All striking-distance keywords (flat, top 200)\n\n`;
  md += `| score | query | position | impressions | clicks | ctr | cooldown | page |\n|---:|---|---:|---:|---:|---:|---|---|\n`;
  md += candidates
    .slice(0, 200)
    .map((c) => `| ${c.score} | ${c.query} | ${c.position} | ${c.impressions} | ${c.clicks} | ${c.ctr}% | ${c.onCooldown ? `${COOLDOWN_DAYS - (c.daysSinceUpdate ?? 0)}d left` : "ready"} | ${c.slug} |`)
    .join("\n");
  md += `\n`;

  writeFileSync(OUT, md);
  writeFileSync(OUT.replace(/\.md$/, ".json"), JSON.stringify(candidates.slice(0, 400), null, 0));
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
