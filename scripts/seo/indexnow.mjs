/**
 * indexnow.mjs — IndexNow submission helper for Dungeon Mastron.
 * Mirrors directree/app/scripts/seo/indexnow.mjs, retargeted to dungeonmastron.com.
 *
 * Key file lives at: public/4b40c37cb556de4b3e71625ddfe1598c.txt
 * INDEXNOW_KEY env var must be set (loaded from .env.local by callers).
 *
 * PRODUCT ISOLATION: This script ONLY touches dungeonmastron.com.
 */

const HOST = "www.dungeonmastron.com";

function indexNowKey() {
  return process.env.INDEXNOW_KEY || "";
}

export async function submitUrlIndexNow(url) {
  const INDEXNOW_KEY = indexNowKey();
  if (!INDEXNOW_KEY) {
    console.warn("\u26a0\ufe0f  INDEXNOW_KEY not set in env \u2013 skipping IndexNow.");
    return false;
  }

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList: [url],
      }),
    });

    if (res.ok || res.status === 202) {
      console.log(`\u2705 IndexNow submitted: ${url}`);
      return true;
    } else {
      const text = await res.text();
      console.warn(`\u26a0\ufe0f  IndexNow failed (${res.status}): ${text}`);
      return false;
    }
  } catch (e) {
    console.warn(`\u26a0\ufe0f  IndexNow error: ${e.message}`);
    return false;
  }
}

export async function submitUrlsIndexNow(urls) {
  const INDEXNOW_KEY = indexNowKey();
  if (!INDEXNOW_KEY) {
    console.warn("\u26a0\ufe0f  INDEXNOW_KEY not set in env \u2013 skipping IndexNow.");
    return false;
  }
  if (!urls.length) return true;

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });

    if (res.ok || res.status === 202) {
      console.log(`\u2705 IndexNow submitted ${urls.length} URLs`);
      return true;
    } else {
      const text = await res.text();
      console.warn(`\u26a0\ufe0f  IndexNow bulk failed (${res.status}): ${text}`);
      return false;
    }
  } catch (e) {
    console.warn(`\u26a0\ufe0f  IndexNow error: ${e.message}`);
    return false;
  }
}

/**
 * CLI entry: submit every URL in public/sitemap.xml to IndexNow.
 * Usage: node --env-file=.env.local scripts/seo/indexnow.mjs [--sitemap]
 */
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const APP_ROOT = path.resolve(path.dirname(__filename), "..", "..");
  const sitemapPath = path.join(APP_ROOT, "public", "sitemap.xml");
  let urls = [];
  try {
    const xml = readFileSync(sitemapPath, "utf8");
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  } catch (e) {
    console.error(`Could not read sitemap at ${sitemapPath}: ${e.message}`);
    process.exit(1);
  }
  if (!urls.length) {
    console.error("No <loc> URLs found in sitemap.");
    process.exit(1);
  }
  console.log(`Submitting ${urls.length} URLs from sitemap to IndexNow...`);
  const ok = await submitUrlsIndexNow(urls);
  process.exit(ok ? 0 : 1);
}
