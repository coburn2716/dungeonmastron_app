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
