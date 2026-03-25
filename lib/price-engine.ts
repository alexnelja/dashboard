import type { CommodityType } from './types';
import { haversineDistance } from './distance';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PriceEstimate {
  basePrice: number;
  basePriceSource: string;
  basePriceDate: string;
  gradeAdjustment: number;
  locationFactor: number;
  freshnessDiscount: number;
  estimatedPrice: number;
  confidence: 'high' | 'medium' | 'low';
  breakdown: {
    label: string;
    value: number;
    note: string;
  }[];
}

export interface PriceEstimateParams {
  commodity: CommodityType;
  subtype: string;
  grade: number;
  indexGrade: number;
  indexPrice: number;
  indexDate: string;
  incoterm: string;
  loadingPort: string;
  destinationLat?: number;
  destinationLng?: number;
  loadingPortLat?: number;
  loadingPortLng?: number;
  volumeTonnes?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Freight rate estimates ($/t per nautical mile) by vessel class */
export const FREIGHT_RATES = {
  capesize: { perNmPerTonne: 0.0018 },
  panamax: { perNmPerTonne: 0.0024 },
  supramax: { perNmPerTonne: 0.0032 },
} as const;

/** Port handling charges ($/t, all-in estimate) */
export const PORT_CHARGES: Record<string, number> = {
  'Richards Bay': 5.50,
  'Saldanha Bay': 5.50,
  'Maputo': 7.00,
  'Durban': 7.75,
  'Port Elizabeth': 6.50,
  default: 6.00,
};

// Grade adjustment clamp range
const GRADE_ADJ_MIN = 0.8;
const GRADE_ADJ_MAX = 1.3;

// Freshness decay: 0.1% per day, floor at 0.95
const FRESHNESS_DECAY_PER_DAY = 0.001;
const FRESHNESS_FLOOR = 0.95;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Calculate the number of days between two ISO date strings */
export function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.abs(a - b) / (1000 * 60 * 60 * 24);
}

/** Calculate grade adjustment multiplier, clamped to [0.8, 1.3] */
export function calcGradeAdjustment(actualGrade: number, indexGrade: number): number {
  if (indexGrade <= 0) return 1.0;
  const raw = actualGrade / indexGrade;
  return Math.min(GRADE_ADJ_MAX, Math.max(GRADE_ADJ_MIN, raw));
}

/** Select vessel class based on cargo volume */
function selectVesselClass(volumeTonnes: number): keyof typeof FREIGHT_RATES {
  if (volumeTonnes >= 100_000) return 'capesize';
  if (volumeTonnes >= 50_000) return 'panamax';
  return 'supramax';
}

/** Estimate freight cost ($/t) between two coordinates using Haversine distance */
export function estimateFreight(
  loadingLat: number,
  loadingLng: number,
  destLat: number,
  destLng: number,
  volumeTonnes: number,
): { freightPerTonne: number; vesselClass: string; nauticalMiles: number } {
  const nm = haversineDistance(loadingLat, loadingLng, destLat, destLng);
  const vesselClass = selectVesselClass(volumeTonnes);
  const rate = FREIGHT_RATES[vesselClass].perNmPerTonne;
  const freightPerTonne = nm * rate;
  return { freightPerTonne, vesselClass, nauticalMiles: Math.round(nm) };
}

/** Calculate freshness discount: 0.1% per day since index date, min 0.95 */
export function calcFreshnessDiscount(indexDate: string, now?: string): number {
  const today = now ?? new Date().toISOString().slice(0, 10);
  const days = daysBetween(indexDate, today);
  return Math.max(FRESHNESS_FLOOR, 1 - days * FRESHNESS_DECAY_PER_DAY);
}

/** Determine confidence level based on data freshness and index type */
export function calcConfidence(
  indexDate: string,
  priceIndexType: 'published' | 'platform_avg' | 'estimated',
  now?: string,
): 'high' | 'medium' | 'low' {
  const today = now ?? new Date().toISOString().slice(0, 10);
  const days = daysBetween(indexDate, today);

  if (priceIndexType === 'estimated') return 'low';
  if (days < 7 && priceIndexType === 'published') return 'high';
  if (days < 30) return 'medium';
  return 'low';
}

