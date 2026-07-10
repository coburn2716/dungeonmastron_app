#!/usr/bin/env node
/**
 * Dungeon Mastron Backlink Prospecting.
 * Ported from directree/app/scripts/seo/backlink-prospects.mjs (Jul 10 2026).
 * SEPARATION: DM only. Never touches other products' DBs or dirs.
 *
 * REQUIRES DataForSEO Backlinks subscription (~$100/mo addon).
 * Without it the Backlinks API returns status 40204 ("task is no longer available").
 * The basic DataForSEO plan does NOT include Backlinks endpoints.
 * The rest of the SEO machine (keyword-research, footprint, onpage-audit,
 * llm-mentions) works without this subscription.
 *
 * Finds domains that link to our COMPETITORS but NOT to dungeonmastron.com.
 * Classic "competitor backlink gap" / link-intersect play for the CYOA / IF niche.
 *
 * Also prints a backlink authority scoreboard (us vs each competitor) so Henrik
 * can see where DM stands on off-page authority (domain rank, referring domains).
 *
 * READ-ONLY to our systems. Only external writes are DataForSEO API reads (paid).
 * Cost ~$0.02 per domain queried. With ~8 competitors + us that's ~$0.18/run.
 * Run monthly (off-page moves slowly), not weekly.
 *
 * Usage:
 *   node scripts/seo/backlink-prospects.mjs              # full run
 *   node scripts/seo/backlink-prospects.mjs --top 5      # only top 5 competitors
 *   node scripts/seo/backlink-prospects.mjs --dry
 */
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { balance, backlinksSummary, referringDomains, totalCost } from "./lib/dataforseo.mjs";
import { COMPETITORS, OUR_DOMAIN } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/seo/ -> scripts/ -> app/ -> dungeon_mastron/ -> workspace root
const DM_ROOT = path.resolve(__dirname, "..", "..", "..");
const BLOG_DIR = path.join(DM_ROOT, "content", "blog");
const OUT_MD = path.join(BLOG_DIR, "BACKLINK_PROSPECTS.md");
const OUT_JSON = path.join(BLOG_DIR, "BACKLINK_PROSPECTS.json"); // gitignored

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const argVal = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const TOP = parseInt(argVal("--top", "8"), 10); // how many competitors to mine
const PER_COMP = parseInt(argVal("--per-competitor", "500"), 10);
const MIN_RANK = parseInt(argVal("--min-rank", "30"), 10); // skip junk-authority domains

// obvious non-prospect sources to skip (we'll never "get a link" from these)
const SKIP_RE = /(facebook|twitter|x\.com|linkedin|youtube|instagram|pinterest|reddit|wikipedia|google\.|bing\.|amazon\.|apple\.|github\.|t\.co|bit\.ly|gravatar|wordpress\.org|w3\.org|schema\.org|gstatic|cloudflare|googleapis)/i;

function rootDomain(d) {
  return (d || "").replace(/^www\./, "").toLowerCase();
}

async function main() {
  console.log(`Backlink prospecting -- us + top ${TOP} competitors`);
  console.log(`\n[NOTE] This script requires the DataForSEO Backlinks subscription (~$100/mo addon).`);
  console.log(`       If you see status 40204 errors, the subscription is not active on this account.\n`);

  if (DRY) {
    console.log("--dry: skipping all API calls.");
    console.log("\nWould query:");
    const domains = [OUR_DOMAIN, ...COMPETITORS.slice(0, TOP)];
    for (const d of domains) console.log(`  ${d}`);
    console.log(`\nCompetitor domains for gap analysis (top ${TOP} of ${COMPETITORS.length}):`);
    for (const c of COMPETITORS.slice(0, TOP)) console.log(`  ${c}`);
    console.log(`\nMinimum domain rank threshold: ${MIN_RANK}`);
    console.log(`Referring domains per competitor: ${PER_COMP}`);
    console.log(`\n--dry: not writing files.`);
    return;
  }

  const startBal = await balance();
  console.log(`Balance before: $${startBal}`);

  // 1. authority scoreboard (summary for us + each competitor)
  const board = [];
  const domains = [OUR_DOMAIN, ...COMPETITORS.slice(0, TOP)];
  for (const dom of domains) {
    try {
      const s = await backlinksSummary(dom);
      board.push(s);
      console.log(`  ${dom}: rank ${s.rank}, ${s.referringDomains} ref domains, ${s.backlinks} backlinks`);
    } catch (e) {
      console.log(`  ${dom}: summary ERROR ${e.message}`);
      if (e.message.includes("40204")) {
        console.log(`  -> 40204 = Backlinks subscription required. Stopping.`);
        process.exit(1);
      }
    }
  }

  // 2. our referring domains (to subtract)
  let oursSet = new Set();
  try {
    const ours = await referringDomains(OUR_DOMAIN, 1000);
    oursSet = new Set(ours.map((r) => rootDomain(r.domain)));
    console.log(`  our referring domains: ${oursSet.size}`);
  } catch (e) {
    console.log(`  our referring domains ERROR: ${e.message}`);
  }

  // 3. each competitor's referring domains, minus ours, minus junk
  const prospects = new Map();
  for (const comp of COMPETITORS.slice(0, TOP)) {
    try {
      const refs = await referringDomains(comp, PER_COMP);
      for (const r of refs) {
        const dom = rootDomain(r.domain);
        if (!dom || r.isLost) continue;
        if (oursSet.has(dom)) continue; // already link to us
        if (SKIP_RE.test(dom)) continue;
        if ((r.rank || 0) < MIN_RANK) continue; // skip low-authority noise
        const ex = prospects.get(dom);
        if (!ex) {
          prospects.set(dom, { domain: dom, rank: r.rank || 0, competitors: new Set([comp]), dofollow: r.dofollow });
        } else {
          ex.competitors.add(comp);
          ex.rank = Math.max(ex.rank, r.rank || 0);
          ex.dofollow = ex.dofollow || r.dofollow;
        }
      }
      console.log(`  ${comp}: scanned ${refs.length} referring domains`);
    } catch (e) {
      console.log(`  ${comp}: referring ERROR ${e.message}`);
    }
  }

  // score: links to MANY competitors (clearly in our niche) + high authority = best prospect
  const ranked = [...prospects.values()]
    .map((p) => ({
      domain: p.domain,
      rank: p.rank,
      competitorCount: p.competitors.size,
      competitors: [...p.competitors],
      dofollow: p.dofollow,
      score: Math.round(p.competitors.size * 25 + Math.min(p.rank, 100) * 0.5),
    }))
    .sort((a, b) => b.score - a.score);

  const cost = totalCost();
  const endBal = await balance();
  console.log(`Done. API cost: $${cost.toFixed(4)} | balance now: $${endBal}`);
  console.log(`Prospects: ${ranked.length}`);

  writeReport({ board, ranked, cost, startBal, endBal });
  console.log(`Wrote ${OUT_MD}`);
}

