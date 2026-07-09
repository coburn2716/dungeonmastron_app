/**
 * Shared helper: write a dashboard-ready JSON for DM's SEO reports.
 *
 * Each report writes dungeon_mastron/content/blog/dash/<type>.json with:
 *   { reportType, capturedAt, summary:{...}, payload:{...}, costUsd, balanceUsd }
 *
 * NOTE: DM content lives in dungeon_mastron/content/blog (workspace repo), NOT under app/.
 * This file is at dungeon_mastron/app/scripts/seo/lib/, so go up 5 dirs to reach
 * the workspace root, then dungeon_mastron/content/blog.
 */
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// lib/ -> seo/ -> scripts/ -> app/ -> dungeon_mastron/ -> workspace root
const DM_ROOT = path.resolve(__dirname, "..", "..", "..", "..");
export const DASH_DIR = path.join(DM_ROOT, "content", "blog", "dash");

export function writeDash(reportType, { summary = {}, payload = {}, costUsd = null, balanceUsd = null } = {}) {
  if (!existsSync(DASH_DIR)) mkdirSync(DASH_DIR, { recursive: true });
  const out = {
    reportType,
    capturedAt: new Date().toISOString(),
    summary,
    payload,
    costUsd,
    balanceUsd,
  };
  writeFileSync(path.join(DASH_DIR, `${reportType}.json`), JSON.stringify(out));
  return out;
}
