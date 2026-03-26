import { describe, it, expect } from 'vitest';
import { optimizeRoutes, LOADING_PORTS, DESTINATIONS, COMMODITY_PORTS } from '../route-optimizer';
import type { OptimizeParams } from '../route-optimizer';

const baseParams: OptimizeParams = {
  commodity: 'chrome',
  buyPoint: 'mine_gate',
  sellPoint: 'cif',
  buyPrice: 151,
  volumeTonnes: 15000,
  indexCifPrice: 280,
};

describe('optimizeRoutes', () => {
  it('should return routes sorted by margin descending', () => {
    const result = optimizeRoutes(baseParams);
    expect(result.routes.length).toBeGreaterThan(0);

    for (let i = 1; i < result.routes.length; i++) {
      expect(result.routes[i - 1].margin).toBeGreaterThanOrEqual(result.routes[i].margin);
    }
  });

  it('should assign sequential ranks starting at 1', () => {
    const result = optimizeRoutes(baseParams);
    result.routes.forEach((route, i) => {
      expect(route.rank).toBe(i + 1);
    });
  });

  it('should have bestRoute with highest margin', () => {
    const result = optimizeRoutes(baseParams);
    expect(result.bestRoute).not.toBeNull();
    if (result.bestRoute && result.routes.length > 1) {
      expect(result.bestRoute.margin).toBeGreaterThanOrEqual(result.routes[1].margin);
    }
  });

  it('should have worstRoute with lowest margin', () => {
    const result = optimizeRoutes(baseParams);
    expect(result.worstRoute).not.toBeNull();
    if (result.worstRoute && result.routes.length > 1) {
      const secondLast = result.routes[result.routes.length - 2];
      expect(result.worstRoute.margin).toBeLessThanOrEqual(secondLast.margin);
    }
  });

  it('should filter ports by commodity', () => {
    // Chrome should only use Richards Bay, Durban, Maputo
    const result = optimizeRoutes(baseParams);
    const portNames = [...new Set(result.routes.map(r => r.loadingPort))];
    const chromePorts = COMMODITY_PORTS['chrome'];
    portNames.forEach(name => {
      expect(chromePorts).toContain(name);
    });
  });

  it('should use different ports for manganese vs chrome', () => {
    const chromeResult = optimizeRoutes(baseParams);
    const manganeseResult = optimizeRoutes({
      ...baseParams,
      commodity: 'manganese',
    });

    const chromePorts = [...new Set(chromeResult.routes.map(r => r.loadingPort))];
    const manganesePorts = [...new Set(manganeseResult.routes.map(r => r.loadingPort))];

    // Manganese should include Saldanha Bay, which chrome should not
    expect(manganesePorts).toContain('Saldanha Bay');
    expect(chromePorts).not.toContain('Saldanha Bay');
  });

  it('should not include destinations when selling FOB', () => {
    const result = optimizeRoutes({
      ...baseParams,
      sellPoint: 'fob',
    });

    expect(result.routes.length).toBeGreaterThan(0);
    result.routes.forEach(route => {
      expect(route.destination).toBe('N/A');
    });
  });

  it('should include destinations when selling CIF', () => {
    const result = optimizeRoutes(baseParams);
    const destinations = [...new Set(result.routes.map(r => r.destination))];
    expect(destinations.length).toBeGreaterThan(1);
    destinations.forEach(d => {
      expect(d).not.toBe('N/A');
    });
  });

  it('should include both rail and road when buying at mine_gate', () => {
    const result = optimizeRoutes(baseParams);
    const modes = [...new Set(result.routes.map(r => r.transportMode))];
    expect(modes).toContain('rail');
    expect(modes).toContain('road');
  });

  it('should only use rail when buying at port_gate', () => {
    const result = optimizeRoutes({
      ...baseParams,
      buyPoint: 'port_gate',
    });
    const modes = [...new Set(result.routes.map(r => r.transportMode))];
    expect(modes).toEqual(['rail']);
  });

  it('should have sell prices greater than buy price for all routes', () => {
    const result = optimizeRoutes(baseParams);
    result.routes.forEach(route => {
      expect(route.sellPrice).toBeGreaterThan(route.buyPrice);
    });
  });

  it('should compute average margin correctly', () => {
    const result = optimizeRoutes(baseParams);
    if (result.routes.length > 0) {
      const expected = result.routes.reduce((s, r) => s + r.margin, 0) / result.routes.length;
      expect(result.averageMargin).toBeCloseTo(expected, 1);
    }
  });

  it('should return empty routes when no index price is given and margin is needed', () => {
    const result = optimizeRoutes({
      ...baseParams,
      indexCifPrice: undefined,
    });
    // Without an index price, margin can't be computed so routes are filtered out
    expect(result.routes.length).toBe(0);
  });

  it('should include an optimizedAt timestamp', () => {
    const result = optimizeRoutes(baseParams);
    expect(result.optimizedAt).toBeTruthy();
    expect(new Date(result.optimizedAt).getTime()).not.toBeNaN();
  });

  it('should include metadata matching input params', () => {
    const result = optimizeRoutes(baseParams);
    expect(result.commodity).toBe('chrome');
    expect(result.buyPoint).toBe('mine_gate');
    expect(result.sellPoint).toBe('cif');
    expect(result.buyPrice).toBe(151);
    expect(result.volumeTonnes).toBe(15000);
  });
});
