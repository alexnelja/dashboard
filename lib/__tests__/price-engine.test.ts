import { describe, it, expect } from 'vitest';
import {
  estimatePrice,
  calcGradeAdjustment,
  calcFreshnessDiscount,
  calcConfidence,
  estimateFreight,
  daysBetween,
  FREIGHT_RATES,
  PORT_CHARGES,
} from '../price-engine';

describe('calcGradeAdjustment', () => {
  it('returns 1.0 for same grade', () => {
    expect(calcGradeAdjustment(42, 42)).toBe(1.0);
  });

  it('returns correct ratio for chrome 44 vs 42 index', () => {
    const adj = calcGradeAdjustment(44, 42);
    expect(adj).toBeCloseTo(44 / 42, 4);
  });

  it('clamps to max 1.3', () => {
    expect(calcGradeAdjustment(200, 100)).toBe(1.3);
  });

  it('clamps to min 0.8', () => {
    expect(calcGradeAdjustment(50, 100)).toBe(0.8);
  });

  it('returns 1.0 when indexGrade is 0', () => {
    expect(calcGradeAdjustment(44, 0)).toBe(1.0);
  });
});

describe('calcFreshnessDiscount', () => {
  it('returns 1.0 for today', () => {
    const today = '2026-03-25';
    expect(calcFreshnessDiscount(today, today)).toBe(1.0);
  });

  it('returns 0.99 for 10 days old', () => {
    expect(calcFreshnessDiscount('2026-03-15', '2026-03-25')).toBeCloseTo(0.99, 4);
  });

  it('returns 0.97 for 30 days old', () => {
    expect(calcFreshnessDiscount('2026-02-23', '2026-03-25')).toBeCloseTo(0.97, 4);
  });

  it('floors at 0.95 for very old data', () => {
    expect(calcFreshnessDiscount('2025-01-01', '2026-03-25')).toBe(0.95);
  });
});

describe('calcConfidence', () => {
  it('returns high for published index < 7 days', () => {
    expect(calcConfidence('2026-03-22', 'published', '2026-03-25')).toBe('high');
  });

  it('returns medium for published index 7-30 days', () => {
    expect(calcConfidence('2026-03-10', 'published', '2026-03-25')).toBe('medium');
  });

  it('returns low for published index > 30 days', () => {
    expect(calcConfidence('2026-01-01', 'published', '2026-03-25')).toBe('low');
  });

  it('returns medium for platform_avg < 30 days', () => {
    expect(calcConfidence('2026-03-20', 'platform_avg', '2026-03-25')).toBe('medium');
  });

  it('returns low for estimated regardless of date', () => {
    expect(calcConfidence('2026-03-25', 'estimated', '2026-03-25')).toBe('low');
  });
});

describe('estimateFreight', () => {
  it('calculates freight for Richards Bay to Qingdao', () => {
    // RB: -28.78, 32.09  Qingdao: 36.067, 120.383
    const result = estimateFreight(-28.78, 32.09, 36.067, 120.383, 50_000);
    // ~6300 nm great-circle * panamax rate 0.0024 = ~$15/t
    expect(result.freightPerTonne).toBeGreaterThan(10);
    expect(result.freightPerTonne).toBeLessThan(25);
    expect(result.vesselClass).toBe('panamax');
    expect(result.nauticalMiles).toBeGreaterThan(5_500);
  });

  it('selects capesize for 100k+ tonnes', () => {
    const result = estimateFreight(-28.78, 32.09, 36.067, 120.383, 150_000);
    expect(result.vesselClass).toBe('capesize');
  });

  it('selects supramax for < 50k tonnes', () => {
    const result = estimateFreight(-28.78, 32.09, 36.067, 120.383, 10_000);
    expect(result.vesselClass).toBe('supramax');
  });
});

describe('daysBetween', () => {
  it('returns 0 for same date', () => {
    expect(daysBetween('2026-03-25', '2026-03-25')).toBe(0);
  });

  it('returns correct day count', () => {
    expect(daysBetween('2026-03-20', '2026-03-25')).toBe(5);
  });

  it('handles reverse order', () => {
    expect(daysBetween('2026-03-25', '2026-03-20')).toBe(5);
  });
});

describe('estimatePrice', () => {
  const baseParams = {
    commodity: 'chrome' as const,
    subtype: 'chrome_met_lumpy',
    grade: 44,
    indexGrade: 42,
    indexPrice: 185,
    indexDate: '2026-03-24',
    incoterm: 'FOB',
    loadingPort: 'Richards Bay',
  };

  it('returns a valid PriceEstimate for FOB', () => {
    const result = estimatePrice(baseParams);
    expect(result.basePrice).toBe(185);
    expect(result.gradeAdjustment).toBeCloseTo(44 / 42, 3);
    expect(result.locationFactor).toBe(1);
    expect(result.confidence).toBeDefined();
    expect(result.estimatedPrice).toBeGreaterThan(185);
    expect(result.breakdown.length).toBeGreaterThanOrEqual(4);
  });

  it('adds freight for CIF with coordinates', () => {
    const result = estimatePrice({
      ...baseParams,
      incoterm: 'CIF',
      loadingPortLat: -28.78,
      loadingPortLng: 32.09,
      destinationLat: 36.067,
      destinationLng: 120.383,
      volumeTonnes: 50_000,
    });
    expect(result.locationFactor).toBeGreaterThan(1);
    expect(result.estimatedPrice).toBeGreaterThan(
      estimatePrice(baseParams).estimatedPrice,
    );
  });

  it('uses default freight estimate for CIF without coordinates', () => {
    const result = estimatePrice({
      ...baseParams,
      incoterm: 'CIF',
    });
    expect(result.locationFactor).toBeGreaterThan(1);
    // Should include a "Freight + Port (est.)" breakdown
    const freightLine = result.breakdown.find((b) => b.label.includes('Freight'));
    expect(freightLine).toBeDefined();
  });

  it('applies freshness discount for stale data', () => {
    const freshResult = estimatePrice({
      ...baseParams,
      indexDate: '2026-03-25',
    });
    const staleResult = estimatePrice({
      ...baseParams,
      indexDate: '2026-02-01',
    });
    expect(staleResult.freshnessDiscount).toBeLessThan(freshResult.freshnessDiscount);
    expect(staleResult.estimatedPrice).toBeLessThan(freshResult.estimatedPrice);
  });

  it('assigns low confidence for old index data', () => {
    const result = estimatePrice({
      ...baseParams,
      indexDate: '2025-12-01',
    });
    expect(result.confidence).toBe('low');
  });

  it('assigns high confidence for recent published data', () => {
    const result = estimatePrice({
      ...baseParams,
      indexDate: new Date().toISOString().slice(0, 10),
    });
    expect(result.confidence).toBe('high');
  });
});

describe('constants', () => {
  it('FREIGHT_RATES has expected vessel classes', () => {
    expect(FREIGHT_RATES.capesize.perNmPerTonne).toBe(0.0018);
    expect(FREIGHT_RATES.panamax.perNmPerTonne).toBe(0.0024);
    expect(FREIGHT_RATES.supramax.perNmPerTonne).toBe(0.0032);
  });

  it('PORT_CHARGES has SA ports', () => {
    expect(PORT_CHARGES['Richards Bay']).toBe(5.50);
    expect(PORT_CHARGES['Saldanha Bay']).toBe(5.50);
    expect(PORT_CHARGES['Maputo']).toBe(7.00);
    expect(PORT_CHARGES['Durban']).toBe(7.75);
    expect(PORT_CHARGES.default).toBe(6.00);
  });
});
