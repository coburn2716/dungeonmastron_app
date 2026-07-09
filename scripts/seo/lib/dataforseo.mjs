/**
 * Thin DataForSEO REST client for Dungeon Mastron.
 * Mirrors directree/app/scripts/seo/lib/dataforseo.mjs exactly.
 * SEPARATION: reads config from DM's config.mjs. Never touches other products' DBs.
 *
 * Docs: https://docs.dataforseo.com/v3/
 */
import { AUTH, BASE_URL, LOCATION_CODE, LANGUAGE_CODE } from "../config.mjs";

let TOTAL_COST = 0;
export function totalCost() {
  return TOTAL_COST;
}

function authHeader() {
  const token = Buffer.from(`${AUTH.login}:${AUTH.password}`).toString("base64");
  return `Basic ${token}`;
}

async function post(path, taskArray) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(taskArray),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DataForSEO ${path} HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  TOTAL_COST += json.cost || 0;
  if (json.status_code !== 20000) {
    throw new Error(`DataForSEO ${path} status ${json.status_code}: ${json.status_message}`);
  }
  const task = json.tasks?.[0];
  if (task && task.status_code !== 20000) {
    throw new Error(`DataForSEO ${path} task ${task.status_code}: ${task.status_message}`);
  }
  return task?.result || [];
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: authHeader() },
  });
  const json = await res.json();
  TOTAL_COST += json.cost || 0;
  return json;
}

/** Current account balance in USD. Free call. */
export async function balance() {
  const j = await get("/appendix/user_data");
  return j.tasks?.[0]?.result?.[0]?.money?.balance ?? null;
}

/**
 * Google Ads search volume / CPC / competition for a list of keywords.
 * Up to 1000 keywords per call. ~ $0.05 / 1000.
 */
export async function searchVolume(keywords) {
  const out = [];
  for (let i = 0; i < keywords.length; i += 1000) {
    const batch = keywords.slice(i, i + 1000);
    const result = await post("/keywords_data/google_ads/search_volume/live", [
      { keywords: batch, location_code: LOCATION_CODE, language_code: LANGUAGE_CODE },
    ]);
    for (const r of result) {
      out.push({
        keyword: r.keyword,
        volume: r.search_volume ?? 0,
        cpc: r.cpc ?? 0,
        competition: r.competition ?? null,
        competitionIndex: r.competition_index ?? null,
      });
    }
  }
  return out;
}

/**
 * Keyword ideas from seeds (Labs keyword_ideas).
 * ~ $0.01-0.02 per call.
 */
export async function keywordIdeas(seedKeywords, limit = 500) {
  const result = await post("/dataforseo_labs/google/keyword_ideas/live", [
    {
      keywords: seedKeywords,
      location_code: LOCATION_CODE,
      language_code: LANGUAGE_CODE,
      limit,
      include_serp_info: false,
      order_by: ["keyword_info.search_volume,desc"],
    },
  ]);
  const items = result?.[0]?.items || [];
  return items.map((it) => ({
    keyword: it.keyword,
    volume: it.keyword_info?.search_volume ?? 0,
    cpc: it.keyword_info?.cpc ?? 0,
    competition: it.keyword_info?.competition_level ?? null,
    difficulty: it.keyword_properties?.keyword_difficulty ?? null,
  }));
}

/**
 * Keyword suggestions (Labs) — long-tail phrases containing the seed. ~ $0.01 per call.
 */
export async function keywordSuggestions(seed, limit = 300) {
  const result = await post("/dataforseo_labs/google/keyword_suggestions/live", [
    {
      keyword: seed,
      location_code: LOCATION_CODE,
      language_code: LANGUAGE_CODE,
      limit,
      include_serp_info: false,
      order_by: ["keyword_info.search_volume,desc"],
    },
  ]);
  const items = result?.[0]?.items || [];
  return items.map((it) => ({
    keyword: it.keyword,
    volume: it.keyword_info?.search_volume ?? 0,
    cpc: it.keyword_info?.cpc ?? 0,
    competition: it.keyword_info?.competition_level ?? null,
    difficulty: it.keyword_properties?.keyword_difficulty ?? null,
  }));
}

/**
 * Keywords a competitor domain ranks for (Labs ranked_keywords).
 * ~ $0.01 per page (1000 kw).
 */
export async function rankedKeywords(domain, limit = 1000) {
  const result = await post("/dataforseo_labs/google/ranked_keywords/live", [
    {
      target: domain,
      location_code: LOCATION_CODE,
      language_code: LANGUAGE_CODE,
      limit,
      order_by: ["keyword_data.keyword_info.search_volume,desc"],
      filters: [["keyword_data.keyword_info.search_volume", ">", 20]],
    },
  ]);
  const items = result?.[0]?.items || [];
  return items.map((it) => ({
    keyword: it.keyword_data?.keyword,
    volume: it.keyword_data?.keyword_info?.search_volume ?? 0,
    cpc: it.keyword_data?.keyword_info?.cpc ?? 0,
    competition: it.keyword_data?.keyword_info?.competition_level ?? null,
    difficulty: it.keyword_data?.keyword_properties?.keyword_difficulty ?? null,
    position: it.ranked_serp_element?.serp_item?.rank_absolute ?? null,
    url: it.ranked_serp_element?.serp_item?.url ?? null,
  }));
}

/**
 * Bulk keyword difficulty (0-100). Up to 1000 keywords per call. ~ $0.01 / 1000.
 */
export async function bulkDifficulty(keywords) {
  const out = {};
  for (let i = 0; i < keywords.length; i += 1000) {
    const batch = keywords.slice(i, i + 1000);
    const result = await post("/dataforseo_labs/google/bulk_keyword_difficulty/live", [
      { keywords: batch, location_code: LOCATION_CODE, language_code: LANGUAGE_CODE },
    ]);
    for (const it of result?.[0]?.items || []) {
      out[it.keyword] = it.keyword_difficulty ?? null;
    }
  }
  return out;
}
