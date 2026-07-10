#!/usr/bin/env node
/**
 * Dungeon Mastron LLM Mentions Tracker.
 * Ported from directree/app/scripts/seo/llm-mentions.mjs (Jul 10 2026).
 * SEPARATION: DM only. Never touches other products' DBs or dirs.
 *
 * Measures AI brand visibility: does ChatGPT recommend Dungeon Mastron when
 * story creators / game makers ask about CYOA tools or interactive fiction makers?
 * Sends 10 realistic buyer questions to the DataForSEO LLM Responses API
 * (ChatGPT via their proxy, web-search enabled) and records which tools get recommended.
 *
 * This is the "GEO / AI SEO" counterpart to traditional SERP tracking. As LLMs
 * replace zero-click searches, brand mentions in AI answers become the new
 * top-of-page ranking. DM's wedge: big IF tools (Twine, itch.io) don't optimize
 * for GEO; we can own these terms early.
 *
 * NOTE: No em-dashes anywhere in output (DM standing rule). Use spaced en-dashes.
 *
 * Outputs:
 *   dungeon_mastron/content/blog/dash/llm_mentions.json  -- compact dash JSON
 *   dungeon_mastron/content/blog/LLM_MENTIONS.md         -- human-readable report
 *
 * Usage:
 *   node scripts/seo/llm-mentions.mjs           # full run (queries AI for real)
 *   node scripts/seo/llm-mentions.mjs --dry     # skip API calls, print mock summary
 */
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { balance, llmResponses, totalCost } from "./lib/dataforseo.mjs";
import { writeDash } from "./lib/publish.mjs";
import { OUR_DOMAIN } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/seo/ -> scripts/ -> app/ -> dungeon_mastron/ -> workspace root
const DM_ROOT = path.resolve(__dirname, "..", "..", "..");
const BLOG_DIR = path.join(DM_ROOT, "content", "blog");
const OUT_MD = path.join(BLOG_DIR, "LLM_MENTIONS.md");

const args = process.argv.slice(2);
const DRY = args.includes("--dry");

// ---------------------------------------------------------------------------
// Brand name we're tracking (for detection in AI responses)
// ---------------------------------------------------------------------------
const OUR_BRAND = "Dungeon Mastron";
const OUR_BRAND_LOWER = OUR_BRAND.toLowerCase();

// ---------------------------------------------------------------------------
// Competitor display names for detection (from config.mjs COMPETITORS)
// ---------------------------------------------------------------------------
const COMPETITOR_NAMES = {
  "twinery.org": "Twine",
  "itch.io": "itch.io",
  "choiceofgames.com": "Choice of Games",
  "inklestudios.com": "Inkle / Ink",
  "renpy.org": "Ren'Py",
  "textadventures.co.uk": "Quest / Squiffy",
  "philome.la": "Philome.la",
  "chooseyourstory.com": "ChooseYourStory",
};

// ---------------------------------------------------------------------------
// 10 realistic buyer prompts across intent types for DM's ICP
// (story creators, game makers, AI adventurers, Pi/maker tinkerers)
// ---------------------------------------------------------------------------
const PROMPTS = [
  "What are the best free tools to make a choose your own adventure game?",
  "What is the best Twine alternative for making interactive fiction in 2026?",
  "How can I make a text adventure game without coding?",
  "What are the best AI-powered tools for creating interactive stories?",
  "What are the best ways to make a CYOA game for free?",
  "What tools do authors use to write branching narrative games?",
  "How do I turn a story into a playable choose your own adventure game?",
  "What are the best open source interactive fiction tools?",
  "Can I use ChatGPT to create a complete playable text adventure game?",
  "What are good alternatives to Twine for beginners making a CYOA game?",
];

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

