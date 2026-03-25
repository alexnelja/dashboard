// app/intelligence/concentration-panel.tsx

import type { ConcentrationRow } from '@/lib/intelligence-queries';
import { formatTonnes } from '@/lib/format';

export function ConcentrationPanel({ rows }: { rows: ConcentrationRow[] }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Market Concentration</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-600">No deal data yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.sellerId} className="flex items-center gap-3">
              <span className="text-sm text-white w-40 flex-shrink-0 truncate" title={row.sellerName}>
                {row.sellerName}
              </span>
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${row.volumeShare}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-16 text-right flex-shrink-0">{row.volumeShare}%</span>
              <span className="text-xs text-gray-500 w-16 text-right flex-shrink-0">{formatTonnes(row.totalVolume)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
