import type { GeoPoint } from './types';

export interface RouteSegment {
  type: 'road' | 'rail' | 'ocean';
  coordinates: [number, number][];  // [lng, lat][]
  distance_km: number;
  label: string;
}

/**
 * Parse a PostGIS LINESTRING WKB hex string into an array of [lng, lat] pairs.
 *
 * WKB LineString format (little-endian with SRID):
 *   Byte 0:       endianness (01 = LE)
 *   Bytes 1-4:    type (02000020 → LineString + SRID flag)
 *   Bytes 5-8:    SRID (E6100000 = 4326)
 *   Bytes 9-12:   numPoints (uint32 LE)
 *   Bytes 13+:    pairs of float64 LE (X=lng, Y=lat) × numPoints
 */
export function parseLineStringWKB(hex: string): [number, number][] | null {
  if (!hex || typeof hex !== 'string') return null;
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
  if (hex.length < 20) return null;

  try {
    // Byte 0: endianness
    const isLE = hex.substring(0, 2) === '01';
    if (!isLE) return null;

    // Bytes 1-4: WKB type
    const b0 = parseInt(hex.substring(2, 4), 16);
    const b1 = parseInt(hex.substring(4, 6), 16);
    const b2 = parseInt(hex.substring(6, 8), 16);
    const b3 = parseInt(hex.substring(8, 10), 16);
    const wkbType = (b3 << 24) | (b2 << 16) | (b1 << 8) | b0;

    const baseType = wkbType & 0x000000FF;
    const hasSRID = (wkbType & 0x20000000) !== 0;

    if (baseType !== 2) return null; // Not a LineString

    // Skip endian(2) + type(8) + optional SRID(8) hex chars
    let offset = hasSRID ? 18 : 10;

    // numPoints — uint32 LE
    const np0 = parseInt(hex.substring(offset,     offset + 2), 16);
    const np1 = parseInt(hex.substring(offset + 2, offset + 4), 16);
    const np2 = parseInt(hex.substring(offset + 4, offset + 6), 16);
    const np3 = parseInt(hex.substring(offset + 6, offset + 8), 16);
    const numPoints = (np3 << 24) | (np2 << 16) | (np1 << 8) | np0;
    offset += 8;

    if (numPoints < 2 || hex.length < offset + numPoints * 32) return null;

    const coords: [number, number][] = [];
    for (let i = 0; i < numPoints; i++) {
      const lng = readFloat64LE(hex, offset);
      const lat = readFloat64LE(hex, offset + 16);
      coords.push([lng, lat]);
      offset += 32;
    }

    return coords;
  } catch {
    return null;
  }
}

/** Read a 64-bit LE float from hex string at given hex char offset */
function readFloat64LE(hex: string, offset: number): number {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  for (let i = 0; i < 8; i++) {
    view.setUint8(i, parseInt(hex.substring(offset + i * 2, offset + i * 2 + 2), 16));
  }
  return view.getFloat64(0, true);
}

/**
 * Build a RouteSegment for a rail corridor from its stored WKB geometry.
 * Falls back to a straight line between mine and harbour if geometry is missing.
 */
export function buildRailRoute(
  mineLocation: GeoPoint,
  harbourLocation: GeoPoint,
  wkbHex: string | null,
  label: string,
  distance_km: number
): RouteSegment {
  const parsed = wkbHex ? parseLineStringWKB(wkbHex) : null;
  const coordinates: [number, number][] = parsed ?? [
    [mineLocation.lng, mineLocation.lat],
    [harbourLocation.lng, harbourLocation.lat],
  ];
  return { type: 'rail', coordinates, distance_km, label };
}

/**
 * Fetch driving route from Mapbox Directions API
 */
export async function fetchRoadRoute(
  from: GeoPoint,
  to: GeoPoint,
  label: string
): Promise<RouteSegment | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    return {
      type: 'road',
      coordinates: route.geometry.coordinates,
      distance_km: Math.round(route.distance / 1000),
      label,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a great-circle arc for ocean freight.
 * Uses intermediate waypoints for realistic shipping lanes.
 */
export function generateOceanRoute(
  from: GeoPoint,
  to: GeoPoint,
  label: string
): RouteSegment {
  // Generate waypoints for realistic shipping lanes from SA
  const waypoints = getShippingWaypoints(from, to);
  const allPoints: [number, number][] = [
    [from.lng, from.lat],
    ...waypoints,
    [to.lng, to.lat],
  ];

  // Interpolate great-circle arcs between consecutive points
  const coordinates: [number, number][] = [];
  for (let i = 0; i < allPoints.length - 1; i++) {
    const arc = interpolateGreatCircle(allPoints[i], allPoints[i + 1], 20);
    coordinates.push(...arc);
  }

  // Rough distance calculation
  const distance_km = Math.round(haversineDistance(from, to));

  return { type: 'ocean', coordinates, distance_km, label };
}

/**
 * Get intermediate waypoints for realistic SA shipping lanes
 */
function getShippingWaypoints(from: GeoPoint, to: GeoPoint): [number, number][] {
  // Determine which shipping lane based on destination
  const destLng = to.lng;
  const destLat = to.lat;

  // East Africa coast point (off Mozambique)
  const mozambiqueChannel: [number, number] = [40.5, -15.0];
  // Horn of Africa
  const hornOfAfrica: [number, number] = [51.0, 11.0];
  // Gulf of Aden / Red Sea entry
  const adenGulf: [number, number] = [45.0, 12.5];
  // Suez approach
  const suezApproach: [number, number] = [34.0, 28.0];
  // Indian Ocean mid-point
  const indianOceanMid: [number, number] = [65.0, -5.0];
  // Strait of Malacca approach
  const malaccaApproach: [number, number] = [95.0, 5.0];
  // South China Sea
  const southChinaSea: [number, number] = [110.0, 10.0];

  // Route to China/East Asia (via Indian Ocean, Malacca Strait)
  if (destLng > 100 && destLat > 20) {
    return [mozambiqueChannel, indianOceanMid, malaccaApproach, southChinaSea];
  }

  // Route to India (via Indian Ocean direct)
  if (destLng > 70 && destLng < 100 && destLat > 0) {
    return [mozambiqueChannel, indianOceanMid];
  }

  // Route to Turkey/Mediterranean (via Suez Canal)
  if (destLng > 25 && destLng < 45 && destLat > 30) {
    return [mozambiqueChannel, hornOfAfrica, adenGulf, suezApproach];
  }

  // Route to Europe (via Suez)
  if (destLng > -10 && destLng < 25 && destLat > 35) {
    return [mozambiqueChannel, hornOfAfrica, adenGulf, suezApproach];
  }

  // Default: direct great circle with one mid-ocean waypoint
  const midLng = (from.lng + to.lng) / 2;
  const midLat = (from.lat + to.lat) / 2;
  return [[midLng, midLat]];
}

/**
 * Interpolate great-circle arc between two points
 */
function interpolateGreatCircle(
  start: [number, number],
  end: [number, number],
  numPoints: number
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const lat1 = toRad(start[1]);
  const lng1 = toRad(start[0]);
  const lat2 = toRad(end[1]);
  const lng2 = toRad(end[0]);

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((lat2 - lat1) / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2
    )
  );

  if (d < 0.0001) return [start, end];

  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
    const lng = toDeg(Math.atan2(y, x));
    points.push([lng, lat]);
  }
  return points;
}

function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
