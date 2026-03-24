import Link from 'next/link';
import { COMMODITY_CONFIG } from '@/lib/types';
import { DEAL_STATUS_LABELS, DEAL_STATUS_COLORS } from '@/lib/deal-helpers';
import { formatCurrency, timeAgo } from '@/lib/format';
import type { DealWithDetails } from '@/lib/deal-queries';

interface PipelineCardProps {
  deal: DealWithDetails;
}

export function PipelineCard({ deal }: PipelineCardProps) {
  const config = COMMODITY_CONFIG[deal.commodity_type];
  const statusColors = DEAL_STATUS_COLORS[deal.status];

  return (
    <Link
      href={`/deals/${deal.id}`}
      className="block bg-gray-950 border border-gray-800 rounded-lg p-3 hover:border-gray-700 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
        <span className="text-xs font-medium text-white">{config.label}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ml-auto ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
          {DEAL_STATUS_LABELS[deal.status]}
        </span>
      </div>
      <div className="text-xs text-gray-400">{deal.counterparty_name}</div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm font-semibold text-amber-500">
          {formatCurrency(deal.agreed_price, deal.currency)}/t
        </span>
        <span className="text-xs text-gray-500">
          {deal.volume_tonnes.toLocaleString()}t
        </span>
      </div>
      <div className="text-[10px] text-gray-600 mt-1">{timeAgo(deal.created_at)}</div>
    </Link>
  );
}
