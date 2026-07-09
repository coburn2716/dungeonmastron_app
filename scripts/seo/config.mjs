/**
 * Dungeon Mastron SEO machine config — competitors, seeds, relevance gating, scoring.
 * Mirrors directree/app/scripts/seo/config.mjs, retargeted to the CYOA / interactive-fiction niche.
 * SEPARATION: Dungeon Mastron only. Shares the DataForSEO ACCOUNT (research-only, no customer data).
 */

export const AUTH = {
  // Shared DataForSEO account (research-only). Env wins so creds can stay out of git.
  login: process.env.DATAFORSEO_LOGIN || "henrik@vndly.io",
  password: process.env.DATAFORSEO_PASSWORD || "01690964a744589f",
};

export const BASE_URL = "https://api.dataforseo.com/v3";

// Primary market. 2840 = United States, 2752 = Sweden.
export const LOCATION_CODE = 2840;
export const LANGUAGE_CODE = "en";

export const OUR_DOMAIN = "dungeonmastron.com";

/**
 * Competitor domains for keyword-gap analysis.
 * CYOA / interactive fiction / text adventure / visual novel tool space.
 */
export const COMPETITORS = [
  "twinery.org",
  "itch.io",
  "choiceofgames.com",
  "inklestudios.com",
  "renpy.org",
  "textadventures.co.uk",
  "philome.la",
  "chooseyourstory.com",
];

/**
 * Seed keywords for idea expansion. DM's real strengths:
 * CYOA creation / AI text adventure generation / branching story / Pi console.
 * Labs keyword_ideas expands each into long-tails.
 */
export const SEED_KEYWORDS = [
  "choose your own adventure maker",
  "how to make a choose your own adventure game",
  "text adventure creator",
  "interactive fiction tools",
  "twine alternative",
  "ai text adventure generator",
  "make a visual novel",
  "cyoa game maker",
  "branching story game",
  "raspberry pi game console diy",
  "make your own text adventure",
  "story game creator",
  "interactive story maker",
  "gamebook creator",
];

/**
 * Scoring weights. opportunity = volume-weight x winnability x relevance.
 */
export const SCORING = {
  minVolume: 30,
  maxComfortableDifficulty: 35,
  volumeWeight: 0.5,
  difficultyWeight: 0.4,
  intentWeight: 0.1,
};

/**
 * Relevance gate. A keyword must contain at least one of these stems to be
 * considered on-topic for Dungeon Mastron.
 */
export const RELEVANCE_STEMS = [
  // CYOA / choose your own adventure
  "choose your own adventure", "cyoa", "choose your adventure",
  "gamebook", "game book",
  // interactive fiction / text adventure
  "interactive fiction", "interactive story", "interactive narrative",
  "text adventure", "text game", "text-based game",
  "narrative game", "story game",
  // branching
  "branching story", "branching narrative", "branching game",
  "branching path",
  // creation / maker tools
  "make a game", "create a game", "game maker", "game creator",
  "story creator", "story maker", "story builder",
  "visual novel", "visual novel maker", "visual novel creator",
  "twine", "twine alternative", "ink game", "inkle",
  // AI angles
  "ai story", "ai adventure", "ai text adventure", "ai game", "ai narrative",
  "ai generate", "chatgpt game", "ai dungeon",
  // Pi / maker console
  "raspberry pi", "pi console", "diy console", "diy handheld",
  "pi handheld", "retro console", "pi game",
  // player / platform
  "play text adventure", "play interactive fiction",
  "online adventure game", "browser game maker",
];

/**
 * Negative gate. Rejects finance, jobs, unrelated noise.
 */
export const NEGATIVE_STEMS = [
  " stock price", " stock market", "stock quote", "share price",
  "salary", "jobs", " job ", "hiring", "resume", "course", "certification",
  "meaning in", "in hindi", "in tamil",
  "tattoo", "wallpaper", "aesthetic",
  // unrelated "adventure" uses
  "adventure travel", "adventure tours", "adventure sports", "camping adventure",
  // board game noise
  "board game", "card game", "tabletop", "dungeon master rules",
  "d&d dungeon master", "dungeons and dragons",
  // unrelated raspberry pi hardware
  "raspberry pi cluster", "raspberry pi server", "raspberry pi nas",
  "raspberry pi docker", "raspberry pi kubernetes",
];

// "<TICKER> stock" finance pattern.
export const TICKER_STOCK_RE = /^[a-z]{1,5}\s+stock$/i;

// Intent classifier buckets (scoring + routing to blog queues).
export const INTENT_RULES = [
  { intent: "comparison", weight: 1.0, re: /\b(vs|versus|alternative|alternatives|compare|comparison|best|top)\b/i },
  { intent: "how-to", weight: 0.95, re: /\b(how to|how do|guide|tutorial|step by step|set up|setup|create|make|build|generate|write|design)\b/i },
  { intent: "problem", weight: 0.85, re: /\b(problem|issue|fix|avoid|reduce|prevent|stop|error|mistake|not working|stuck)\b/i },
  { intent: "tool", weight: 0.8, re: /\b(tool|tools|software|app|platform|maker|creator|builder|generator|engine|editor)\b/i },
  { intent: "informational", weight: 0.6, re: /\b(what is|meaning|definition|examples?|statistics|stats|trends|history|types of)\b/i },
];

// ---------------------------------------------------------------------------
// Site + search-engine targets (DM's own properties).
// ---------------------------------------------------------------------------
export const SITE = {
  // Public site (www) — used for blog URLs, sitemap, IndexNow host.
  www: "https://www.dungeonmastron.com",
  // Google Search Console property URL (set this to match GSC verification;
  // if verified as a Domain property use "sc-domain:dungeonmastron.com").
  gscSiteUrl: "sc-domain:dungeonmastron.com",
  // Bing Webmaster site URL — DM canonicalizes to www.
  bingSiteUrl: "https://www.dungeonmastron.com",
  // IndexNow — key also written to public/4b40c37cb556de4b3e71625ddfe1598c.txt
  indexNowKey: "4b40c37cb556de4b3e71625ddfe1598c",
  indexNowHost: "www.dungeonmastron.com",
};
