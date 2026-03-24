import type { DealStatus } from './types';

// Valid status transitions — maps current status to allowed next statuses
const TRANSITIONS: Record<DealStatus, DealStatus[]> = {
  interest: ['first_accept', 'cancelled'],
  first_accept: ['negotiation', 'cancelled'],
  negotiation: ['second_accept', 'cancelled'],
  second_accept: ['escrow_held', 'cancelled'],
  escrow_held: ['loading', 'disputed', 'cancelled'],
  loading: ['in_transit', 'disputed'],
  in_transit: ['delivered', 'disputed'],
  delivered: ['escrow_released', 'disputed'],
  escrow_released: ['completed'],
  completed: [],
  disputed: ['escrow_released', 'cancelled'],
  cancelled: [],
};

export function canTransition(current: DealStatus, next: DealStatus): boolean {
  return TRANSITIONS[current]?.includes(next) ?? false;
}

export function getNextStatuses(current: DealStatus): DealStatus[] {
  return TRANSITIONS[current] ?? [];
}

// Human-readable labels for deal statuses
export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  interest: 'Interest',
  first_accept: 'First Accept',
  negotiation: 'Negotiation',
  second_accept: 'Second Accept',
  escrow_held: 'Escrow Held',
  loading: 'Loading',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  escrow_released: 'Escrow Released',
  completed: 'Completed',
  disputed: 'Disputed',
  cancelled: 'Cancelled',
};

// Color config for statuses
export const DEAL_STATUS_COLORS: Record<DealStatus, { bg: string; text: string; border: string }> = {
  interest: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  first_accept: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  negotiation: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  second_accept: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  escrow_held: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  loading: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  in_transit: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  delivered: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  escrow_released: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  disputed: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  cancelled: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
};

// Pipeline columns for kanban view
export const PIPELINE_COLUMNS: { key: string; label: string; statuses: DealStatus[] }[] = [
  { key: 'interest', label: 'Interest', statuses: ['interest', 'first_accept'] },
  { key: 'negotiation', label: 'Negotiation', statuses: ['negotiation', 'second_accept'] },
  { key: 'escrow', label: 'Escrow', statuses: ['escrow_held'] },
  { key: 'transit', label: 'In Transit', statuses: ['loading', 'in_transit'] },
  { key: 'completed', label: 'Completed', statuses: ['delivered', 'escrow_released', 'completed'] },
];

// Milestone types in order for progress display
export const MILESTONE_ORDER: { type: string; label: string }[] = [
  { type: 'loaded', label: 'Loaded' },
  { type: 'departed_port', label: 'Departed' },
  { type: 'in_transit', label: 'At Sea' },
  { type: 'arrived_port', label: 'Arrived' },
  { type: 'customs', label: 'Customs' },
  { type: 'delivered', label: 'Delivered' },
];
