import { describe, it, expect } from 'vitest';
import { simulateDeal, STAGE_DURATIONS, CORRIDOR_POINTS, getValidSellPoints } from '../forward-waterfall';
import type { SimulationParams, TradePoint } from '../forward-waterfall';

// Standard test params: Chrome from Tharisa mine via Richards Bay to Qingdao
const BASE_PARAMS: SimulationParams = {
  buyPrice: 151,
  buyPoint: 'mine_gate',
  sellPoint: 'cif',
  commodity: 'chrome',
  volumeTonnes: 15000,
  loadingPort: 'Richards Bay',
  loadingPortCoords: { lat: -28.801, lng: 32.038 },
  destinationCoords: { lat: 36.067, lng: 120.383 },
  destinationName: 'Qingdao, China',
  mineCoords: { lat: -25.75, lng: 27.85 },
  mineName: 'Tharisa',
  transportMode: 'rail',
};

// Legacy params (backward compatibility) — uses mineGatePrice instead of buyPrice
const LEGACY_PARAMS: SimulationParams = {
  mineGatePrice: 151,
  commodity: 'chrome',
  volumeTonnes: 15000,
  loadingPort: 'Richards Bay',
  loadingPortCoords: { lat: -28.801, lng: 32.038 },
  destinationCoords: { lat: 36.067, lng: 120.383 },
  destinationName: 'Qingdao, China',
  mineCoords: { lat: -25.75, lng: 27.85 },
  mineName: 'Tharisa',
  transportMode: 'rail',
};

