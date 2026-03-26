import { simulateDeal, type TradePoint, type SimulationParams, type DealSimulation } from './forward-waterfall';
import type { GeoPoint, CommodityType } from './types';

export interface RouteOption {
  rank: number;
  loadingPort: string;
  destination: string;
  transportMode: 'rail' | 'road';
  buyPoint: TradePoint;
  sellPoint: TradePoint;
  buyPrice: number;
  sellPrice: number;           // Your total cost at sell point
  indexSellPrice: number;      // Market price at sell point
  margin: number;              // $/t
  marginPct: number;
  totalProfit: number;         // margin x volume
  freightCost: number;         // Ocean freight $/t
  portCosts: number;           // All port costs $/t
  inlandCost: number;          // Inland transport $/t
  transitDays: number;
  distanceNm: number;
  co2PerTonne: number;
}

export interface OptimizationResult {
  commodity: CommodityType;
  buyPoint: TradePoint;
  sellPoint: TradePoint;
  buyPrice: number;
  volumeTonnes: number;
  routes: RouteOption[];
  bestRoute: RouteOption | null;
  worstRoute: RouteOption | null;
  averageMargin: number;
  optimizedAt: string;
}

// SA loading ports
const LOADING_PORTS: { name: string; coords: GeoPoint }[] = [
  { name: 'Richards Bay', coords: { lat: -28.801, lng: 32.038 } },
  { name: 'Saldanha Bay', coords: { lat: -33.004, lng: 17.938 } },
  { name: 'Durban', coords: { lat: -29.868, lng: 31.048 } },
  { name: 'Port Elizabeth', coords: { lat: -33.768, lng: 25.629 } },
  { name: 'Maputo', coords: { lat: -25.969, lng: 32.573 } },
];

// Key global destinations for bulk minerals
const DESTINATIONS: { name: string; coords: GeoPoint; region: string }[] = [
  { name: 'Qingdao, China', coords: { lat: 36.067, lng: 120.383 }, region: 'East Asia' },
  { name: 'Qinzhou, China', coords: { lat: 21.683, lng: 108.647 }, region: 'East Asia' },
  { name: 'Shanghai, China', coords: { lat: 31.230, lng: 121.474 }, region: 'East Asia' },
  { name: 'Mumbai, India', coords: { lat: 18.940, lng: 72.840 }, region: 'South Asia' },
  { name: 'Visakhapatnam, India', coords: { lat: 17.686, lng: 83.218 }, region: 'South Asia' },
  { name: 'Rotterdam, Netherlands', coords: { lat: 51.953, lng: 4.133 }, region: 'Europe' },
  { name: 'Kashima, Japan', coords: { lat: 35.900, lng: 140.620 }, region: 'East Asia' },
  { name: 'Singapore', coords: { lat: 1.264, lng: 103.822 }, region: 'Southeast Asia' },
  { name: 'Iskenderun, Turkey', coords: { lat: 36.585, lng: 36.175 }, region: 'Middle East' },
];

// Commodity-specific preferred ports (not all ports handle all commodities)
const COMMODITY_PORTS: Record<string, string[]> = {
  chrome: ['Richards Bay', 'Durban', 'Maputo'],
  manganese: ['Saldanha Bay', 'Port Elizabeth', 'Durban'],
  iron_ore: ['Saldanha Bay', 'Richards Bay'],
  coal: ['Richards Bay'],
  platinum: ['Durban', 'Richards Bay'],
  gold: ['Durban'],
  copper: ['Durban', 'Richards Bay'],
  vanadium: ['Durban', 'Richards Bay'],
  titanium: ['Richards Bay'],
  aggregates: ['Durban', 'Richards Bay', 'Port Elizabeth'],
};

export interface OptimizeParams {
  commodity: CommodityType;
  buyPoint: TradePoint;
  sellPoint: TradePoint;
  buyPrice: number;
  volumeTonnes: number;
  mineCoords?: GeoPoint;
  mineName?: string;
  indexCifPrice?: number;
  fxHedge?: string;
  hedgeCommodityPrice?: boolean;
  dealCurrency?: string;
}

