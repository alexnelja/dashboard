// app/intelligence/demand-panel.tsx

import type { DemandRow } from '@/lib/intelligence-queries';
import { formatTonnes, formatCurrency } from '@/lib/format';

export function DemandPanel({ rows }: { rows: DemandRow[] }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Demand Heatmap</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-600">No active requirements yet.</p>
      ) : (
        <div className="overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="pb-2 font-medium">Commodity</th>
                <th className="pb-2 font-medium">Delivery Port</th>
                <th className="pb-2 font-medium text-right">Requests</th>
                <th className="pb-2 font-medium text-right">Volume Needed</th>
                <th className="pb-2 font-medium text-right">Avg Target Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.slice(0, 10).map((row, i) => (
                <tr key={`${row.commodity}-${row.deliveryPort}-${i}`}>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                      <span className="text-sm text-white">{row.label}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-sm text-gray-400">{row.deliveryPort}</td>
                  <td className="py-2.5 text-sm text-gray-400 text-right">{row.requirementCount}</td>
                  <td className="py-2.5 text-sm text-white text-right font-medium">{formatTonnes(row.totalVolumeNeeded)}</td>
                  <td className="py-2.5 text-sm text-amber-400 text-right">{formatCurrency(row.avgTargetPrice, 'USD')}/t</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