describe('simulateDeal — forward waterfall', () => {
  it('produces steps where subtotals always increase (forward direction)', () => {
    const result = simulateDeal(BASE_PARAMS);
    const costSteps = result.steps.filter(s => s.amount > 0 && !s.label.startsWith('='));
    for (const step of costSteps) {
      expect(step.amount).toBeGreaterThan(0);
    }
    const nonMarginSteps = result.steps.filter(s => !s.label.includes('MARGIN') && !s.label.includes('Index'));
    for (let i = 1; i < nonMarginSteps.length; i++) {
      expect(nonMarginSteps[i].subtotal).toBeGreaterThanOrEqual(nonMarginSteps[i - 1].subtotal);
    }
  });

  it('sell price is greater than buy price for mine_gate to cif', () => {
    const result = simulateDeal(BASE_PARAMS);
    expect(result.sellPrice).toBeGreaterThan(result.buyPrice);
    expect(result.fobPrice).toBeGreaterThan(result.buyPrice);
  });

  it('price levels follow correct order: mineGate < fob < cif (legacy fields)', () => {
    const result = simulateDeal(BASE_PARAMS);
    expect(result.mineGatePrice).toBeLessThan(result.fobPrice);
    expect(result.fobPrice).toBeLessThan(result.cifPrice);
  });

  it('calculates positive margin when index > delivered cost', () => {
    const result = simulateDeal({
      ...BASE_PARAMS,
      indexCifPrice: 300,
    });
    expect(result.margin).not.toBeNull();
    expect(result.margin!).toBeGreaterThan(0);
    expect(result.marginPct!).toBeGreaterThan(0);
    expect(result.totalProfit!).toBeGreaterThan(0);
  });

  it('calculates negative margin when index < delivered cost', () => {
    const result = simulateDeal({
      ...BASE_PARAMS,
      indexCifPrice: 100,
    });
    expect(result.margin).not.toBeNull();
    expect(result.margin!).toBeLessThan(0);
    expect(result.totalProfit!).toBeLessThan(0);
  });

  it('calculates breakeven buy price correctly', () => {
    const indexPrice = 250;
    const result = simulateDeal({
      ...BASE_PARAMS,
      indexCifPrice: indexPrice,
    });
    expect(result.breakevenBuyPrice).not.toBeNull();
    // At breakeven buy price, margin should be ~0
    const breakevenResult = simulateDeal({
      ...BASE_PARAMS,
      buyPrice: result.breakevenBuyPrice!,
      indexCifPrice: indexPrice,
    });
    expect(Math.abs(breakevenResult.margin!)).toBeLessThan(1);
  });

  it('includes financing costs when financing is provided', () => {
    const withoutFinancing = simulateDeal(BASE_PARAMS);
    const withFinancing = simulateDeal({
      ...BASE_PARAMS,
      financing: {
        lcCostPct: 1.0,
        interestRatePct: 11.5,
        creditInsurancePct: 0.5,
      },
    });
    expect(withFinancing.financing).not.toBeNull();
    expect(withFinancing.financing!.totalFinancingCost).toBeGreaterThan(0);
    expect(withFinancing.financing!.lcCost).toBeGreaterThan(0);
    expect(withFinancing.financing!.interestCost).toBeGreaterThan(0);
    expect(withFinancing.financing!.insuranceCost).toBeGreaterThan(0);
    expect(withFinancing.sellPrice).toBeGreaterThan(withoutFinancing.sellPrice);
  });

  it('estimates timeline correctly', () => {
    const result = simulateDeal(BASE_PARAMS);
    expect(result.estimatedDaysToDelivery).toBeGreaterThan(0);
    const minDays = STAGE_DURATIONS.mine_to_port_rail + STAGE_DURATIONS.port_staging + STAGE_DURATIONS.discharge_and_customs;
    expect(result.estimatedDaysToDelivery).toBeGreaterThanOrEqual(minDays);
  });

  it('road transport takes less inland time than rail', () => {
    const railResult = simulateDeal({ ...BASE_PARAMS, transportMode: 'rail' });
    const roadResult = simulateDeal({ ...BASE_PARAMS, transportMode: 'road' });
    expect(roadResult.estimatedDaysToDelivery).toBeLessThan(railResult.estimatedDaysToDelivery);
  });

  it('road transport costs more per tonne-km than rail', () => {
    const railResult = simulateDeal({ ...BASE_PARAMS, transportMode: 'rail' });
    const roadResult = simulateDeal({ ...BASE_PARAMS, transportMode: 'road' });
    const railInland = railResult.steps.find(s => s.label.includes('Inland rail'));
    const roadInland = roadResult.steps.find(s => s.label.includes('Inland road'));
    expect(railInland).toBeDefined();
    expect(roadInland).toBeDefined();
    expect(roadInland!.amount).toBeGreaterThan(railInland!.amount);
  });

  it('returns null margin when no index price provided', () => {
    const result = simulateDeal(BASE_PARAMS);
    expect(result.margin).toBeNull();
    expect(result.marginPct).toBeNull();
    expect(result.totalProfit).toBeNull();
    expect(result.breakevenBuyPrice).toBeNull();
  });

  it('includes port costs for Richards Bay', () => {
    const result = simulateDeal(BASE_PARAMS);
    const portSteps = result.steps.filter(s => s.category === 'port');
    expect(portSteps.length).toBeGreaterThanOrEqual(7);
  });

  it('includes mineral royalty tax', () => {
    const result = simulateDeal(BASE_PARAMS);
    const royaltyStep = result.steps.find(s => s.label === 'Mineral royalty');
    expect(royaltyStep).toBeDefined();
    expect(royaltyStep!.amount).toBeGreaterThan(0);
    expect(royaltyStep!.category).toBe('tax');
  });

  it('skips inland transport when no mine coords provided', () => {
    const result = simulateDeal({
      ...BASE_PARAMS,
      mineCoords: undefined,
      mineName: undefined,
    });
    const inlandStep = result.steps.find(s => s.label.includes('Inland'));
    expect(inlandStep).toBeUndefined();
  });
});

describe('simulateDeal — backward compatibility', () => {
  it('works with legacy mineGatePrice param', () => {
    const result = simulateDeal(LEGACY_PARAMS);
    expect(result.buyPoint).toBe('mine_gate');
    expect(result.sellPoint).toBe('cif');
    expect(result.buyPrice).toBe(151);
    expect(result.mineGatePrice).toBe(151);
    expect(result.sellPrice).toBeGreaterThan(151);
  });

  it('legacy fields match new fields for default buy/sell points', () => {
    const result = simulateDeal(BASE_PARAMS);
    expect(result.mineGatePrice).toBe(result.buyPrice);
    expect(result.totalDeliveredCost).toBe(result.sellPrice);
  });
});

