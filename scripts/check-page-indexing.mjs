#!/usr/bin/env node
/**
 * Dungeon Mastron — page indexing checker for non-blog pages.
 * Mirrors flow/scripts/check-page-indexing.mjs + directree's pattern, retargeted for DM.
 *
 * Source of truth for URL list: public/sitemap.xml (DM is a static site).
 * Filters out /blog/ pages (those are tracked separately in blog_posts.google_indexed).
 * Upserts page_index_status rows into DM's Supabase for the support-admin dashboard.
 *
 * ─── SHARED CREDENTIALS NOTE ───────────────────────────────────────────────
 * TODO: Google GSC inspection requires the service account to have Owner access for
 * dungeonmastron.com in Google Search Console. Until that is set up, Google checks
 * degrade to a no-op (google_indexed stays null). Bing checks work independently.
 * See: check-blog-indexing.mjs header for setup instructions.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 *   cd dungeon_mastron/app
 *   node --env-file=.env.local scripts/check-page-indexing.mjs
 *
 * SEPARATION: reads sitemap from dungeonmastron.com; writes to DM's Supabase ONLY.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// Env loader
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

loadEnvFromFile(path.join(process.cwd(), ".env.local"));

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

// Shared Google service-account key (gitignored — see TODO note in header).
const KEY_PATH = path.join(__dirname, "..", ".google-indexing-key.json");

const DM_GSC_SITE_URL = process.env.DM_GSC_SITE_URL || "sc-domain:dungeonmastron.com";
const BASE_URL = "https://www.dungeonmastron.com";
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;
// Shared Bing key — same across all products; do NOT change.
const BING_API_KEY = process.env.BING_API_KEY || "b97f917feb124f0992bf2a14d82aad68";
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "6", 10);

const supabaseUrl =
  process.env.DUNGEONMASTRON_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const serviceKey =
  process.env.DUNGEONMASTRON_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  // ⚠️ Jul 30 2026: DM Supabase retired (project repurposed for SaaS Rocket).
  // page_index_status rows archived at data/supabase-archive-2026-07-30/.
  console.error("check-page-indexing.mjs: DM Supabase retired Jul 30 2026 — nothing to write to. Exiting.");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// ─────────────────────────────────────────────────────────────────────────────
// Page type classifier
// ─────────────────────────────────────────────────────────────────────────────
function pageTypeFor(url) {
  const p = url.replace(BASE_URL, "").replace(/\/$/, "") || "/";
  if (p === "/" || p === "") return "home";
  if (p === "/play") return "play";
  if (p === "/builder") return "builder";
  if (p === "/library") return "library";
  if (p === "/console") return "console";
  if (p === "/ai") return "ai";
  if (p === "/guides") return "guides";
  if (p === "/tools") return "tools";
  if (p === "/account") return "account";
  if (p === "/games") return "games";
  return "other";
}

// ─────────────────────────────────────────────────────────────────────────────
// Sitemap fetch
// ─────────────────────────────────────────────────────────────────────────────
async function fetchSitemapUrls() {
  const res = await fetch(SITEMAP_URL);
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  // Exclude blog pages (tracked in blog_posts via check-blog-indexing.mjs)
  return urls.filter((u) => !u.includes("/blog/"));
}

// ─────────────────────────────────────────────────────────────────────────────
// Google GSC inspection
// ─────────────────────────────────────────────────────────────────────────────
async function getGSCToken() {
  if (!fs.existsSync(KEY_PATH)) {
    console.warn(`\u26a0\ufe0f  No .google-indexing-key.json at ${KEY_PATH} — Google checks skipped.`);
    console.warn(`   TODO: set up GSC ownership for dungeonmastron.com (see script header).`);
    return null;
  }
  try {
    const { GoogleAuth } = await import("google-auth-library");
    const key = JSON.parse(fs.readFileSync(KEY_PATH, "utf8"));
    const auth = new GoogleAuth({
      credentials: key,
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
    const client = await auth.getClient();
    const { token } = await client.getAccessToken();
    return token;
  } catch (e) {
    console.warn(`\u26a0\ufe0f  Could not get GSC token: ${e.message} — Google checks skipped.`);
    return null;
  }
}

async function inspectUrl(token, url) {
  const res = await fetch(
    "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: DM_GSC_SITE_URL }),
    }
  );
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Bing URL Info
// ─────────────────────────────────────────────────────────────────────────────
async function checkBing(url) {
  if (!BING_API_KEY) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://ssl.bing.com/webmaster/api.svc/json/GetUrlInfo?apikey=${BING_API_KEY}&siteUrl=${encodeURIComponent(BASE_URL)}&url=${encodeURIComponent(url)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.d?.DocumentSize === "number" && data.d.DocumentSize > 0;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\ud83d\udd11 Getting GSC token...");
  const token = await getGSCToken();
  const googleEnabled = !!token;

  console.log(`\ud83d\udcc4 Fetching sitemap: ${SITEMAP_URL}`);
  const urls = await fetchSitemapUrls();
  console.log(`Found ${urls.length} non-blog URLs.\n`);

  let googleYes = 0, googleNo = 0, bingYes = 0, bingNo = 0, bingUnknown = 0;
  let done = 0;

  async function processUrl(url) {
    let googleIndexed = null;
    let verdict = null;
    let coverageState = null;
    let lastCrawl = null;

    if (googleEnabled) {
      try {
        const result = await inspectUrl(token, url);
        const r = result?.inspectionResult?.indexStatusResult;
        verdict = r?.verdict || null;
        coverageState = r?.coverageState || null;
        lastCrawl = r?.lastCrawlTime || null;
        googleIndexed = verdict === "PASS";
      } catch (e) {
        console.warn(`  \u26a0\ufe0f Google inspection failed for ${url}: ${e.message}`);
      }
    }

    const bingIndexed = await checkBing(url);

    await supabase.from("page_index_status").upsert(
      {
        url,
        page_type: pageTypeFor(url),
        google_verdict: verdict,
        google_coverage_state: coverageState,
        google_indexed: googleIndexed,
        google_last_crawl: lastCrawl,
        bing_indexed: bingIndexed,
        checked_at: new Date().toISOString(),
      },
      { onConflict: "url" }
    );

    const gIcon = googleIndexed === true ? "\u2705" : googleIndexed === false ? "\u274c" : "\u2753";
    const bIcon = bingIndexed === null ? "\u2753" : bingIndexed ? "\u2705" : "\u274c";
    console.log(`  [${++done}/${urls.length}] G:${gIcon} B:${bIcon}  ${url}`);

    if (googleIndexed === true) googleYes++;
    else if (googleIndexed === false) googleNo++;
    if (bingIndexed === null) bingUnknown++;
    else if (bingIndexed) bingYes++;
    else bingNo++;
  }

  const queue = [...urls];
  async function worker() {
    while (queue.length) {
      const url = queue.shift();
      if (!url) break;
      try {
        await processUrl(url);
      } catch (e) {
        console.warn(`  \u26a0\ufe0f Failed ${url}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log(`\n\ud83d\udcca Summary:`);
  if (googleEnabled) {
    console.log(`  Google: ${googleYes}/${urls.length} indexed, ${googleNo} not indexed`);
  } else {
    console.log(`  Google: (skipped — add .google-indexing-key.json + GSC ownership to enable)`);
  }
  console.log(`  Bing: ${bingYes} indexed, ${bingNo} not indexed, ${bingUnknown} unknown`);
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
