'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getNextStatuses, DEAL_STATUS_LABELS, DEAL_STATUS_COLORS } from '@/lib/deal-helpers';
import type { DealStatus } from '@/lib/types';

interface DealActionsProps {
  dealId: string;
  currentStatus: DealStatus;
  isBuyer: boolean;
}

export function DealActions({ dealId, currentStatus, isBuyer }: DealActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextStatuses = getNextStatuses(currentStatus);

  if (nextStatuses.length === 0) return null;

  async function advanceStatus(newStatus: DealStatus) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update status');
        return;
      }

      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Actions</h2>
      <div className="flex flex-wrap gap-2">
        {nextStatuses.map((status) => {
          const colors = DEAL_STATUS_COLORS[status];
          const isDestructive = status === 'cancelled' || status === 'disputed';
          return (
            <button
              key={status}
              onClick={() => advanceStatus(status)}
              disabled={loading}
              className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
                isDestructive
                  ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                  : `${colors.border} ${colors.text} hover:${colors.bg}`
              }`}
            >
              {loading ? '…' : `→ ${DEAL_STATUS_LABELS[status]}`}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      <p className="text-xs text-gray-600 mt-3">
        You are the {isBuyer ? 'buyer' : 'seller'} in this deal.
      </p>
    </div>
  );
}
