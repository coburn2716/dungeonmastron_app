/**
 * Keyword scoring, relevance gating, and intent classification for Dungeon Mastron.
 * Mirrors directree/app/scripts/seo/lib/score.mjs exactly.
 * Imports from DM's own config.mjs so stems/rules are niche-targeted.
 */
import { SCORING, RELEVANCE_STEMS, NEGATIVE_STEMS, TICKER_STOCK_RE, INTENT_RULES } from "../config.mjs";

/** Is this keyword on-topic for Dungeon Mastron? */
export function isRelevant(keyword) {
  const k = keyword.toLowerCase().trim();
  // reject obvious non-english / non-latin noise
  if (/[^\x00-\x7f]/.test(k)) return false;
  // reject "<ticker> stock" finance pattern
  if (TICKER_STOCK_RE.test(k)) return false;
  // negative gate first
  if (NEGATIVE_STEMS.some((neg) => k.includes(neg.trim()))) return false;
  return RELEVANCE_STEMS.some((stem) => k.includes(stem));
}

/** Classify search intent + return its weight. */
export function classifyIntent(keyword) {
  for (const rule of INTENT_RULES) {
    if (rule.re.test(keyword)) return { intent: rule.intent, weight: rule.weight };
  }
  return { intent: "other", weight: 0.5 };
}

/**
 * Opportunity score 0-100. Rewards volume + low difficulty + commercial intent.
 * difficulty may be null -> treated as unknown/medium (50).
 */
export function opportunityScore({ volume = 0, difficulty = null, keyword = "" }) {
  const { minVolume, maxComfortableDifficulty, volumeWeight, difficultyWeight, intentWeight } = SCORING;

  // Volume component: log-scaled so 18k doesn't dwarf everything; capped.
  const volScore = volume <= 0 ? 0 : Math.min(1, Math.log10(volume + 1) / Math.log10(50000));

  // Difficulty component: easier = higher.
  // difficulty of exactly 0 from DataForSEO usually means "could not compute"
  // (odd/ultra-long-tail queries), NOT "trivially easy" -> treat as unknown/medium.
  const diff = difficulty == null || difficulty === 0 ? 50 : difficulty;
  const diffScore = Math.max(0, 1 - diff / 100);
  // extra reward when comfortably below our difficulty comfort line (but not bogus 0)
  const winBonus = diff > 0 && diff <= maxComfortableDifficulty ? 0.15 : 0;

  const { weight: intentW } = classifyIntent(keyword);

  let score =
    volScore * volumeWeight +
    (diffScore + winBonus) * difficultyWeight +
    intentW * intentWeight;

  // hard penalty for sub-threshold volume so they sink to the bottom
  if (volume < minVolume) score *= 0.4;

  return Math.round(score * 100);
}

/** Mark the "striking distance" / sweet-spot keywords. */
export function isSweetSpot({ volume = 0, difficulty = null }) {
  // require a real (non-zero, computed) difficulty in the comfortable band
  return (
    volume >= 100 &&
    difficulty != null &&
    difficulty > 0 &&
    difficulty <= SCORING.maxComfortableDifficulty
  );
}
