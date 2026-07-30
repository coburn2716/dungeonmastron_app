#!/usr/bin/env node
/**
 * Dungeon Mastron — blog post indexing checker.
 * Mirrors directree/app/scripts/blog/check-blog-indexing.mjs, retargeted for DM.
 *
 * Checks Google + Bing indexing status for all published DM blog posts.
 * Updates google_indexed / bing_indexed columns in DM's Supabase blog_posts table.
 *
 * Google: GSC URL Inspection API (requires service account + GSC ownership)
 * Bing:   Webmaster Tools API (shared key — same key used by all products)
 *
 * ─── SHARED CREDENTIALS NOTE ───────────────────────────────────────────────
 * TODO: The Google service account key (vndly-seo SA) was granted GSC ownership
 * for vndly.io, qrhubly.com, lapsewise.com, and directree.io by Henrik.
 * Dungeon Mastron is NOT yet verified in Google Search Console under that SA.
 *
 * To enable Google indexing checks for DM:
 *   1. Verify https://www.dungeonmastron.com in Google Search Console
 *      (or add as a Domain property: sc-domain:dungeonmastron.com)
 *   2. Grant the vndly-seo service account (same one used by other products)
 *      "Owner" access in GSC for dungeonmastron.com
 *   3. Confirm KEY_PATH below points to that same .google-indexing-key.json
 *
 * Until then: the Google check degrades gracefully to a no-op (prints a warning,
 * leaves google_indexed as null). Bing checks work independently.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 *   cd dungeon_mastron/app
 *   node --env-file=.env.local scripts/blog/check-blog-indexing.mjs
 *
 * SEPARATION: reads from and writes to DM's Supabase ONLY (wppcbpbrustgcdqhfuqs).
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

// Google service account key: shared across products (lives at app root, gitignored).
// TODO: ensure the SA has GSC Owner access for dungeonmastron.com (see header note).
const KEY_PATH = path.join(__dirname, "..", "..", ".google-indexing-key.json");

const DM_GSC_SITE_URL = process.env.DM_GSC_SITE_URL || "sc-domain:dungeonmastron.com";
const BASE_URL = "https://www.dungeonmastron.com";
const BING_SITE_URL = process.env.DM_BING_SITE_URL || "https://www.dungeonmastron.com";
// Shared Bing Webmaster API key — same key used by all products; do NOT change.
const BING_API_KEY = process.env.BING_API_KEY || "b97f917feb124f0992bf2a14d82aad68";

const supabaseUrl =
  process.env.DUNGEONMASTRON_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const serviceKey =
  process.env.DUNGEONMASTRON_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  // ⚠️ Jul 30 2026: DM's Supabase project (wppcbpbrustgcdqhfuqs) was RETIRED and
  // repurposed for SaaS Rocket. There is no blog_posts table to update anymore
  // (rows archived at data/supabase-archive-2026-07-30/blog_posts.json).
  console.error(
    "check-blog-indexing.mjs: DM Supabase retired Jul 30 2026 (project repurposed for SaaS Rocket). Nothing to check against — exiting."
  );
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// ─────────────────────────────────────────────────────────────────────────────
// Google GSC URL Inspection
// ─────────────────────────────────────────────────────────────────────────────

async function getGSCToken() {
  if (!fs.existsSync(KEY_PATH)) {
    // TODO: place .google-indexing-key.json at dungeon_mastron/app/ (shared SA key)
    console.warn(`\u26a0\ufe0f  No .google-indexing-key.json at ${KEY_PATH} — Google indexing checks skipped.`);
    console.warn(`   (See TODO in script header: grant GSC Owner access for dungeonmastron.com)`);
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
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
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
      `https://ssl.bing.com/webmaster/api.svc/json/GetUrlInfo?apikey=${BING_API_KEY}&siteUrl=${encodeURIComponent(BING_SITE_URL)}&url=${encodeURIComponent(url)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    // DocumentSize > 0 means Bing has indexed the content
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
  if (!googleEnabled) {
    console.log("   (Google checks disabled until GSC is set up for dungeonmastron.com)");
  }

  const { data: posts, error: postsError } = await supabase
    .from("blog_posts")
    .select("slug, date, gsc_impressions, gsc_clicks")
    .eq("published", true)
    .order("date", { ascending: false });

  if (postsError) {
    console.error("Failed to fetch posts:", postsError.message);
    process.exit(1);
  }
  if (!posts?.length) {
    console.log("No published posts in DM Supabase blog_posts table.");
    return;
  }

  console.log(`Checking ${posts.length} posts...\n`);

  let googleYes = 0, googleNo = 0, bingYes = 0, bingNo = 0, bingUnknown = 0;

  for (const post of posts) {
    const url = `${BASE_URL}/blog/${post.slug}/`;

    // Google URL Inspection (if token available)
    let googleIndexed = null;
    if (googleEnabled) {
      const hasGscActivity = (post.gsc_impressions ?? 0) > 0 || (post.gsc_clicks ?? 0) > 0;
      try {
        const result = await inspectUrl(token, url);
        const verdict = result?.inspectionResult?.indexStatusResult?.verdict;
        googleIndexed = verdict === "PASS" || hasGscActivity;
      } catch (e) {
        googleIndexed = hasGscActivity ? true : null;
        console.warn(`  \u26a0\ufe0f Google inspection failed for ${post.slug}: ${e.message}`);
      }
    }

    // Bing
    let bingIndexed = null;
    if (BING_API_KEY) {
      bingIndexed = await checkBing(url);
    } else {
      // Heuristic: if published >14 days ago, assume indexed
      const publishedDate = post.date ? new Date(post.date) : null;
      const ageMs = publishedDate ? Date.now() - publishedDate.getTime() : 0;
      bingIndexed = ageMs > 14 * 86400000;
    }

    // Update DB — only update columns we actually checked
    const updateFields = { bing_indexed: bingIndexed };
    if (googleIndexed !== null) updateFields.google_indexed = googleIndexed;

    await supabase.from("blog_posts").update(updateFields).eq("slug", post.slug);

    const gIcon = googleIndexed === null ? "\u2753" : googleIndexed ? "\u2705" : "\u274c";
    const bIcon = bingIndexed === null ? "\u2753" : bingIndexed ? "\u2705" : "\u274c";
    console.log(`  G:${gIcon} B:${bIcon}  ${post.slug}`);

    if (googleIndexed === true) googleYes++;
    else if (googleIndexed === false) googleNo++;
    if (bingIndexed === null) bingUnknown++;
    else if (bingIndexed) bingYes++;
    else bingNo++;

    // Rate limit: ~2 req/sec
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n\ud83d\udcca Summary:`);
  if (googleEnabled) {
    console.log(`  Google: ${googleYes} indexed, ${googleNo} not indexed`);
  } else {
    console.log(`  Google: (skipped — see TODO in script header)`);
  }
  console.log(`  Bing:   ${bingYes} indexed, ${bingNo} not indexed, ${bingUnknown} unknown`);
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
