/**
 * Thin DataForSEO REST client for Dungeon Mastron.
 * Mirrors directree/app/scripts/seo/lib/dataforseo.mjs exactly.
 * SEPARATION: reads config from DM's config.mjs. Never touches other products' DBs.
 *
 * Docs: https://docs.dataforseo.com/v3/
 *
 * Added Jul 10 2026: serpOrganic, backlinksSummary, referringDomains,
 * llmResponses, onpageInstant — required by the 6 ported report scripts.
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

/**
 * Google organic SERP for a keyword. Returns ranked organic results (domain+url+title).
 * ~ $0.002 per query (live/regular).
 */
export async function serpOrganic(keyword, depth = 10) {
  const result = await post("/serp/google/organic/live/regular", [
    { keyword, location_code: LOCATION_CODE, language_code: LANGUAGE_CODE, depth },
  ]);
  const items = result?.[0]?.items || [];
  return items
    .filter((it) => it.type === "organic")
    .map((it) => ({
      rank: it.rank_absolute,
      domain: it.domain,
      url: it.url,
      title: it.title,
      description: it.description,
    }));
}

/**
 * Backlinks summary for a domain (Backlinks API). Returns aggregate authority
 * metrics: total backlinks, referring domains, domain rank, etc. ~ $0.02 per call.
 *
 * ⚠️  Requires DataForSEO Backlinks subscription (~$100/mo addon). Returns
 * status 40204 without it.
 */
export async function backlinksSummary(target) {
  const result = await post("/backlinks/summary/live", [
    { target, internal_list_limit: 10, include_subdomains: true },
  ]);
  const r = result?.[0] || {};
  return {
    target: r.target ?? target,
    rank: r.rank ?? null, // domain rank 0-1000
    backlinks: r.backlinks ?? 0,
    referringDomains: r.referring_domains ?? 0,
    referringMainDomains: r.referring_main_domains ?? 0,
    brokenBacklinks: r.broken_backlinks ?? 0,
    referringPages: r.referring_pages ?? 0,
  };
}

/**
 * Referring domains for a target (who links to it). Sorted by domain authority.
 * Used to find a competitor's backlink sources. ~ $0.02 per call.
 *
 * ⚠️  Requires DataForSEO Backlinks subscription (~$100/mo addon).
 */
export async function referringDomains(target, limit = 500) {
  const result = await post("/backlinks/referring_domains/live", [
    {
      target,
      limit,
      include_subdomains: true,
      order_by: ["rank,desc"],
      // only live links, exclude nofollow-only sources for prospecting quality
      filters: [["backlinks", ">", 0]],
    },
  ]);
  const items = result?.[0]?.items || [];
  return items.map((it) => ({
    domain: it.domain,
    rank: it.rank ?? 0, // referring domain rank (authority proxy)
    backlinks: it.backlinks ?? 0,
    firstSeen: it.first_seen ?? null,
    lostDate: it.lost_date ?? null,
    isLost: !!it.lost_date,
    dofollow: (it.backlinks ?? 0) - (it.backlinks_nofollow ?? 0) > 0,
  }));
}

/**
 * LLM Mentions -- query ChatGPT (or another model) via DataForSEO's AI Optimization
 * endpoint and return the full response text. Used to measure brand visibility
 * in AI-generated answers ("does the AI recommend us?").
 *
 * Endpoint: POST /ai_optimization/chat_gpt/llm_responses/live
 * Cost: ~$0.0003-0.001 per call depending on model + response length.
 *
 * @param {string} userPrompt  The user question to ask the LLM.
 * @param {object} [opts]
 * @param {string} [opts.model="gpt-4o-mini"]  Model name.
 * @param {boolean} [opts.webSearch=true]       Let the model search the web.
 * @returns {{ text: string, cost: number }}    Concatenated response text + cost.
 */
export async function llmResponses(userPrompt, { model = "gpt-4o-mini", webSearch = true } = {}) {
  const before = TOTAL_COST;
  const result = await post("/ai_optimization/chat_gpt/llm_responses/live", [
    {
      user_prompt: userPrompt,
      model_name: model,
      web_search: webSearch,
    },
  ]);
  // post() returns task.result (array). For this endpoint:
  //   result[0] = { model_name, items: [{ type: "message", sections: [{type,text},...] }], ... }
  const resultObj = result?.[0] || {};
  const items = resultObj.items || [];
  // Concatenate all section texts across all message items.
  const text = items
    .flatMap((it) => it.sections || [])
    .map((s) => s.text || "")
    .join("\n")
    .trim();
  const cost = TOTAL_COST - before;
  return { text, cost };
}

/**
 * OnPage instant page audit (single URL, synchronous). Returns the page's
 * on-page SEO checks + meta. ~ $0.0006 per page.
 */
export async function onpageInstant(url) {
  const result = await post("/on_page/instant_pages", [
    { url, enable_javascript: false, load_resources: false },
  ]);
  const item = result?.[0]?.items?.[0] || {};
  const meta = item.meta || {};
  const checks = item.checks || {};
  return {
    url: item.url ?? url,
    statusCode: item.status_code ?? null,
    fetchTime: item.fetch_time ?? null,
    title: meta.title ?? null,
    titleLength: meta.title?.length ?? 0,
    description: meta.description ?? null,
    descriptionLength: meta.description?.length ?? 0,
    h1: meta.htags?.h1 ?? [],
    internalLinks: meta.internal_links_count ?? null,
    externalLinks: meta.external_links_count ?? null,
    wordCount: meta.content?.plain_text_word_count ?? null,
    checks, // object of boolean on-page checks
    loadTimeMs: item.page_timing?.duration_time ?? null,
  };
}
