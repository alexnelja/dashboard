// Map defaults
export const MAP_CONFIG = {
  SA_CENTER: [26, -29] as [number, number],
  SHIPMENT_CENTER: [35, -10] as [number, number],
  SA_ZOOM: 5,
  SHIPMENT_ZOOM: 3,
  FLY_TO_ZOOM: 5,
  FLY_DURATION_MS: 1000,
  EASE_DURATION_MS: 500,
} as const;

// Shipment progress
export const SHIPMENT_CONFIG = {
  TOTAL_MILESTONES: 6,
  MAX_PROGRESS_RATIO: 0.95,
  PULSE_ANIMATION: 'pulse 2s ease-in-out infinite',
  MARKER_BORDER_COLOR: '#0f172a',
} as const;

// Trust scoring
export const TRUST_CONFIG = {
  BAYESIAN_CONFIDENCE_M: 10,
  PLATFORM_DEFAULT_SCORE: 3.0,
  MAX_SCORE: 5,
  DISPUTE_PENALTY_MULTIPLIER: 2,
  MIN_SCORE: 1,
} as const;

// Pagination
export const PAGINATION = {
  COMPLETED_DEALS_LIMIT: 50,
  RECENT_DEALS_DAYS: 30,
} as const;
