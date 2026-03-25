// app/intelligence/verification-panel.tsx

import { COMMODITY_CONFIG } from '@/lib/types';
import type { CommodityType } from '@/lib/types';
import type { VerificationInsightRow } from '@/lib/intelligence-queries';

export function VerificationPanel({ rows }: { rows: VerificationInsightRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Verification Insights</h3>
        <p className="text-gray-500 text-sm text-center py-4">No verification data yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Verification Insights</h3>
      <p className="text-xs text-gray-500 mb-4">Listed spec vs lab-tested actual values per mine</p>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-800">
            <th className="text-left py-2 font-medium">Mine</th>
            <th className="text-left py-2 font-medium">Commodity</th>
            <th className="text-right py-2 font-medium">Listings</th>
            <th className="text-right py-2 font-medium">Verified</th>
            <th className="text-right py-2 font-medium">Rate</th>
            <th className="text-right py-2 font-medium">Avg Spec Deviation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const cfg = COMMODITY_CONFIG[row.commodity as CommodityType];
            const deviationColor = row.avgSpecDeviation < 2 ? 'text-emerald-400' : row.avgSpecDeviation < 5 ? 'text-amber-400' : 'text-red-400';
            return (
              <tr key={row.mineName} className="border-b border-gray-800/50">
                <td className="py-2 text-white">{row.mineName}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg?.color ?? '#6b7280' }} />
                    <span className="text-gray-400">{cfg?.label ?? row.commodity}</span>
                  </div>
                </td>
                <td className="py-2 text-right text-gray-400">{row.listingsCount}</td>
                <td className="py-2 text-right text-gray-400">{row.verificationsCount}</td>
                <td className="py-2 text-right text-gray-400">{Math.round(row.verificationRate * 100)}%</td>
                <td className={`py-2 text-right font-medium ${deviationColor}`}>
                  {row.avgSpecDeviation > 0 ? `${row.avgSpecDeviation.toFixed(1)}%` : '\u2014'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