// ─── Main estimation function ────────────────────────────────────────────────

export function estimatePrice(params: PriceEstimateParams): PriceEstimate {
  const {
    indexPrice,
    indexDate,
    grade,
    indexGrade,
    incoterm,
    loadingPort,
    destinationLat,
    destinationLng,
    loadingPortLat,
    loadingPortLng,
    volumeTonnes = 10_000,
  } = params;

  const breakdown: PriceEstimate['breakdown'] = [];

  // 1. Base price
  breakdown.push({
    label: 'Index Price',
    value: indexPrice,
    note: `As of ${indexDate}`,
  });

  // 2. Grade adjustment
  const gradeAdj = calcGradeAdjustment(grade, indexGrade);
  const gradeAdjustedPrice = indexPrice * gradeAdj;
  breakdown.push({
    label: 'Grade Adjustment',
    value: round(gradeAdj, 4),
    note: `${grade} vs index ${indexGrade} (x${round(gradeAdj, 3)})`,
  });

  // 3. Location factor (freight for CIF/CFR)
  let locationFactor = 1.0;
  let freightPerTonne = 0;
  const portCharge = PORT_CHARGES[loadingPort] ?? PORT_CHARGES.default;
  const isCifCfr = incoterm === 'CIF' || incoterm === 'CFR';

  if (
    isCifCfr &&
    destinationLat != null &&
    destinationLng != null &&
    loadingPortLat != null &&
    loadingPortLng != null
  ) {
    const freight = estimateFreight(
      loadingPortLat,
      loadingPortLng,
      destinationLat,
      destinationLng,
      volumeTonnes,
    );
    freightPerTonne = freight.freightPerTonne + portCharge;
    locationFactor = 1 + freightPerTonne / gradeAdjustedPrice;
    breakdown.push({
      label: 'Freight + Port',
      value: round(freightPerTonne, 2),
      note: `${freight.vesselClass}, ${freight.nauticalMiles} nm + $${portCharge}/t port`,
    });
  } else if (isCifCfr) {
    // CIF/CFR requested but no destination coordinates — use a rough estimate
    freightPerTonne = 15 + portCharge; // default ~$15/t freight
    locationFactor = 1 + freightPerTonne / gradeAdjustedPrice;
    breakdown.push({
      label: 'Freight + Port (est.)',
      value: round(freightPerTonne, 2),
      note: `Default estimate, no destination provided`,
    });
  } else {
    // FOB — add port handling only
    breakdown.push({
      label: 'Port Handling',
      value: portCharge,
      note: `${loadingPort || 'Default'} FOB`,
    });
  }

  // 4. Freshness discount
  const freshness = calcFreshnessDiscount(indexDate);
  breakdown.push({
    label: 'Freshness Discount',
    value: round(freshness, 4),
    note: `Index age: ${Math.round(daysBetween(indexDate, new Date().toISOString().slice(0, 10)))} days`,
  });

  // 5. Calculate final price
  let estimatedPrice: number;
  if (isCifCfr) {
    estimatedPrice = gradeAdjustedPrice * locationFactor * freshness;
  } else {
    // FOB: the index might already be CIF — we do not subtract freight here,
    // just apply grade and freshness. Port handling is informational.
    estimatedPrice = gradeAdjustedPrice * freshness;
  }

  // 6. Confidence
  // Infer index type from subtype lookup (simplified — caller can enhance)
  const confidence = calcConfidence(indexDate, 'published');

  breakdown.push({
    label: 'Estimated Price',
    value: round(estimatedPrice, 2),
    note: `${incoterm} ${loadingPort || ''}`.trim(),
  });

  return {
    basePrice: indexPrice,
    basePriceSource: 'Index',
    basePriceDate: indexDate,
    gradeAdjustment: round(gradeAdj, 4),
    locationFactor: round(locationFactor, 4),
    freshnessDiscount: round(freshness, 4),
    estimatedPrice: round(estimatedPrice, 2),
    confidence,
    breakdown,
  };
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
