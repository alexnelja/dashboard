// app/intelligence/velocity-panel.tsx

import type { VelocityStage } from '@/lib/intelligence-queries';

export function VelocityPanel({ stages }: { stages: VelocityStage[] }) {
  const totalDays = stages.reduce((s, st) => s + st.avgDays, 0);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Deal Velocity</h3>

      {stages.every((s) => s.dealCount === 0) ? (
        <p className="text-sm text-gray-600">No completed deal data yet.</p>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-xs text-gray-500">Avg Total Pipeline Duration</p>
            <p className="text-2xl font-bold text-white">{totalDays.toFixed(1)} days</p>
          </div>

          {/* Stage breakdown */}
          <div className="space-y-3">
            {stages.map((stage) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">{stage.label}</span>
                  <span className="text-white font-medium">
                    {stage.avgDays > 0 ? `${stage.avgDays}d` : '--'}
                    <span className="text-gray-600 ml-1">({stage.dealCount} deals)</span>
                  </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cyan-500"
                    style={{ width: totalDays > 0 ? `${(stage.avgDays / totalDays) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
