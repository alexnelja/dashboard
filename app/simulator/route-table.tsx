'use client';

import { useState } from 'react';
import type { OptimizationResult, RouteOption } from '@/lib/route-optimizer';
import type { DataQuality } from '@/lib/data-sources';

type SortKey = 'rank' | 'margin' | 'transitDays' | 'freightCost' | 'portCosts' | 'inlandCost' | 'sellPrice';

interface RouteTableProps {
  result: OptimizationResult;
  onSelectRoute?: (route: RouteOption) => void;
}

export function RouteTable({ result, onSelectRoute }: RouteTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortAsc, setSortAsc] = useState(true);
  const [expanded, setExpanded] = useState(true);

  if (result.routes.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p className="text-sm text-gray-400">No viable routes found. Try adjusting the index price or parameters.</p>
      </div>
    );
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      // Default sort direction: margin descending, everything else ascending
      setSortAsc(key === 'margin' ? false : true);
    }
  };

  const sorted = [...result.routes].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const bestRank = result.bestRoute?.rank;

  const sellPointLabel = result.sellPoint.toUpperCase().replace('_', ' ');
  const buyPointLabel = result.buyPoint.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header - collapsible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-800/50 transition-colors"
      >
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Route Optimization
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Best routes for {result.commodity.replace('_', ' ')} &middot; Buy {buyPointLabel} ${result.buyPrice}/t &middot; Sell {sellPointLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{result.routes.length} routes</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <>
          {/* Data quality confidence banner */}
          <DataQualityBanner />

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-gray-800 text-xs text-gray-500">
                  <SortHeader label="#" sortKey="rank" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                  <th className="px-3 py-2 text-left font-medium">Port</th>
                  <th className="px-3 py-2 text-left font-medium">Destination</th>
                  <th className="px-3 py-2 text-left font-medium">Transport</th>
                  <SortHeader label="Your Cost" sortKey="sellPrice" currentKey={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
                  <SortHeader label="Margin" sortKey="margin" currentKey={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
                  <SortHeader label="Freight" sortKey="freightCost" currentKey={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
                  <SortHeader label="Port" sortKey="portCosts" currentKey={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
                  <SortHeader label="Inland" sortKey="inlandCost" currentKey={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
                  <SortHeader label="Days" sortKey="transitDays" currentKey={sortKey} asc={sortAsc} onClick={handleSort} align="right" />
                  {onSelectRoute && <th className="px-3 py-2 text-right font-medium">Action</th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map((route) => {
                  const isBest = route.rank === bestRank;
                  const marginColor = route.margin >= 0 ? 'text-emerald-400' : 'text-red-400';

                  return (
                    <tr
                      key={`${route.loadingPort}-${route.destination}-${route.transportMode}`}
                      className={`border-b border-gray-800/50 transition-colors ${
                        isBest ? 'bg-emerald-900/10' : 'hover:bg-gray-800/30'
                      }`}
                    >
                      <td className="px-3 py-2 text-gray-400 text-center">
                        {isBest ? (
                          <span className="text-emerald-400 font-bold">{route.rank}</span>
                        ) : (
                          route.rank
                        )}
                      </td>
                      <td className="px-3 py-2 text-white whitespace-nowrap">
                        {route.loadingPort}
                      </td>
                      <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                        {route.destination !== 'N/A' ? route.destination : '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-400 capitalize">
                        {route.transportMode}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        ${route.sellPrice.toFixed(2)}
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${marginColor}`}>
                        ${route.margin.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-400">
                        {route.freightCost > 0 ? `$${route.freightCost.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-400">
                        {route.portCosts > 0 ? `$${route.portCosts.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-400">
                        {route.inlandCost > 0 ? `$${route.inlandCost.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-400">
                        {route.transitDays}d
                      </td>
                      {onSelectRoute && (
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => onSelectRoute(route)}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
                          >
                            Use route
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          <div className="px-6 py-3 border-t border-gray-800 flex flex-wrap gap-x-8 gap-y-1 text-xs text-gray-500">
            {result.bestRoute && (
              <span>
                Best: <span className="text-emerald-400 font-medium">
                  {result.bestRoute.loadingPort} &rarr; {result.bestRoute.destination !== 'N/A' ? result.bestRoute.destination : sellPointLabel}
                </span>
                {' '}(${result.bestRoute.margin.toFixed(2)}/t margin, {result.bestRoute.transitDays}d)
              </span>
            )}
            {result.worstRoute && (
              <span>
                Worst: <span className="text-gray-400">
                  {result.worstRoute.loadingPort} &rarr; {result.worstRoute.destination !== 'N/A' ? result.worstRoute.destination : sellPointLabel}
                </span>
                {' '}(${result.worstRoute.margin.toFixed(2)}/t margin, {result.worstRoute.transitDays}d)
              </span>
            )}
            <span>
              Avg margin: <span className="text-white">${result.averageMargin.toFixed(2)}/t</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sort Header Helper ────────────────────────────────────────────────────

function SortHeader({
  label, sortKey, currentKey, asc, onClick, align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  asc: boolean;
  onClick: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const isActive = currentKey === sortKey;
  return (
    <th
      className={`px-3 py-2 font-medium cursor-pointer select-none hover:text-gray-300 transition-colors ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${isActive ? 'text-white' : ''}`}
      onClick={() => onClick(sortKey)}
    >
      {label}
      {isActive && (
        <span className="ml-0.5 text-[10px]">{asc ? '\u25B2' : '\u25BC'}</span>
      )}
    </th>
  );
}

// ── Data Quality Banner ──────────────────────────────────────────────────────

function DataQualityBanner() {
  // Route optimization uses a mix of published port tariffs, estimated inland/rail costs,
  // calculated vessel economics, and placeholder bunker fuel — so some costs are estimates.
  return (
    <div className="mx-6 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
      <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
      </svg>
      <span className="text-[10px] text-amber-400">
        Some costs are estimates — results are indicative. Port tariffs are published; inland, freight, and bunker costs use industry averages.
      </span>
    </div>
  );
}
