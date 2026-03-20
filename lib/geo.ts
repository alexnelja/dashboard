import type { GeoPoint } from './types';

/**
 * Parse PostGIS geography column returned by Supabase.
 * Supabase returns geography as GeoJSON string or object:
 * {"type":"Point","coordinates":[lng, lat]}
 */
export function parseGeoPoint(geo: unknown): GeoPoint | null {
  if (!geo) return null;

  try {
    const parsed = typeof geo === 'string' ? JSON.parse(geo) : geo;
    if (parsed?.type === 'Point' && Array.isArray(parsed.coordinates)) {
      return { lng: parsed.coordinates[0], lat: parsed.coordinates[1] };
    }
    return null;
  } catch {
    return null;
  }
}
