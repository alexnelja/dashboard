// app/intelligence/volume-panel.tsx

import type { VolumeFlowRow } from '@/lib/intelligence-queries';
import { formatTonnes, formatCurrency } from '@/lib/format';

export function VolumePanel({ rows }: { rows: VolumeFlowRow[] }) {
  const totalVolume = rows.reduce((s, r) => s + r.totalVolume, 0);
  const totalDeals = rows.reduce((s, r) => s + r.dealCount, 0);
  const totalValue = rows.reduce((s, r) => s + r.totalValue, 0);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Volume Flow</h3>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <p className="text-xs text-gray-500">Total Deals</p>
          <p className="text-xl font-bold text-white">{totalDeals}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Volume</p>
          <p className="text-xl font-bold text-white">{formatTonnes(totalVolume)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Value</p>
          <p className="text-xl font-bold text-white">{formatCurrency(totalValue, 'USD')}</p>
        </div>
      </div>

      {/* By commodity */}
      {rows.length === 0 ? (
        <p className="text-sm text-gray-600">No deal data yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.commodity} className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
              <span className="text-sm text-white w-24 flex-shrink-0">{row.label}</span>
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: row.color,
                    width: totalVolume > 0 ? `${(row.totalVolume / totalVolume) * 100}%` : '0%',
                  }}
                />
              </div>
              <span className="text-xs text-gray-400 w-20 text-right flex-shrink-0">{formatTonnes(row.totalVolume)}</span>
              <span className="text-xs text-gray-500 w-10 text-right flex-shrink-0">{row.dealCount}d</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