function writeReport(d) {
  if (!existsSync(BLOG_DIR)) mkdirSync(BLOG_DIR, { recursive: true });
  const now = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
  const us = d.board.find((b) => (b.target || "").includes(OUR_DOMAIN));

  let md = `# Dungeon Mastron Backlink Prospects\n\n`;
  md += `> Auto-generated by \`scripts/seo/backlink-prospects.mjs\` on ${now}.\n`;
  md += `> Sites that link to CYOA / interactive fiction tool competitors but NOT to ${OUR_DOMAIN} -- warm outreach / guest-post targets.\n`;
  md += `> [NOTE] Requires DataForSEO Backlinks subscription (~$100/mo addon). Returns 40204 until activated.\n`;
  md += `> API cost this run: $${d.cost.toFixed(4)} - balance: $${d.startBal} -> $${d.endBal}.\n\n`;

  md += `## Off-page authority scoreboard (us vs competitors)\n\n`;
  md += `Domain rank is DataForSEO's 0-1000 authority proxy. Referring domains = how many unique sites link in.\n\n`;
  md += `| domain | domain rank | referring domains | backlinks |\n|---|---:|---:|---:|\n`;
  for (const b of d.board.sort((a, x) => (x.rank || 0) - (a.rank || 0))) {
    const mark = (b.target || "").includes(OUR_DOMAIN) ? " (us)" : "";
    md += `| ${b.target}${mark} | ${b.rank ?? "?"} | ${b.referringDomains} | ${b.backlinks} |\n`;
  }
  md += `\n`;
  if (us) {
    md += `**Where we stand:** dungeonmastron.com has ${us.referringDomains} referring domains (rank ${us.rank}). `;
    md += `The prospect list below is how to close the gap -- each is a site already linking to CYOA / interactive fiction / game-making competitors.\n\n`;
  }

  md += `## Outreach prospects (link to competitors, not to us)\n\n`;
  md += `Sorted by how many CYOA/IF tool competitors they link to (more = clearly in our niche) + their authority.\n`;
  md += `**Approach strategies for the CYOA / interactive fiction niche:**\n`;
  md += `- **Listicle inclusion**: pitch "best CYOA makers" or "Twine alternatives" roundups to include Dungeon Mastron\n`;
  md += `- **Guest post**: write a story-game tutorial (e.g. "How to build your first text adventure in 2026") for IF / game-dev blogs\n`;
  md += `- **Resource page**: if they have a "story-game tools" or "IF resources" page, ask to be included\n`;
  md += `- **Maker community**: retro-computing / Pi-console / DIY hacker sites for the physical console angle\n`;
  md += `- **Broken-link replacement**: find any dead Twine / old IF tool links and propose Dungeon Mastron as replacement\n\n`;
  md += `| score | domain | authority | #competitors linked | which competitors |\n|---:|---|---:|---:|---|\n`;
  md += d.ranked
    .slice(0, 100)
    .map((p) => `| ${p.score} | ${p.domain} | ${p.rank} | ${p.competitorCount} | ${p.competitors.join(", ")} |`)
    .join("\n");
  md += `\n`;

  writeFileSync(OUT_MD, md);
  writeFileSync(OUT_JSON, JSON.stringify({ takenAt: now, board: d.board, prospects: d.ranked.slice(0, 300) }, null, 0));
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
