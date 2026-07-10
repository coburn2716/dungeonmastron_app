#!/usr/bin/env node
/**
 * Feed the SEO keyword bank into BLOG_TOPICS.md (Dungeon Mastron).
 * Ported from directree/app/scripts/seo/feed-topics.mjs (Jul 10 2026).
 * SEPARATION: DM only. Never touches other products' dirs.
 *
 * Reads dungeon_mastron/content/blog/SEO_KEYWORDS.json (produced by keyword-research.mjs),
 * selects the best uncovered opportunities, and writes them into a clearly-marked
 * AUTO-MANAGED block inside BLOG_TOPICS.md so the daily blog crons pick keyword-validated topics.
 *
 * The auto block is delimited by markers so re-running replaces only that block and
 * never touches the hand-maintained sections.
 *
 * Usage:
 *   node scripts/seo/feed-topics.mjs            # write
 *   node scripts/seo/feed-topics.mjs --dry      # preview
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/seo/ -> scripts/ -> app/ -> dungeon_mastron/ -> workspace root
const DM_ROOT = path.resolve(__dirname, "..", "..", "..");
const BANK_JSON = path.join(DM_ROOT, "content", "blog", "SEO_KEYWORDS.json");
const BLOG_TOPICS = path.join(DM_ROOT, "content", "blog", "BLOG_TOPICS.md");

const START = "<!-- SEO-AUTO:START (managed by scripts/seo/feed-topics.mjs \u2014 do not edit by hand) -->";
const END = "<!-- SEO-AUTO:END -->";

const DRY = process.argv.includes("--dry");

function pick(records, predicate, n) {
  return records.filter(predicate).slice(0, n);
}

function main() {
  if (!existsSync(BANK_JSON)) {
    console.error(`No keyword bank at ${BANK_JSON}. Run keyword-research.mjs first.`);
    process.exit(1);
  }
  const records = JSON.parse(readFileSync(BANK_JSON, "utf8"));
  // already sorted by score desc. Only uncovered, real opportunities.
  const fresh = records.filter((r) => !r.covered && r.volume >= 100);

  // No em-dashes in output (DM standing rule). Use en-dashes if needed.
  const fmt = (r) => `${r.keyword} -- vol ${r.volume}/mo, difficulty ${r.difficulty ?? "?"}, score ${r.score}`;

  // Buckets routed to the matching blog cron / day (DM cadence: Tue/Thu/Sat)
  const buckets = {
    "Tutorial / how-to keywords (Tuesday)": pick(fresh, (r) => r.intent === "how-to", 20),
    "Comparison / SEO keywords (Thursday)": pick(fresh, (r) => r.intent === "comparison", 15),
    "Craft / maker keywords (Saturday)": pick(fresh, (r) => r.intent === "problem" || r.intent === "tool", 15),
    "Informational / definition keywords (any)": pick(
      fresh,
      (r) => r.intent === "informational",
      25
    ),
    "High-opportunity gaps (competitors rank, we don't)": pick(
      fresh,
      (r) => r.gap && r.score >= 70,
      30
    ),
  };

  const now = new Date().toISOString().slice(0, 10);
  let block = `${START}\n`;
  block += `## SEO-Validated Keyword Targets (auto-generated ${now})\n\n`;
  block += `> Sourced from DataForSEO competitor-gap + keyword research. Sorted by opportunity (volume + low difficulty).\n`;
  block += `> Full bank: \`dungeon_mastron/content/blog/SEO_KEYWORDS.md\`. Regenerate: \`cd dungeon_mastron/app && node --env-file=.env.local scripts/seo/keyword-research.mjs && node --env-file=.env.local scripts/seo/feed-topics.mjs\`.\n`;
  block += `> When you write a post for one of these, it will naturally land in the "Published Posts" list and drop out of future runs.\n\n`;
  for (const [title, list] of Object.entries(buckets)) {
    if (!list.length) continue;
    block += `### ${title}\n`;
    for (const r of list) block += `- ${fmt(r)}\n`;
    block += `\n`;
  }
  block += `${END}\n`;

  if (DRY) {
    console.log(block);
    console.log(`(--dry: not writing. ${fresh.length} fresh opportunities available.)`);
    return;
  }

  let topics = existsSync(BLOG_TOPICS) ? readFileSync(BLOG_TOPICS, "utf8") : "";
  if (topics.includes(START) && topics.includes(END)) {
    topics = topics.replace(new RegExp(`${escapeRe(START)}[\\s\\S]*?${escapeRe(END)}`), block.trim());
  } else {
    // insert near the top, right after the publishing calendar section
    const anchor = "## Recent Post Log";
    const idx = topics.indexOf(anchor);
    if (idx >= 0) topics = topics.slice(0, idx) + block + "\n" + topics.slice(idx);
    else topics += "\n\n" + block;
  }
  writeFileSync(BLOG_TOPICS, topics);
  console.log(`Updated ${BLOG_TOPICS} with SEO-validated targets.`);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main();
