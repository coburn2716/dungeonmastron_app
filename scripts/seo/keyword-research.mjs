#!/usr/bin/env node
/**
 * Dungeon Mastron SEO machine — keyword research orchestrator.
 * Mirrors directree/app/scripts/seo/keyword-research.mjs, retargeted for DM.
 *
 * Pipeline:
 *   1. Pull keywords each competitor ranks for (Labs ranked_keywords)
 *   2. Expand our seed keywords into long-tail ideas (Labs keyword_suggestions)
 *   3. Merge + dedupe, gate by relevance (drop off-topic / non-english)
 *   4. Enrich missing difficulty in bulk
 *   5. Score opportunity, classify intent
 *   6. Detect "gap" keywords (competitors rank, we likely don't cover)
 *   7. Write dungeon_mastron/content/blog/SEO_KEYWORDS.md (the keyword bank)
 *
 * READ-ONLY to our systems. Only external writes are DataForSEO API reads (paid).
 *
 * Usage:
 *   node scripts/seo/keyword-research.mjs                              # full run
 *   node scripts/seo/keyword-research.mjs --max-competitors 1 --dry   # cheap test
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  balance,
  rankedKeywords,
  keywordSuggestions,
  bulkDifficulty,
  totalCost,
} from "./lib/dataforseo.mjs";
import { isRelevant, classifyIntent, opportunityScore, isSweetSpot } from "./lib/score.mjs";
import { writeDash } from "./lib/publish.mjs";
import { COMPETITORS, SEED_KEYWORDS, OUR_DOMAIN } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/seo/ -> scripts/ -> app/ -> dungeon_mastron/ -> workspace
const DM_ROOT = path.resolve(__dirname, "..", "..", "..");
const BLOG_DIR = path.join(DM_ROOT, "content", "blog");
const OUT_BANK = path.join(BLOG_DIR, "SEO_KEYWORDS.md");

// ---- args ----
const args = process.argv.slice(2);
const argVal = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const MAX_COMPETITORS = parseInt(argVal("--max-competitors", String(COMPETITORS.length)), 10);
const IDEAS_LIMIT = parseInt(argVal("--ideas-limit", "700"), 10);
const RANKED_LIMIT = parseInt(argVal("--ranked-limit", "1000"), 10);
const DRY = args.includes("--dry");

function log(...a) {
  console.log(...a);
}

/** Load slugs of already-published posts so we can flag covered topics. */
function loadCoveredTokens() {
  const tokens = new Set();
  try {
    for (const f of readdirSync(BLOG_DIR)) {
      if (!f.endsWith(".md") || f === "SEO_KEYWORDS.md" || f.startsWith("BLOG_")) continue;
      const slug = f.replace(/\.md$/, "");
      slug.split("-").forEach((w) => w.length > 3 && tokens.add(w.toLowerCase()));
    }
  } catch {}
  return tokens;
}

/** Crude "do we already cover this?" check. */
function likelyCovered(keyword, covered) {
  const words = keyword.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  if (!words.length) return false;
  const hits = words.filter((w) => covered.has(w)).length;
  return hits / words.length >= 0.6;
}

