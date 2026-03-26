'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MineWithGeo, GeoPoint, CommodityType } from '@/lib/types';
import { COMMODITY_CONFIG } from '@/lib/types';
import type { DealSimulation, TradePoint } from '@/lib/forward-waterfall';
import { CORRIDOR_POINTS, getValidSellPoints } from '@/lib/forward-waterfall';
import type { FxHedgeType } from '@/lib/price-waterfall';
import { COMMON_DESTINATIONS } from '@/lib/distance';

interface PortOption {
  id: string;
  name: string;
  location: GeoPoint;
  country: string;
}

interface SimulatorClientProps {
  mines: MineWithGeo[];
  loadingPorts: PortOption[];
  destinationPorts: PortOption[];
  indexPrices: Record<string, number>;
}

const FX_HEDGE_OPTIONS: { value: FxHedgeType; label: string }[] = [
  { value: 'spot', label: 'No hedge (spot)' },
  { value: 'forward_3m', label: '3m forward' },
  { value: 'forward_6m', label: '6m forward' },
  { value: 'forward_12m', label: '12m forward' },
  { value: 'option_3m', label: '3m option' },
  { value: 'option_6m', label: '6m option' },
  { value: 'collar_3m', label: '3m zero-cost collar' },
];

const COMMODITIES = Object.entries(COMMODITY_CONFIG).map(([key, config]) => ({
  value: key as CommodityType,
  label: config.label,
}));

// Buy points: all points except cif (can't sell from cif, no corridor after)
const BUY_POINT_OPTIONS = CORRIDOR_POINTS.filter(p => p.key !== 'cif');

// Fallback destinations when no destination ports in DB
const FALLBACK_DESTINATIONS: PortOption[] = COMMON_DESTINATIONS.map((d, i) => ({
  id: `dest-${i}`,
  name: d.name,
  location: { lat: d.lat, lng: d.lng },
  country: d.name.split(', ').pop() || '',
}));

// SA loading port fallbacks
const FALLBACK_LOADING_PORTS: PortOption[] = [
  { id: 'rb', name: 'Richards Bay', location: { lat: -28.801, lng: 32.038 }, country: 'South Africa' },
  { id: 'sb', name: 'Saldanha Bay', location: { lat: -33.004, lng: 17.938 }, country: 'South Africa' },
  { id: 'dbn', name: 'Durban', location: { lat: -29.868, lng: 31.048 }, country: 'South Africa' },
  { id: 'pe', name: 'Port Elizabeth', location: { lat: -33.756, lng: 25.627 }, country: 'South Africa' },
  { id: 'map', name: 'Maputo', location: { lat: -25.966, lng: 32.589 }, country: 'Mozambique' },
];