export function optimizeRoutes(params: OptimizeParams): OptimizationResult {
  const {
    commodity, buyPoint, sellPoint, buyPrice, volumeTonnes,
    mineCoords, mineName, indexCifPrice,
    fxHedge = 'spot', hedgeCommodityPrice = false, dealCurrency = 'USD',
  } = params;

  // Filter to commodity-relevant ports
  const relevantPortNames = COMMODITY_PORTS[commodity] || LOADING_PORTS.map(p => p.name);
  const ports = LOADING_PORTS.filter(p => relevantPortNames.includes(p.name));

  // If selling FOB or earlier, destinations don't matter
  const needsDestination = ['cfr', 'cif'].includes(sellPoint);
  const destinations = needsDestination ? DESTINATIONS : [{ name: 'N/A', coords: { lat: 0, lng: 0 }, region: '' }];

  // Only use transport modes if buying at mine gate or stockpile
  const transportModes: ('rail' | 'road')[] = ['mine_gate', 'stockpile'].includes(buyPoint) ? ['rail', 'road'] : ['rail'];

  const routes: RouteOption[] = [];

  for (const port of ports) {
    for (const dest of destinations) {
      for (const mode of transportModes) {
        try {
          const sim = simulateDeal({
            buyPoint,
            sellPoint,
            buyPrice,
            commodity,
            volumeTonnes,
            loadingPort: port.name,
            loadingPortCoords: port.coords,
            destinationCoords: dest.coords,
            destinationName: dest.name,
            mineCoords,
            mineName,
            transportMode: mode,
            indexCifPrice,
            fxHedge: fxHedge as SimulationParams['fxHedge'],
            hedgeCommodityPrice,
            dealCurrency,
          });

          if (sim.margin === null && sim.indexSellPrice === null) continue;

          // Extract cost components from steps
          const inlandSteps = sim.steps.filter(s => s.category === 'inland');
          const portSteps = sim.steps.filter(s => s.category === 'port');
          const freightSteps = sim.steps.filter(s => s.category === 'freight');

          routes.push({
            rank: 0,
            loadingPort: port.name,
            destination: needsDestination ? dest.name : 'N/A',
            transportMode: mode,
            buyPoint,
            sellPoint,
            buyPrice,
            sellPrice: sim.sellPrice,
            indexSellPrice: sim.indexSellPrice || 0,
            margin: sim.margin || 0,
            marginPct: sim.marginPct || 0,
            totalProfit: sim.totalProfit || 0,
            freightCost: freightSteps.reduce((s, step) => s + step.amount, 0),
            portCosts: portSteps.reduce((s, step) => s + step.amount, 0),
            inlandCost: inlandSteps.reduce((s, step) => s + step.amount, 0),
            transitDays: sim.estimatedDaysToDelivery,
            distanceNm: 0,
            co2PerTonne: 0,
          });
        } catch {
          // Skip failed simulations (e.g., searoute-js can't find path)
        }
      }
    }
  }

  // Sort by margin (best first)
  routes.sort((a, b) => b.margin - a.margin);

  // Assign ranks
  routes.forEach((r, i) => { r.rank = i + 1; });

  const avgMargin = routes.length > 0
    ? routes.reduce((s, r) => s + r.margin, 0) / routes.length
    : 0;

  return {
    commodity,
    buyPoint,
    sellPoint,
    buyPrice,
    volumeTonnes,
    routes,
    bestRoute: routes[0] || null,
    worstRoute: routes[routes.length - 1] || null,
    averageMargin: Math.round(avgMargin * 100) / 100,
    optimizedAt: new Date().toISOString(),
  };
}

// Export constants for UI
export { LOADING_PORTS, DESTINATIONS, COMMODITY_PORTS };
