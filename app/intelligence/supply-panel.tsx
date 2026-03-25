// app/intelligence/supply-panel.tsx

import type { SupplyRow } from '@/lib/intelligence-queries';
import { formatTonnes } from '@/lib/format';
import { COMMODITY_CONFIG } from '@/lib/types';

export function SupplyPanel({ rows }: { rows: SupplyRow[] }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Supply Intelligence</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-600">No listing data yet.</p>
      ) : (
        <div className="overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="pb-2 font-medium">Mine</th>
                <th className="pb-2 font-medium">Region</th>
                <th className="pb-2 font-medium text-right">Listings</th>
                <th className="pb-2 font-medium text-right">Volume</th>
                <th className="pb-2 font-medium">Commodities</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.slice(0, 10).map((row) => (
                <tr key={row.mineId}>
                  <td className="py-2.5 text-sm text-white">{row.mineName}</td>
                  <td className="py-2.5 text-sm text-gray-400">{row.region}</td>
                  <td className="py-2.5 text-sm text-gray-400 text-right">{row.listingCount}</td>
                  <td className="py-2.5 text-sm text-white text-right font-medium">{formatTonnes(row.totalVolume)}</td>
                  <td className="py-2.5">
                    <div className="flex gap-1">
                      {row.commodities.map((ct) => (
                        <span
                          key={ct}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COMMODITY_CONFIG[ct].color }}
                          title={COMMODITY_CONFIG[ct].label}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