export function SimulatorClient({ mines, loadingPorts, destinationPorts, indexPrices }: SimulatorClientProps) {
  // Form state
  const [commodity, setCommodity] = useState<CommodityType>('chrome');
  const [buyPoint, setBuyPoint] = useState<TradePoint>('mine_gate');
  const [sellPoint, setSellPoint] = useState<TradePoint>('cif');
  const [buyPrice, setBuyPrice] = useState(151);
  const [volume, setVolume] = useState(15000);
  const [selectedMineId, setSelectedMineId] = useState('');
  const [selectedPortName, setSelectedPortName] = useState('Richards Bay');
  const [selectedDestName, setSelectedDestName] = useState('Qingdao, China');
  const [transportMode, setTransportMode] = useState<'rail' | 'road'>('rail');
  const [fxHedge, setFxHedge] = useState<FxHedgeType>('spot');
  const [hedgeCommodity, setHedgeCommodity] = useState(false);
  const [lcCostPct, setLcCostPct] = useState(1.0);
  const [interestRatePct, setInterestRatePct] = useState(11.5);
  const [creditInsurancePct, setCreditInsurancePct] = useState(0.5);
  const [financingEnabled, setFinancingEnabled] = useState(false);
  const [indexPriceOverride, setIndexPriceOverride] = useState<string>('');

  // Result state
  const [simulation, setSimulation] = useState<DealSimulation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve ports/destinations with fallbacks
  const effectiveLoadingPorts = loadingPorts.length > 0 ? loadingPorts : FALLBACK_LOADING_PORTS;
  const effectiveDestinations = destinationPorts.length > 0 ? destinationPorts : FALLBACK_DESTINATIONS;

  // Filter mines by commodity
  const filteredMines = mines.filter(m => m.commodities?.includes(commodity));

  // Current selections
  const selectedPort = effectiveLoadingPorts.find(p => p.name === selectedPortName) || effectiveLoadingPorts[0];
  const selectedDest = effectiveDestinations.find(d => d.name === selectedDestName) || effectiveDestinations[0];
  const selectedMine = filteredMines.find(m => m.id === selectedMineId);

  const currentIndexPrice = indexPriceOverride ? parseFloat(indexPriceOverride) : (indexPrices[commodity] || 0);

  // Valid sell points based on current buy point
  const validSellPoints = getValidSellPoints(buyPoint);
  const sellPointOptions = CORRIDOR_POINTS.filter(p => validSellPoints.includes(p.key));

  // Ensure sellPoint is still valid when buyPoint changes
  useEffect(() => {
    if (!validSellPoints.includes(sellPoint)) {
      setSellPoint(validSellPoints[validSellPoints.length - 1] || 'cif');
    }
  }, [buyPoint, sellPoint, validSellPoints]);

  // Determine if inland transport fields are needed
  const needsInland = buyPoint === 'mine_gate';
  const needsOcean = sellPoint === 'cfr' || sellPoint === 'cif';

  const runSimulation = useCallback(async () => {
    if (!selectedPort || !selectedDest || buyPrice <= 0) return;

    setLoading(true);
    setError(null);

    const qp = new URLSearchParams({
      commodity,
      buy_point: buyPoint,
      sell_point: sellPoint,
      buy_price: buyPrice.toString(),
      volume: volume.toString(),
      loading_port: selectedPort.name,
      loading_lat: selectedPort.location.lat.toString(),
      loading_lng: selectedPort.location.lng.toString(),
      dest_lat: selectedDest.location.lat.toString(),
      dest_lng: selectedDest.location.lng.toString(),
      destination_name: selectedDest.name,
      transport_mode: transportMode,
      fx_hedge: fxHedge,
      hedge_commodity: hedgeCommodity.toString(),
    });

    if (selectedMine) {
      qp.set('mine_lat', selectedMine.location.lat.toString());
      qp.set('mine_lng', selectedMine.location.lng.toString());
      qp.set('mine_name', selectedMine.name);
    }

    if (currentIndexPrice > 0) {
      qp.set('index_cif_price', currentIndexPrice.toString());
    }

    if (financingEnabled) {
      qp.set('lc_cost_pct', lcCostPct.toString());
      qp.set('interest_rate_pct', interestRatePct.toString());
      qp.set('credit_insurance_pct', creditInsurancePct.toString());
    }

    try {
      const res = await fetch(`/api/deal-simulator?${qp.toString()}`);
      if (!res.ok) {
        const body = await res.json();
        setError(body.error || 'Simulation failed');
        return;
      }
      const data = await res.json();
      setSimulation(data);
    } catch {
      setError('Failed to run simulation');
    } finally {
      setLoading(false);
    }
  }, [commodity, buyPoint, sellPoint, buyPrice, volume, selectedPort, selectedDest, selectedMine, transportMode, fxHedge, hedgeCommodity, financingEnabled, lcCostPct, interestRatePct, creditInsurancePct, currentIndexPrice]);

  // Debounced auto-run
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runSimulation, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [runSimulation]);

  // Reset mine selection when commodity changes
  useEffect(() => {
    setSelectedMineId('');
  }, [commodity]);

  const categoryColors: Record<string, string> = {
    price: 'bg-white',
    freight: 'bg-blue-500',
    port: 'bg-purple-500',
    tax: 'bg-red-500',
    inland: 'bg-amber-500',
    finance: 'bg-cyan-500',
    cost: 'bg-gray-500',
  };

  const categoryLabels: Record<string, string> = {
    price: 'Price level',
    freight: 'Freight & insurance',
    port: 'Port costs',
    tax: 'Tax & royalties',
    inland: 'Inland transport',
    finance: 'Financing & hedging',
  };

  // Labels for buy point in the price input
  const buyPointLabel = CORRIDOR_POINTS.find(p => p.key === buyPoint)?.label || buyPoint;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Deal Simulator</h1>
        <p className="text-sm text-gray-400 mt-1">Forward waterfall: flexible buy/sell points along the supply chain corridor</p>
      </div>

      {/* Input Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        {/* Row 1: Buy Point + Sell Point + Price + Volume */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Buy at</label>
            <select
              value={buyPoint}
              onChange={e => setBuyPoint(e.target.value as TradePoint)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
            >
              {BUY_POINT_OPTIONS.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Sell at</label>
            <select
              value={sellPoint}
              onChange={e => setSellPoint(e.target.value as TradePoint)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
            >
              {sellPointOptions.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Buy price ($/t)</label>
            <input
              type="number"
              value={buyPrice}
              onChange={e => setBuyPrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              min={0}
              step={1}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Volume (tonnes)</label>
            <input
              type="number"
              value={volume}
              onChange={e => setVolume(parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              min={1000}
              step={1000}
            />
          </div>
        </div>

        {/* Row 2: Commodity + Mine + Port + Destination + Transport */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Commodity</label>
            <select
              value={commodity}
              onChange={e => setCommodity(e.target.value as CommodityType)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
            >
              {COMMODITIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          {needsInland && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Mine</label>
                <select
                  value={selectedMineId}
                  onChange={e => setSelectedMineId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                >
                  <option value="">None (no inland)</option>
                  {filteredMines.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Transport</label>
                <select
                  value={transportMode}
                  onChange={e => setTransportMode(e.target.value as 'rail' | 'road')}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                >
                  <option value="rail">Rail</option>
                  <option value="road">Road</option>
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Loading port</label>
            <select
              value={selectedPortName}
              onChange={e => setSelectedPortName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
            >
              {effectiveLoadingPorts.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
          {needsOcean && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Destination</label>
              <select
                value={selectedDestName}
                onChange={e => setSelectedDestName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              >
                {effectiveDestinations.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Row 3: Hedging + Financing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Hedging */}
          <div className="border border-gray-800 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hedging</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">FX hedge</label>
                <select
                  value={fxHedge}
                  onChange={e => setFxHedge(e.target.value as FxHedgeType)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                >
                  {FX_HEDGE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={hedgeCommodity}
                    onChange={e => setHedgeCommodity(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-800 text-white focus:ring-0"
                  />
                  Price hedge
                </label>
              </div>
            </div>
          </div>

          {/* Financing */}
          <div className="border border-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Financing</p>
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={financingEnabled}
                  onChange={e => setFinancingEnabled(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-white focus:ring-0"
                />
                Include
              </label>
            </div>
            {financingEnabled && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">LC cost %</label>
                  <input
                    type="number"
                    value={lcCostPct}
                    onChange={e => setLcCostPct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                    step={0.1}
                    min={0}
                    max={5}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Interest %</label>
                  <input
                    type="number"
                    value={interestRatePct}
                    onChange={e => setInterestRatePct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                    step={0.25}
                    min={0}
                    max={30}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Credit ins %</label>
                  <input
                    type="number"
                    value={creditInsurancePct}
                    onChange={e => setCreditInsurancePct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                    step={0.1}
                    min={0}
                    max={3}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Index price override */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Index CIF price ($/t) — {currentIndexPrice > 0 ? `using $${currentIndexPrice.toFixed(2)}` : 'no index available'}
            </label>
            <input
              type="number"
              value={indexPriceOverride}
              onChange={e => setIndexPriceOverride(e.target.value)}
              placeholder={indexPrices[commodity] ? `${indexPrices[commodity].toFixed(2)} (auto)` : 'Enter manually'}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20"
              min={0}
              step={1}
            />
          </div>
          {loading && (
            <div className="pb-2">
              <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Results */}
      {simulation && (
        <>
          {/* Corridor visualization */}
          <CorridorBar simulation={simulation} />

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <SummaryCard
              label={`Buy (${simulation.buyPoint.replace('_', ' ')})`}
              value={`$${simulation.buyPrice.toFixed(2)}`}
              color="text-white"
            />
            <SummaryCard
              label="Your cost at sell"
              value={`$${simulation.sellPrice.toFixed(2)}`}
              color="text-amber-400"
            />
            {simulation.indexSellPrice !== null && (
              <SummaryCard
                label={`Index ${simulation.sellPoint.toUpperCase()}`}
                value={`$${simulation.indexSellPrice.toFixed(2)}`}
                color="text-blue-400"
              />
            )}
            <SummaryCard
              label="Margin"
              value={simulation.margin !== null ? `$${simulation.margin.toFixed(2)}` : '---'}
              color={simulation.margin !== null ? (simulation.margin >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-gray-500'}
              sub={simulation.marginPct !== null ? `${simulation.marginPct.toFixed(1)}%` : undefined}
            />
            {simulation.totalProfit !== null && (
              <SummaryCard
                label="Total profit"
                value={`$${simulation.totalProfit.toLocaleString()}`}
                color={simulation.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}
                sub={`${volume.toLocaleString()}t`}
              />
            )}
          </div>

          {/* Waterfall chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Forward Waterfall</h3>
            <div className="space-y-1">
              {simulation.steps.map((step, i) => {
                const isMarker = step.amount === 0 && step.label.startsWith('=');
                const maxVal = simulation.sellPrice || simulation.totalDeliveredCost;
                const barWidth = Math.min((step.subtotal / maxVal) * 100, 100);

                return (
                  <div key={i} className={`flex items-center gap-3 ${isMarker ? 'py-2 border-t border-gray-700' : 'py-0.5'}`}>
                    <div className="w-44 flex-shrink-0 text-right">
                      <span className={`text-xs ${isMarker ? 'text-white font-semibold' : 'text-gray-400'}`}>
                        {step.label}
                      </span>
                    </div>

                    {!isMarker && (
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full transition-all ${categoryColors[step.category] || 'bg-gray-500'}`}
                            style={{ width: `${Math.max(barWidth, 2)}%` }}
                          />
                        </div>
                        <span className="text-xs w-20 text-right flex-shrink-0 text-gray-300">
                          +${step.amount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {isMarker && (
                      <div className="flex-1 flex items-center gap-2">
                        <span className={`text-sm font-bold ${
                          step.label === '= MARGIN'
                            ? (step.subtotal >= 0 ? 'text-emerald-400' : 'text-red-400')
                            : 'text-amber-400'
                        }`}>
                          ${step.subtotal.toFixed(2)}/t
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Category legend */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-4 pt-4 border-t border-gray-800">
              {Object.entries(categoryLabels).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${categoryColors[key]}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Detailed breakdown table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500">
                  <th className="px-4 py-2 text-left font-medium">Component</th>
                  <th className="px-4 py-2 text-right font-medium">$/t</th>
                  <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                  <th className="px-4 py-2 text-left font-medium hidden sm:table-cell">Note</th>
                </tr>
              </thead>
              <tbody>
                {simulation.steps.map((step, i) => {
                  const isMarker = step.amount === 0 && step.label.startsWith('=');
                  return (
                    <tr key={i} className={`border-b border-gray-800/50 ${isMarker ? 'bg-gray-800/30' : ''}`}>
                      <td className={`px-4 py-2 ${isMarker ? 'font-semibold text-white' : 'text-gray-300'}`}>
                        <div className="flex items-center gap-2">
                          {!isMarker && (
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${categoryColors[step.category]}`} />
                          )}
                          {step.label}
                        </div>
                      </td>
                      <td className={`px-4 py-2 text-right ${
                        isMarker ? 'font-bold text-amber-400' : 'text-gray-300'
                      }`}>
                        {step.amount !== 0 ? `+${step.amount.toFixed(2)}` : ''}
                      </td>
                      <td className={`px-4 py-2 text-right ${
                        isMarker
                          ? step.label === '= MARGIN'
                            ? (step.subtotal >= 0 ? 'font-bold text-emerald-400' : 'font-bold text-red-400')
                            : 'font-bold text-amber-400'
                          : 'text-gray-400'
                      }`}>
                        ${step.subtotal.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500 hidden sm:table-cell">{step.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Margin + Timeline + Breakeven */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Margin comparison */}
            {simulation.margin !== null && simulation.indexSellPrice !== null && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Market Comparison</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Index {simulation.sellPoint.toUpperCase()}</span>
                    <span className="text-white font-medium">${simulation.indexSellPrice.toFixed(2)}/t</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Your cost at {simulation.sellPoint.toUpperCase()}</span>
                    <span className="text-white font-medium">${simulation.sellPrice.toFixed(2)}/t</span>
                  </div>
                  <div className="border-t border-gray-800 pt-2 flex justify-between text-sm">
                    <span className="text-gray-400">Margin</span>
                    <span className={`font-bold ${simulation.margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${simulation.margin.toFixed(2)}/t ({simulation.marginPct?.toFixed(1)}%)
                    </span>
                  </div>
                  {simulation.totalProfit !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total profit</span>
                      <span className={`font-bold ${simulation.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${simulation.totalProfit.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {simulation.breakevenBuyPrice !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Breakeven buy price</span>
                      <span className="text-yellow-400 font-medium">${simulation.breakevenBuyPrice.toFixed(2)}/t</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estimated Timeline</p>
              <div className="text-center py-2">
                <span className="text-3xl font-bold text-white">{simulation.estimatedDaysToDelivery}</span>
                <span className="text-sm text-gray-400 ml-1">days</span>
              </div>
              <p className="text-xs text-gray-500 text-center">
                {buyPointLabel} to {CORRIDOR_POINTS.find(p => p.key === sellPoint)?.label || sellPoint}
              </p>
            </div>

            {/* Financing summary */}
            {simulation.financing && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Financing Cost</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">LC cost</span>
                    <span className="text-white">${simulation.financing.lcCost.toFixed(2)}/t</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Interest</span>
                    <span className="text-white">${simulation.financing.interestCost.toFixed(2)}/t</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Credit insurance</span>
                    <span className="text-white">${simulation.financing.insuranceCost.toFixed(2)}/t</span>
                  </div>
                  <div className="border-t border-gray-800 pt-2 flex justify-between text-sm">
                    <span className="text-gray-400">Total</span>
                    <span className="text-cyan-400 font-bold">${simulation.financing.totalFinancingCost.toFixed(2)}/t</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Working capital days</span>
                    <span className="text-gray-400">{simulation.financing.workingCapitalDays}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Placeholder when no margin or financing */}
            {simulation.margin === null && !simulation.financing && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-center">
                <p className="text-xs text-gray-500 text-center">Set an index CIF price above to see margin analysis</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Corridor Bar Component ─────────────────────────────────────────────────

function CorridorBar({ simulation }: { simulation: DealSimulation }) {
  const corridor = simulation.corridor;
  if (!corridor || corridor.length === 0) return null;

  const activePoints = corridor.filter(p => p.isActive);
  const buyIdx = corridor.findIndex(p => p.point === simulation.buyPoint);
  const sellIdx = corridor.findIndex(p => p.point === simulation.sellPoint);
  const totalCosts = simulation.sellPrice - simulation.buyPrice;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Supply Chain Corridor</p>

      {/* Corridor track */}
      <div className="relative px-4">
        {/* Background line */}
        <div className="flex items-center justify-between relative">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-700" />

          {/* Active segment highlight */}
          {buyIdx >= 0 && sellIdx >= 0 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1 bg-amber-500/60 rounded-full"
              style={{
                left: `${(buyIdx / (corridor.length - 1)) * 100}%`,
                width: `${((sellIdx - buyIdx) / (corridor.length - 1)) * 100}%`,
              }}
            />
          )}

          {/* Points */}
          {corridor.map((cp, i) => {
            const isBuy = cp.point === simulation.buyPoint;
            const isSell = cp.point === simulation.sellPoint;
            const isInactive = !cp.isActive;

            return (
              <div key={cp.point} className="relative z-10 flex flex-col items-center" style={{ width: 0 }}>
                {/* Dot */}
                <div className={`w-3 h-3 rounded-full border-2 ${
                  isBuy ? 'bg-emerald-400 border-emerald-400' :
                  isSell ? 'bg-amber-400 border-amber-400' :
                  isInactive ? 'bg-gray-700 border-gray-600' :
                  'bg-gray-500 border-gray-400'
                }`} />

                {/* Label below */}
                <span className={`text-[10px] mt-2 whitespace-nowrap ${
                  isBuy || isSell ? 'text-white font-semibold' : isInactive ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {cp.point.replace('_', ' ').toUpperCase()}
                </span>

                {/* Tag */}
                {isBuy && (
                  <span className="text-[9px] font-bold text-emerald-400 mt-0.5">BUY</span>
                )}
                {isSell && (
                  <span className="text-[9px] font-bold text-amber-400 mt-0.5">SELL</span>
                )}

                {/* Price */}
                {(isBuy || isSell) && (
                  <span className={`text-xs font-medium mt-0.5 ${isBuy ? 'text-emerald-300' : 'text-amber-300'}`}>
                    ${isBuy ? simulation.buyPrice.toFixed(2) : simulation.sellPrice.toFixed(2)}/t
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cost summary below corridor */}
      <div className="flex justify-center gap-8 text-xs pt-2">
        <div className="text-center">
          <span className="text-gray-500">Your costs</span>
          <span className="text-white font-semibold ml-2">${totalCosts.toFixed(2)}/t</span>
        </div>
        {simulation.margin !== null && (
          <div className="text-center">
            <span className="text-gray-500">Margin</span>
            <span className={`font-semibold ml-2 ${simulation.margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ${simulation.margin.toFixed(2)}/t
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helper Components ──────────────────────────────────────────────────────

function SummaryCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
