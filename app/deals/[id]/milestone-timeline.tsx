'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MILESTONE_ORDER } from '@/lib/deal-helpers';
import type { DealMilestone, DealStatus, MilestoneType } from '@/lib/types';

interface MilestoneTimelineProps {
  dealId: string;
  milestones: DealMilestone[];
  dealStatus: DealStatus;
  isBuyer: boolean;
}

export function MilestoneTimeline({ dealId, milestones, dealStatus, isBuyer }: MilestoneTimelineProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const completedTypes = new Set(milestones.map((m) => m.milestone_type));

  // Only show add milestone for active shipping statuses
  const showAdd = ['loading', 'in_transit', 'delivered'].includes(dealStatus);

  // Determine which milestone types can be added
  const addableTypes = MILESTONE_ORDER
    .filter((m) => !completedTypes.has(m.type as MilestoneType))
    .map((m) => m.type);

  async function addMilestone(type: string) {
    setAdding(true);
    setError(null);

    try {
      const res = await fetch(`/api/deals/${dealId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestone_type: type,
          location_name: locationName || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to add milestone');
        return;
      }

      setLocationName('');
      setNotes('');
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Shipment Progress</h2>

      {/* Timeline */}
      <div className="flex items-center gap-1 mb-6">
        {MILESTONE_ORDER.map((step, i) => {
          const completed = completedTypes.has(step.type as MilestoneType);
          const milestone = milestones.find((m) => m.milestone_type === step.type);
          return (
            <div key={step.type} className="flex-1 flex flex-col items-center">
              <div className="flex items-center w-full">
                {i > 0 && (
                  <div className={`flex-1 h-0.5 ${completed ? 'bg-emerald-500' : 'bg-gray-700'}`} />
                )}
                <div
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    completed
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'bg-gray-900 border-gray-600'
                  }`}
                />
                {i < MILESTONE_ORDER.length - 1 && (
                  <div className={`flex-1 h-0.5 ${completed ? 'bg-emerald-500' : 'bg-gray-700'}`} />
                )}
              </div>
              <span className={`text-[10px] mt-1.5 ${completed ? 'text-emerald-400' : 'text-gray-600'}`}>
                {step.label}
              </span>
              {milestone && (
                <span className="text-[9px] text-gray-500">
                  {milestone.location_name ?? ''}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Add milestone form */}
      {showAdd && addableTypes.length > 0 && (
        <div className="border-t border-gray-800 pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Location (optional)"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {addableTypes.map((type) => {
              const label = MILESTONE_ORDER.find((m) => m.type === type)?.label ?? type;
              return (
                <button
                  key={type}
                  onClick={() => addMilestone(type)}
                  disabled={adding}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-colors disabled:opacity-50"
                >
                  + {label}
                </button>
              );
            })}
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
