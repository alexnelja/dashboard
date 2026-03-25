// lib/trust-score.ts

import type { Rating } from './types';
import { TRUST_CONFIG } from './constants';

// Bayesian confidence threshold
const M = TRUST_CONFIG.BAYESIAN_CONFIDENCE_M;

// Dimension weights (must sum to 1.0)
export const TRUST_DIMENSIONS = {
  spec_accuracy: { label: 'Spec Accuracy', weight: 0.30 },
  timeliness: { label: 'Timeliness', weight: 0.25 },
  communication: { label: 'Communication', weight: 0.15 },
  documentation: { label: 'Documentation', weight: 0.15 },
  dispute_history: { label: 'Dispute History', weight: 0.15 },
} as const;

export type TrustDimension = keyof typeof TRUST_DIMENSIONS;

// Badge tier thresholds based on completed deal count
export type BadgeTier = 'unrated' | 'bronze' | 'silver' | 'gold' | 'platinum';

export const BADGE_TIERS: { tier: BadgeTier; minDeals: number; label: string; color: string; bg: string; border: string }[] = [
  { tier: 'platinum', minDeals: 50, label: 'Platinum', color: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  { tier: 'gold', minDeals: 30, label: 'Gold', color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { tier: 'silver', minDeals: 15, label: 'Silver', color: 'text-gray-300', bg: 'bg-gray-500/10', border: 'border-gray-400/30' },
  { tier: 'bronze', minDeals: 5, label: 'Bronze', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  { tier: 'unrated', minDeals: 0, label: 'Unrated', color: 'text-gray-500', bg: 'bg-gray-800', border: 'border-gray-700' },
];

export function getBadgeTier(completedDeals: number): typeof BADGE_TIERS[number] {
  // BADGE_TIERS is sorted descending by minDeals, so first match wins
  return BADGE_TIERS.find((b) => completedDeals >= b.minDeals) ?? BADGE_TIERS[BADGE_TIERS.length - 1];
}

/**
 * Compute Bayesian weighted score for a single dimension.
 *
 * Formula: weighted_score = (n / (n + m)) * actual_avg + (m / (n + m)) * platform_avg
 *
 * n = number of ratings, m = confidence threshold (10)
 * When n is low, the score is pulled toward the platform average.
 * As n grows, the actual average dominates.
 */
export function bayesianScore(actualAvg: number, n: number, platformAvg: number): number {
  if (n === 0) return platformAvg;
  return (n / (n + M)) * actualAvg + (M / (n + M)) * platformAvg;
}

export interface DimensionScore {
  dimension: TrustDimension;
  label: string;
  weight: number;
  rawAvg: number;       // actual average from ratings (1-5)
  bayesianAvg: number;  // smoothed via Bayesian formula
  weighted: number;     // bayesianAvg * weight
}

export interface TrustScore {
  overall: number;        // weighted sum across dimensions (1-5 scale)
  overallPct: number;     // (overall / 5) * 100 for display
  dimensions: DimensionScore[];
  completedDeals: number;
  ratingCount: number;
  badge: typeof BADGE_TIERS[number];
}

/**
 * Compute a user's full trust score from their ratings and dispute history.
 *
 * @param ratings - All ratings where this user is rated_user_id
 * @param completedDeals - Count of deals with status completed/escrow_released
 * @param disputedDeals - Count of deals with status disputed where this user was a party
 * @param platformAvg - Platform-wide average score per dimension (defaults to 3.0)
 */
export function computeTrustScore(
  ratings: Rating[],
  completedDeals: number,
  disputedDeals: number,
  platformAvg: number = TRUST_CONFIG.PLATFORM_DEFAULT_SCORE,
): TrustScore {
  const n = ratings.length;

  // Compute raw averages per dimension from ratings
  const specAvg = n > 0 ? ratings.reduce((s, r) => s + r.spec_accuracy, 0) / n : 0;
  const timeAvg = n > 0 ? ratings.reduce((s, r) => s + r.timeliness, 0) / n : 0;
  const commAvg = n > 0 ? ratings.reduce((s, r) => s + r.communication, 0) / n : 0;
  const docsAvg = n > 0 ? ratings.reduce((s, r) => s + r.documentation, 0) / n : 0;

  // Dispute history: 5 = no disputes, decreases with dispute ratio
  // If 0 completed deals, default to platform average
  const disputeRatio = completedDeals > 0 ? disputedDeals / completedDeals : 0;
  const disputeScore = Math.max(TRUST_CONFIG.MIN_SCORE, TRUST_CONFIG.MAX_SCORE * (1 - disputeRatio * TRUST_CONFIG.DISPUTE_PENALTY_MULTIPLIER)); // each dispute costs 10% of max points

  const rawScores: Record<TrustDimension, number> = {
    spec_accuracy: specAvg,
    timeliness: timeAvg,
    communication: commAvg,
    documentation: docsAvg,
    dispute_history: disputeScore,
  };

  const dimensions: DimensionScore[] = (Object.entries(TRUST_DIMENSIONS) as [TrustDimension, { label: string; weight: number }][]).map(
    ([key, { label, weight }]) => {
      const rawAvg = rawScores[key];
      // For dispute_history we use completedDeals as n (it's derived from deals, not ratings)
      const effectiveN = key === 'dispute_history' ? completedDeals : n;
      const bayesianAvg = bayesianScore(rawAvg, effectiveN, platformAvg);
      return {
        dimension: key,
        label,
        weight,
        rawAvg: Math.round(rawAvg * 100) / 100,
        bayesianAvg: Math.round(bayesianAvg * 100) / 100,
        weighted: Math.round(bayesianAvg * weight * 100) / 100,
      };
    },
  );

  const overall = dimensions.reduce((sum, d) => sum + d.weighted, 0);
  const overallRounded = Math.round(overall * 100) / 100;

  return {
    overall: overallRounded,
    overallPct: Math.round((overallRounded / TRUST_CONFIG.MAX_SCORE) * 100),
    dimensions,
    completedDeals,
    ratingCount: n,
    badge: getBadgeTier(completedDeals),
  };
}