describe('simulateDeal — buy/sell point variations', () => {
  it('FOB to CIF: only includes ocean freight + insurance', () => {
    const result = simulateDeal({
      ...BASE_PARAMS,
      buyPoint: 'fob',
      sellPoint: 'cif',
      buyPrice: 200,
      mineCoords: undefined,
    });

    expect(result.buyPoint).toBe('fob');
    expect(result.sellPoint).toBe('cif');
    expect(result.buyPrice).toBe(200);
    expect(result.sellPrice).toBeGreaterThan(200);

    // Should NOT include inland, port, or mine costs
    const inlandSteps = result.steps.filter(s => s.category === 'inland');
    const portSteps = result.steps.filter(s => s.category === 'port');
    const taxSteps = result.steps.filter(s => s.category === 'tax');
    expect(inlandSteps).toHaveLength(0);
    expect(portSteps).toHaveLength(0);
    expect(taxSteps).toHaveLength(0);

    // SHOULD include ocean freight and insurance
    const freightSteps = result.steps.filter(s => s.category === 'freight');
    expect(freightSteps.length).toBeGreaterThanOrEqual(2); // ocean freight + discharge + insurance
  });

  it('FOB to FOB is not valid (sell must be after buy)', () => {
    // getValidSellPoints should not include the buy point itself
    const valid = getValidSellPoints('fob');
    expect(valid).not.toContain('fob');
    expect(valid).toContain('cfr');
    expect(valid).toContain('cif');
  });

  it('mine_gate to FOB: includes inland + port but no ocean', () => {
    const result = simulateDeal({
      ...BASE_PARAMS,
      buyPoint: 'mine_gate',
      sellPoint: 'fob',
      buyPrice: 151,
    });

    expect(result.buyPoint).toBe('mine_gate');
    expect(result.sellPoint).toBe('fob');

    // Should include inland transport
    const inlandSteps = result.steps.filter(s => s.category === 'inland');
    expect(inlandSteps.length).toBeGreaterThan(0);

    // Should include port costs
    const portSteps = result.steps.filter(s => s.category === 'port');
    expect(portSteps.length).toBeGreaterThan(0);

    // Should NOT include ocean freight
    const oceanStep = result.steps.find(s => s.label === 'Ocean freight');
    expect(oceanStep).toBeUndefined();
  });

  it('port_gate to FOB: includes only port-to-FOB costs', () => {
    const result = simulateDeal({
      ...BASE_PARAMS,
      buyPoint: 'port_gate',
      sellPoint: 'fob',
      buyPrice: 180,
      mineCoords: undefined,
    });

    expect(result.buyPoint).toBe('port_gate');
    expect(result.sellPoint).toBe('fob');
    expect(result.buyPrice).toBe(180);

    // No inland transport or crosshaul
    const inlandSteps = result.steps.filter(s => s.category === 'inland');
    expect(inlandSteps).toHaveLength(0);
    const crosshaulStep = result.steps.find(s => s.label === 'Crosshaul');
    expect(crosshaulStep).toBeUndefined();

    // Should include stevedoring, handling, etc.
    const stevedoringStep = result.steps.find(s => s.label === 'Stevedoring');
    expect(stevedoringStep).toBeDefined();
  });

  it('FOB to CFR: includes ocean freight and discharge but not insurance', () => {
    const result = simulateDeal({
      ...BASE_PARAMS,
      buyPoint: 'fob',
      sellPoint: 'cfr',
      buyPrice: 200,
      mineCoords: undefined,
    });

    expect(result.buyPoint).toBe('fob');
    expect(result.sellPoint).toBe('cfr');

    // Should include ocean freight and discharge
    const freightStep = result.steps.find(s => s.label === 'Ocean freight');
    expect(freightStep).toBeDefined();
    const dischargeStep = result.steps.find(s => s.label === 'Discharge port fees');
    expect(dischargeStep).toBeDefined();

    // Should NOT include marine insurance (that's cfr -> cif)
    const insuranceStep = result.steps.find(s => s.label === 'Marine insurance');
    expect(insuranceStep).toBeUndefined();
  });

  it('CFR to CIF: only includes insurance', () => {
    const result = simulateDeal({
      ...BASE_PARAMS,
      buyPoint: 'cfr',
      sellPoint: 'cif',
      buyPrice: 280,
      mineCoords: undefined,
    });

    expect(result.buyPoint).toBe('cfr');
    expect(result.sellPoint).toBe('cif');
    expect(result.buyPrice).toBe(280);

    // Should only have insurance as a non-price, non-finance step
    const costSteps = result.steps.filter(s => s.amount > 0 && !s.label.startsWith('=') && s.category !== 'finance');
    // The buy price step + marine insurance
    expect(costSteps.length).toBe(2); // buy price + insurance
    const insuranceStep = result.steps.find(s => s.label === 'Marine insurance');
    expect(insuranceStep).toBeDefined();
    expect(insuranceStep!.amount).toBeGreaterThan(0);
  });

  it('sell at FOB compares against FOB index (derived from CIF)', () => {
    const indexCif = 300;
    const result = simulateDeal({
      ...BASE_PARAMS,
      buyPoint: 'mine_gate',
      sellPoint: 'fob',
      buyPrice: 151,
      indexCifPrice: indexCif,
    });

    expect(result.indexSellPrice).not.toBeNull();
    // FOB index should be less than CIF index
    expect(result.indexSellPrice!).toBeLessThan(indexCif);
    expect(result.margin).not.toBeNull();
  });

  it('sell at CFR compares against CFR index (derived from CIF)', () => {
    const indexCif = 300;
    const result = simulateDeal({
      ...BASE_PARAMS,
      buyPoint: 'fob',
      sellPoint: 'cfr',
      buyPrice: 200,
      indexCifPrice: indexCif,
    });

    expect(result.indexSellPrice).not.toBeNull();
    // CFR index should be less than CIF but close
    expect(result.indexSellPrice!).toBeLessThan(indexCif);
    expect(result.indexSellPrice!).toBeGreaterThan(indexCif * 0.95);
  });

  it('sell at CIF uses CIF index directly', () => {
    const indexCif = 300;
    const result = simulateDeal({
      ...BASE_PARAMS,
      indexCifPrice: indexCif,
    });

    expect(result.indexSellPrice).toBe(indexCif);
  });
});