async function main() {
  log(`SEO keyword research — market ${OUR_DOMAIN}`);
  log(`BLOG_DIR resolved to: ${BLOG_DIR}`);
  const startBal = await balance();
  log(`Balance before: $${startBal}`);

  /** keyword -> aggregated record */
  const map = new Map();
  const add = (rec, source) => {
    if (!rec.keyword) return;
    const k = rec.keyword.toLowerCase().trim();
    if (!isRelevant(k)) return;
    const ex = map.get(k);
    if (!ex) {
      map.set(k, {
        keyword: k,
        volume: rec.volume || 0,
        cpc: rec.cpc || 0,
        competition: rec.competition || null,
        difficulty: rec.difficulty ?? null,
        sources: new Set([source]),
        competitorsRanking: new Set(rec.competitor ? [rec.competitor] : []),
        bestCompetitorPos: rec.position ?? null,
      });
    } else {
      ex.volume = Math.max(ex.volume, rec.volume || 0);
      if (ex.difficulty == null && rec.difficulty != null) ex.difficulty = rec.difficulty;
      ex.sources.add(source);
      if (rec.competitor) ex.competitorsRanking.add(rec.competitor);
      if (rec.position != null && (ex.bestCompetitorPos == null || rec.position < ex.bestCompetitorPos))
        ex.bestCompetitorPos = rec.position;
    }
  };

  // 1. competitor ranked keywords
  const comps = COMPETITORS.slice(0, MAX_COMPETITORS);
  for (const domain of comps) {
    try {
      const rows = await rankedKeywords(domain, RANKED_LIMIT);
      let kept = 0;
      for (const r of rows) {
        if (isRelevant(r.keyword)) kept++;
        add({ ...r, competitor: domain }, "competitor");
      }
      log(`  ${domain}: ${rows.length} ranked, ${kept} relevant`);
    } catch (e) {
      log(`  ${domain}: ERROR ${e.message}`);
    }
  }

  // 2. seed expansion via keyword_suggestions (per-seed, on-topic long-tails)
  const perSeed = Math.max(50, Math.floor(IDEAS_LIMIT / SEED_KEYWORDS.length));
  let ideaKept = 0,
    ideaTotal = 0;
  for (const seed of SEED_KEYWORDS) {
    try {
      const sugg = await keywordSuggestions(seed, perSeed);
      ideaTotal += sugg.length;
      for (const r of sugg) {
        if (isRelevant(r.keyword)) ideaKept++;
        add(r, "suggestions");
      }
    } catch (e) {
      log(`  suggestions("${seed}"): ERROR ${e.message}`);
    }
  }
  log(`  seed suggestions: ${ideaTotal} returned, ${ideaKept} relevant`);

  log(`Relevant unique keywords: ${map.size}`);

  // 4. enrich missing difficulty in bulk
  const needDiff = [...map.values()].filter((r) => r.difficulty == null).map((r) => r.keyword);
  if (needDiff.length) {
    log(`Enriching difficulty for ${needDiff.length} keywords...`);
    try {
      const diffs = await bulkDifficulty(needDiff);
      for (const [k, d] of Object.entries(diffs)) {
        const rec = map.get(k.toLowerCase());
        if (rec) rec.difficulty = d;
      }
    } catch (e) {
      log(`  difficulty enrich ERROR: ${e.message}`);
    }
  }

  // 5. score + 6. gap detection
  const covered = loadCoveredTokens();
  const records = [...map.values()].map((r) => {
    const { intent } = classifyIntent(r.keyword);
    return {
      ...r,
      sources: [...r.sources],
      competitorsRanking: [...r.competitorsRanking],
      intent,
      score: opportunityScore(r),
      sweetSpot: isSweetSpot(r),
      covered: likelyCovered(r.keyword, covered),
      gap: r.competitorsRanking.size > 0 && r.volume >= 50 && !likelyCovered(r.keyword, covered),
    };
  });

  records.sort((a, b) => b.score - a.score);

  const cost = totalCost();
  const endBal = await balance();
  log(`\nDone. API cost this run: $${cost.toFixed(4)} | balance now: $${endBal}`);

  if (DRY) {
    log(`\n--dry: top 15 (not writing files)`);
    for (const r of records.slice(0, 15)) {
      log(
        `  [${String(r.score).padStart(3)}] ${r.keyword.padEnd(45)} vol=${String(r.volume).padStart(6)} diff=${
          r.difficulty ?? "?"
        } ${r.intent}${r.gap ? " GAP" : ""}${r.sweetSpot ? " \u2605" : ""}`
      );
    }
    return;
  }

  writeBank(records, { cost, startBal, endBal, comps });
  log(`Wrote ${OUT_BANK}`);

  const sweet = records.filter((r) => r.sweetSpot && !r.covered);
  const gaps = records.filter((r) => r.gap);
  const slim = (r) => ({
    keyword: r.keyword,
    volume: r.volume,
    difficulty: r.difficulty ?? null,
    cpc: +(r.cpc || 0).toFixed(2),
    intent: r.intent,
    score: r.score,
    comps: r.competitorsRanking.length,
  });
  writeDash("keywords", {
    summary: {
      totalKeywords: records.length,
      sweetSpots: sweet.length,
      gaps: gaps.length,
    },
    payload: {
      sweet: sweet.slice(0, 40).map(slim),
      gaps: gaps.slice(0, 40).map(slim),
      top: records.slice(0, 40).map(slim),
    },
    costUsd: cost,
    balanceUsd: endBal,
  });
  log(`Next: review SEO_KEYWORDS.md, then pick topics for BLOG_TOPICS.md`);
}

function writeBank(records, meta) {
  if (!existsSync(BLOG_DIR)) mkdirSync(BLOG_DIR, { recursive: true });
  const now = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
  const top = records.slice(0, 400);
  const gaps = records.filter((r) => r.gap).slice(0, 120);
  const sweet = records.filter((r) => r.sweetSpot && !r.covered).slice(0, 80);

  const row = (r) =>
    `| ${r.score} | ${r.keyword} | ${r.volume} | ${r.difficulty ?? "?"} | ${r.cpc.toFixed(2)} | ${r.intent} | ${
      r.competitorsRanking.length
    } | ${r.covered ? "yes" : ""} |`;

  let md = `# Dungeon Mastron SEO Keyword Bank\n\n`;
  md += `> Auto-generated by \`scripts/seo/keyword-research.mjs\` on ${now}.\n`;
  md += `> Market: US (en). Sorted by opportunity score (volume + low difficulty + intent).\n`;
  md += `> API cost this run: $${meta.cost.toFixed(4)} · balance: $${meta.startBal} -> $${meta.endBal}.\n`;
  md += `> Competitors mined: ${meta.comps.join(", ")}.\n\n`;
  md += `**Columns:** score (0-100) · keyword · volume/mo · difficulty (0-100, lower=easier) · cpc · intent · #competitors ranking · already covered?\n\n`;

  md += `## \u2605 Sweet-spot keywords (good volume, low difficulty, not yet covered)\n\n`;
  md += `Priority targets — winnable AND worth winning for the CYOA/IF niche.\n\n`;
  md += `| score | keyword | vol | diff | cpc | intent | comps | covered |\n|---:|---|---:|---:|---:|---|---:|---|\n`;
  md += sweet.map(row).join("\n") + "\n\n";

  md += `## \ud83c\udfaf Competitor gaps (they rank, we likely don't cover)\n\n`;
  md += `Topics competitors get traffic from that we're missing. Feed these into BLOG_TOPICS.md.\n\n`;
  md += `| score | keyword | vol | diff | cpc | intent | comps | covered |\n|---:|---|---:|---:|---:|---|---:|---|\n`;
  md += gaps.map(row).join("\n") + "\n\n";

  md += `## All keywords (top 400 by opportunity)\n\n`;
  md += `| score | keyword | vol | diff | cpc | intent | comps | covered |\n|---:|---|---:|---:|---:|---|---:|---|\n`;
  md += top.map(row).join("\n") + "\n";

  writeFileSync(OUT_BANK, md);
  writeFileSync(OUT_BANK.replace(/\.md$/, ".json"), JSON.stringify(records.slice(0, 600), null, 0));
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
