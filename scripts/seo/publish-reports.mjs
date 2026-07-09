#!/usr/bin/env node
/**
 * Publish SEO dashboard data to DM's Supabase so the support-admin app can read it.
 * Mirrors directree/app/scripts/seo/publish-reports.mjs, retargeted for Dungeon Mastron.
 *
 * Reads the compact dash JSONs written by each report script
 * (dungeon_mastron/content/blog/dash/<type>.json) and inserts one row per report into
 * public.seo_reports (history kept for trends).
 *
 * Runs as the final step of the SEO crons. Idempotent-ish: each run inserts a fresh snapshot row.
 *
 * Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (DM prod). Loaded from
 * dungeon_mastron/app/.env.local automatically.
 *
 * Usage:
 *   node scripts/seo/publish-reports.mjs            # publish all dash JSONs found
 *   node scripts/seo/publish-reports.mjs --only keywords
 *   node scripts/seo/publish-reports.mjs --dry
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { DASH_DIR } from "./lib/publish.mjs";

import fs from "node:fs";
function loadEnvLocal() {
  try {
    const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", ".env.local");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i < 0) continue;
      const k = line.slice(0, i).trim(), v = line.slice(i + 1).trim().replace(/^"|"$/g, "");
      if (k && !process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnvLocal();

// DM Supabase project: wppcbpbrustgcdqhfuqs
const SUPABASE_URL =
  process.env.DUNGEONMASTRON_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://wppcbpbrustgcdqhfuqs.supabase.co";
const SUPABASE_KEY =
  process.env.DUNGEONMASTRON_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwcGNicGJydXN0Z2NkcWhmdXFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzYxMDcxOCwiZXhwIjoyMDk5MTg2NzE4fQ.aI5fY1sn-EkCnFwGDZ9JHLXvgCx4dg_gfNjTbE8i7kg";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const onlyArg = (() => {
  const i = args.indexOf("--only");
  return i >= 0 && args[i + 1] ? args[i + 1].split(",").map((s) => s.trim()) : null;
})();

async function main() {
  if (!existsSync(DASH_DIR)) {
    console.log(`No dash dir at ${DASH_DIR} — nothing to publish. (Run keyword-research.mjs first.)`);
    return;
  }
  const files = readdirSync(DASH_DIR).filter((f) => f.endsWith(".json"));
  if (!files.length) {
    console.log("No dash JSON files found — nothing to publish.");
    return;
  }

  const rows = [];
  for (const f of files) {
    const type = f.replace(/\.json$/, "");
    if (onlyArg && !onlyArg.includes(type)) continue;
    try {
      const d = JSON.parse(readFileSync(path.join(DASH_DIR, f), "utf8"));
      rows.push({
        report_type: d.reportType || type,
        captured_at: d.capturedAt || new Date().toISOString(),
        summary: d.summary || {},
        payload: d.payload || {},
        cost_usd: d.costUsd ?? null,
        balance_usd: d.balanceUsd ?? null,
      });
      console.log(`  + ${type}  (summary keys: ${Object.keys(d.summary || {}).join(", ") || "none"})`);
    } catch (e) {
      console.log(`  ! ${f}: ${e.message}`);
    }
  }

  if (!rows.length) {
    console.log("Nothing matched to publish.");
    return;
  }
  if (DRY) {
    console.log(`\n--dry: would insert ${rows.length} rows into seo_reports.`);
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.from("seo_reports").insert(rows);
  if (error) {
    console.error("Insert FAILED:", error.message);
    process.exit(1);
  }
  console.log(`\nPublished ${rows.length} reports to seo_reports (DM Supabase).`);

  // Prune old rows: keep last 26 per type (~6 months of weekly runs)
  try {
    for (const type of [...new Set(rows.map((r) => r.report_type))]) {
      const { data: keep } = await supabase
        .from("seo_reports")
        .select("id")
        .eq("report_type", type)
        .order("captured_at", { ascending: false })
        .limit(26);
      const keepIds = (keep || []).map((r) => r.id);
      if (keepIds.length === 26) {
        const minKeep = Math.min(...keepIds);
        await supabase.from("seo_reports").delete().eq("report_type", type).lt("id", minKeep);
      }
    }
  } catch (e) {
    console.log(`(prune skipped: ${e.message})`);
  }
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
