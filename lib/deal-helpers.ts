import type { DealStatus } from './types';

// Role that can trigger each transition
export type DealRole = 'buyer' | 'seller' | 'either';

interface TransitionRule {
  to: DealStatus;
  allowedBy: DealRole;
}

// Valid status transitions with role enforcement
const TRANSITIONS: Record<DealStatus, TransitionRule[]> = {
  interest: [
    { to: 'first_accept', allowedBy: 'seller' },   // seller acknowledges buyer's interest
    { to: 'cancelled', allowedBy: 'either' },
  ],
  first_accept: [
    { to: 'negotiation', allowedBy: 'either' },     // either party opens negotiation
    { to: 'cancelled', allowedBy: 'either' },
  ],
  negotiation: [
    { to: 'second_accept', allowedBy: 'either' },   // either party locks terms (v1 — dual confirm in v2)
    { to: 'cancelled', allowedBy: 'either' },
  ],
  second_accept: [
    { to: 'escrow_held', allowedBy: 'seller' },     // seller confirms deposit received (admin in v2)
    { to: 'cancelled', allowedBy: 'either' },
  ],
  escrow_held: [
    { to: 'loading', allowedBy: 'seller' },          // seller confirms material loaded
    { to: 'disputed', allowedBy: 'either' },
    { to: 'cancelled', allowedBy: 'either' },
  ],
  loading: [
    { to: 'in_transit', allowedBy: 'seller' },       // seller confirms vessel departed
    { to: 'disputed', allowedBy: 'either' },
  ],
  in_transit: [
    { to: 'delivered', allowedBy: 'buyer' },          // buyer confirms material received
    { to: 'disputed', allowedBy: 'either' },
  ],
  delivered: [
    { to: 'escrow_released', allowedBy: 'buyer' },    // buyer approves release (admin in v2)
    { to: 'disputed', allowedBy: 'either' },
  ],
  escrow_released: [
    { to: 'completed', allowedBy: 'either' },
  ],
  completed: [],
  disputed: [
    { to: 'escrow_released', allowedBy: 'either' },  // admin resolves (v1: either party for testing)
    { to: 'cancelled', allowedBy: 'either' },
  ],
  cancelled: [],
};

// Milestone role enforcement — who can add which milestones
export const MILESTONE_ROLES: Record<string, DealRole> = {
  loaded: 'seller',          // seller confirms material loaded
  departed_port: 'seller',   // seller/transporter confirms departure
  in_transit: 'either',      // either party can log transit update
  arrived_port: 'buyer',     // buyer confirms arrival at destination
  customs: 'buyer',          // buyer handles customs at destination
  delivered: 'buyer',        // buyer confirms final delivery
};

export function canTransition(current: DealStatus, next: DealStatus): boolean {
  return TRANSITIONS[current]?.some((r) => r.to === next) ?? false;
}

export function canTransitionAsRole(
  current: DealStatus,
  next: DealStatus,
  role: 'buyer' | 'seller'
): boolean {
  const rule = TRANSITIONS[current]?.find((r) => r.to === next);
  if (!rule) return false;
  return rule.allowedBy === 'either' || rule.allowedBy === role;
}

export function getNextStatuses(current: DealStatus): DealStatus[] {
  return TRANSITIONS[current]?.map((r) => r.to) ?? [];
}

export function getNextStatusesForRole(
  current: DealStatus,
  role: 'buyer' | 'seller'
): DealStatus[] {
  return (TRANSITIONS[current] ?? [])
    .filter((r) => r.allowedBy === 'either' || r.allowedBy === role)
    .map((r) => r.to);
}

export function canAddMilestone(milestoneType: string, role: 'buyer' | 'seller'): boolean {
  const allowed = MILESTONE_ROLES[milestoneType];
  if (!allowed) return false;
  return allowed === 'either' || allowed === role;
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