describe('simulateDeal — corridor visualization', () => {
  it('returns corridor array with all 6 points', () => {
    const result = simulateDeal(BASE_PARAMS);
    expect(result.corridor).toBeDefined();
    expect(result.corridor).toHaveLength(6);
  });

  it('marks active points correctly for mine_gate to cif', () => {
    const result = simulateDeal(BASE_PARAMS);
    const activePoints = result.corridor.filter(p => p.isActive);
    expect(activePoints.length).toBe(6); // all active for full corridor
  });

  it('marks only relevant points active for FOB to CIF', () => {
    const result = simulateDeal({
      ...BASE_PARAMS,
      buyPoint: 'fob',
      sellPoint: 'cif',
      buyPrice: 200,
      mineCoords: undefined,
    });

    const activePoints = result.corridor.filter(p => p.isActive);
    const activeKeys = activePoints.map(p => p.point);
    expect(activeKeys).toContain('fob');
    expect(activeKeys).toContain('cfr');
    expect(activeKeys).toContain('cif');
    expect(activeKeys).not.toContain('mine_gate');
    expect(activeKeys).not.toContain('stockpile');
    expect(activeKeys).not.toContain('port_gate');
  });

  it('buy point has non-zero price in corridor', () => {
    const result = simulateDeal({
      ...BASE_PARAMS,
      buyPoint: 'fob',
      sellPoint: 'cif',
      buyPrice: 200,
      mineCoords: undefined,
    });

    const fobPoint = result.corridor.find(p => p.point === 'fob');
    expect(fobPoint).toBeDefined();
    expect(fobPoint!.price).toBe(200);
  });
});

describe('getValidSellPoints', () => {
  it('mine_gate can sell at all subsequent points', () => {
    const valid = getValidSellPoints('mine_gate');
    expect(valid).toEqual(['stockpile', 'port_gate', 'fob', 'cfr', 'cif']);
  });

  it('fob can sell at cfr or cif', () => {
    const valid = getValidSellPoints('fob');
    expect(valid).toEqual(['cfr', 'cif']);
  });

  it('cfr can only sell at cif', () => {
    const valid = getValidSellPoints('cfr');
    expect(valid).toEqual(['cif']);
  });

  it('cif has no valid sell points', () => {
    const valid = getValidSellPoints('cif');
    expect(valid).toHaveLength(0);
  });
});

describe('simulateDeal — timeline for partial corridors', () => {
  it('FOB to CIF has shorter timeline than mine to CIF', () => {
    const fullResult = simulateDeal(BASE_PARAMS);
    const fobResult = simulateDeal({
      ...BASE_PARAMS,
      buyPoint: 'fob',
      sellPoint: 'cif',
      buyPrice: 200,
      mineCoords: undefined,
    });

    expect(fobResult.estimatedDaysToDelivery).toBeLessThan(fullResult.estimatedDaysToDelivery);
  });

  it('mine_gate to FOB has no ocean transit days', () => {
    const result = simulateDeal({
      ...BASE_PARAMS,
      buyPoint: 'mine_gate',
      sellPoint: 'fob',
      buyPrice: 151,
    });

    // Should be inland + port staging only
    const maxExpected = STAGE_DURATIONS.mine_to_port_rail + STAGE_DURATIONS.port_staging + 1;
    expect(result.estimatedDaysToDelivery).toBeLessThanOrEqual(maxExpected);
  });
});