/** Find position of first mention of a brand name in text. -1 if not found. */
function findPosition(text, brandName) {
  const lower = text.toLowerCase();
  const name = brandName.toLowerCase();
  const idx = lower.indexOf(name);
  if (idx === -1) return -1;
  const paras = lower.split(/\n\n+/);
  let offset = 0;
  for (let i = 0; i < paras.length; i++) {
    if (offset + paras[i].length >= idx) return i + 1;
    offset += paras[i].length + 2;
  }
  return paras.length;
}

/** Extract a short excerpt around a brand mention (+-200 chars). */
function excerpt(text, brandName, maxChars = 200) {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(brandName.toLowerCase());
  if (idx === -1) return "";
  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + brandName.length + 120);
  let snip = text.slice(start, end).replace(/\n+/g, " ").trim();
  if (start > 0) snip = "..." + snip;
  if (end < text.length) snip = snip + "...";
  // Strip em-dashes from excerpts (DM standing rule)
  return snip.replace(/\u2014/g, " - ");
}

/** Count total mentions of a name in the text. */
function countMentions(text, brandName) {
  const re = new RegExp(brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return (text.match(re) || []).length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Dungeon Mastron LLM Mentions Tracker -- ${PROMPTS.length} prompts`);
  if (DRY) console.log("  --dry: skipping API calls, printing mock summary");
  const startBal = DRY ? null : await balance();
  console.log(`Balance before: ${startBal !== null ? "$" + startBal : "(dry)"}`);

  const results = [];

  if (DRY) {
    for (const prompt of PROMPTS) {
      results.push({
        prompt,
        ourMention: false,
        ourPosition: -1,
        ourMentionCount: 0,
        competitorsMentioned: [],
        responseExcerpt: "(dry run -- no API call)",
        responseLength: 0,
        apiCost: 0,
      });
    }
    console.log("\n--dry: skipping real API calls. Would query", PROMPTS.length, "prompts.");
  } else {
    for (let i = 0; i < PROMPTS.length; i++) {
      const prompt = PROMPTS[i];
      console.log(`  [${i + 1}/${PROMPTS.length}] "${prompt.slice(0, 60)}..."`);
      try {
        const { text, cost } = await llmResponses(prompt, { model: "gpt-4o-mini", webSearch: true });
        const ourMentionCount = countMentions(text, OUR_BRAND);
        const ourPos = findPosition(text, OUR_BRAND);
        const ourMention = ourMentionCount > 0;
        const ourExcerpt = excerpt(text, OUR_BRAND);

        // Check which competitors appear
        const competitorsMentioned = [];
        for (const [domain, name] of Object.entries(COMPETITOR_NAMES)) {
          const mentionCount = countMentions(text, name);
          if (mentionCount > 0) {
            competitorsMentioned.push({ name, domain, mentionCount, position: findPosition(text, name) });
          }
        }
        competitorsMentioned.sort((a, b) => a.position - b.position);

        results.push({
          prompt,
          ourMention,
          ourPosition: ourPos,
          ourMentionCount,
          competitorsMentioned,
          responseExcerpt: ourMention ? ourExcerpt : (text.slice(0, 200).replace(/\u2014/g, " - ") + "..."),
          responseLength: text.length,
          apiCost: cost,
        });

        console.log(`    -> us: ${ourMention ? `YES pos ${ourPos}` : "not mentioned"} | competitors: ${competitorsMentioned.map((c) => c.name).join(", ") || "none"}`);
      } catch (e) {
        console.log(`    ERROR: ${e.message}`);
        results.push({
          prompt,
          ourMention: false,
          ourPosition: -1,
          ourMentionCount: 0,
          competitorsMentioned: [],
          responseExcerpt: `ERROR: ${e.message}`,
          responseLength: 0,
          apiCost: 0,
          error: e.message,
        });
      }
    }
  }

  const cost = totalCost();
  const endBal = DRY ? null : await balance();
  console.log(`Done. API cost: $${cost.toFixed(4)} | balance now: ${endBal !== null ? "$" + endBal : "(dry)"}`);

  // ---------------------------------------------------------------------------
  // Compute summary
  // ---------------------------------------------------------------------------
  const mentioningUs = results.filter((r) => r.ourMention);
  const mentionRate = ((mentioningUs.length / results.length) * 100).toFixed(1);
  const positions = mentioningUs.map((r) => r.ourPosition).filter((p) => p > 0);
  const avgPosition = positions.length ? (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1) : null;

  const compLeaderboard = {};
  for (const r of results) {
    for (const c of r.competitorsMentioned) {
      if (!compLeaderboard[c.name]) compLeaderboard[c.name] = { name: c.name, domain: c.domain, promptCount: 0, totalMentions: 0 };
      compLeaderboard[c.name].promptCount++;
      compLeaderboard[c.name].totalMentions += c.mentionCount;
    }
  }
  const competitorLeaderboard = Object.values(compLeaderboard).sort((a, b) => b.promptCount - a.promptCount);

  const summary = {
    totalPrompts: results.length,
    promptsMentioningUs: mentioningUs.length,
    mentionRatePct: parseFloat(mentionRate),
    avgPositionWhenMentioned: avgPosition ? parseFloat(avgPosition) : null,
    topCompetitor: competitorLeaderboard[0]?.name ?? null,
    topCompetitorPromptCount: competitorLeaderboard[0]?.promptCount ?? 0,
  };

  if (DRY) {
    console.log("\nSummary (dry):");
    console.log(`  prompts: ${summary.totalPrompts} | us: ${summary.promptsMentioningUs} | rate: ${mentionRate}%`);
    console.log("--dry: not writing files.");
    return;
  }

  // ---------------------------------------------------------------------------
  // Write outputs
  // ---------------------------------------------------------------------------
  if (!existsSync(BLOG_DIR)) mkdirSync(BLOG_DIR, { recursive: true });

  writeMarkdown({ results, summary, competitorLeaderboard, cost, startBal, endBal });
  console.log(`Wrote ${OUT_MD}`);

  writeDash("llm_mentions", {
    summary,
    payload: {
      prompts: results.map((r) => ({
        prompt: r.prompt,
        ourMention: r.ourMention,
        ourPosition: r.ourPosition,
        ourMentionCount: r.ourMentionCount,
        competitorsMentioned: r.competitorsMentioned,
        responseExcerpt: r.responseExcerpt,
        ...(r.error ? { error: r.error } : {}),
      })),
      competitorLeaderboard,
    },
    costUsd: cost,
    balanceUsd: endBal,
  });
  console.log(`Wrote dash/llm_mentions.json`);
}

// ---------------------------------------------------------------------------
// Markdown report writer (no em-dashes -- DM standing rule)
// ---------------------------------------------------------------------------
function writeMarkdown({ results, summary, competitorLeaderboard, cost, startBal, endBal }) {
  const now = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

  let md = `# Dungeon Mastron LLM Mentions Report\n\n`;
  md += `> Auto-generated by \`scripts/seo/llm-mentions.mjs\` on ${now}.\n`;
  md += `> Measures how often ChatGPT (gpt-4o-mini, web-search enabled) recommends Dungeon Mastron when story creators ask about CYOA / interactive fiction tools.\n`;
  md += `> API cost this run: $${cost.toFixed(4)} - balance: $${startBal} -> $${endBal}.\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|---|---|\n`;
  md += `| Prompts tested | ${summary.totalPrompts} |\n`;
  md += `| Prompts mentioning **Dungeon Mastron** | ${summary.promptsMentioningUs} |\n`;
  md += `| **AI mention rate** | **${summary.mentionRatePct}%** |\n`;
  md += `| Avg paragraph position when mentioned | ${summary.avgPositionWhenMentioned ?? "n/a"} |\n`;
  md += `| Top competitor in AI answers | ${summary.topCompetitor ?? "n/a"} (${summary.topCompetitorPromptCount}/${summary.totalPrompts} prompts) |\n\n`;

  if (summary.mentionRatePct === 0) {
    md += `> Dungeon Mastron is not yet visible in AI answers. This is expected for a newer site. The path to AI visibility: publish authoritative CYOA/IF content (our wedge), earn backlinks from game-making and IF community sites, and get mentioned on indie creator forums (Reddit r/gamedev, itch.io devlogs, HN). LLMs cite what is authoritative.\n\n`;
  } else if (summary.mentionRatePct < 30) {
    md += `> Early AI visibility. Dungeon Mastron appears in ${summary.mentionRatePct}% of prompts. Growing our CYOA/IF content authority, brand mentions on creator forums, and IF-niche backlinks will increase this rate.\n\n`;
  } else {
    md += `> Good AI visibility! Dungeon Mastron shows up in ${summary.mentionRatePct}% of buyer prompts. Keep publishing high-quality CYOA + IF content and earning creator-community backlinks to maintain and grow this.\n\n`;
  }

  md += `## Competitor leaderboard (AI mentions)\n\n`;
  md += `How often each competitor is recommended by ChatGPT across all ${summary.totalPrompts} prompts.\n\n`;
  md += `| rank | tool | prompts mentioned | total mentions |\n|---:|---|---:|---:|\n`;
  for (let i = 0; i < competitorLeaderboard.length; i++) {
    const c = competitorLeaderboard[i];
    md += `| ${i + 1} | ${c.name} | ${c.promptCount} | ${c.totalMentions} |\n`;
  }
  const ourMentioningCount = results.filter((r) => r.ourMention).length;
  const ourTotalMentions = results.reduce((a, r) => a + r.ourMentionCount, 0);
  md += `| -- | **Dungeon Mastron (us)** | **${ourMentioningCount}** | **${ourTotalMentions}** |\n\n`;

  md += `## Per-prompt results\n\n`;
  for (const r of results) {
    const status = r.error ? "ERROR" : r.ourMention ? "MENTIONED" : "not mentioned";
    md += `### ${status} -- "${r.prompt}"\n\n`;
    if (r.error) {
      md += `> Error: ${r.error}\n\n`;
      continue;
    }
    if (r.ourMention) {
      md += `**Dungeon Mastron** mentioned ${r.ourMentionCount} times (first at paragraph ~${r.ourPosition}).\n\n`;
      md += `> ${r.responseExcerpt}\n\n`;
    } else {
      md += `Dungeon Mastron not mentioned. Response excerpt:\n\n> ${r.responseExcerpt}\n\n`;
    }
    if (r.competitorsMentioned.length) {
      md += `Competitors mentioned: ${r.competitorsMentioned.map((c) => `${c.name} (${c.mentionCount} times)`).join(", ")}\n\n`;
    } else {
      md += `No tracked competitors mentioned.\n\n`;
    }
  }

  md += `## Action items\n\n`;
  md += `Based on this AI visibility snapshot:\n\n`;
  md += `1. **Publish GEO comparison content** -- "Dungeon Mastron vs Twine", "Dungeon Mastron vs Ink", etc. These get cited by AI because they directly answer the buyer questions above.\n`;
  md += `2. **Get mentioned on IF/game-maker forums** -- Reddit r/interactivefiction, r/gamedev, itch.io devlogs, Hacker News Show HN. Unlinked brand mentions of "Dungeon Mastron" still train LLMs to include us.\n`;
  md += `3. **Get listed on CYOA/IF resource directories** -- roundup posts like "best CYOA makers" are heavily cited by LLMs. These are also our highest-value backlink targets.\n`;
  md += `4. **Structured data** -- ensure homepage has Organization + SoftwareApplication schema so AI can identify DM as a named tool in the interactive fiction category.\n`;
  md += `5. **Blog authority on GEO/CYOA terms** -- our keyword research shows many CYOA/IF creation terms have low difficulty. Owning these terms lifts AI citation over time.\n`;
  md += `6. **Re-run monthly** -- AI mention rate tracks brand authority over time. Goal: 30%+ within 6 months.\n`;

  writeFileSync(OUT_MD, md);
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
