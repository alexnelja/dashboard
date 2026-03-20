import type { GeoPoint } from './types';

/**
 * Parse PostGIS geography column returned by Supabase.
 *
 * Supabase returns GEOGRAPHY columns as WKB hex strings like:
 * "0101000020E6100000A245B6F3FD943B40E5D022DBF9BE39C0"
 *
 * WKB Point with SRID (little-endian, 25 bytes = 50 hex chars):
 * - Byte 0: endianness (01 = little-endian)
 * - Bytes 1-4: type (01000020 = Point with SRID in LE → 0x20000001)
 * - Bytes 5-8: SRID (E6100000 = 4326 in LE)
 * - Bytes 9-16: X (longitude) as float64 LE
 * - Bytes 17-24: Y (latitude) as float64 LE
 */
export function parseGeoPoint(geo: unknown): GeoPoint | null {
  if (!geo) return null;

  // Handle GeoJSON object
  if (typeof geo === 'object') {
    const obj = geo as Record<string, unknown>;
    if (obj.type === 'Point' && Array.isArray(obj.coordinates)) {
      return { lng: obj.coordinates[0] as number, lat: obj.coordinates[1] as number };
    }
    return null;
  }

  if (typeof geo !== 'string') return null;

  // Try GeoJSON string
  if (geo.startsWith('{')) {
    try {
      const parsed = JSON.parse(geo);
      if (parsed?.type === 'Point' && Array.isArray(parsed.coordinates)) {
        return { lng: parsed.coordinates[0], lat: parsed.coordinates[1] };
      }
    } catch {
      // not JSON
    }
    return null;
  }

  // Parse WKB hex
  try {
    const hex = geo;
    if (hex.length < 50) return null;
    if (!/^[0-9a-fA-F]+$/.test(hex)) return null;

    // Byte 0: endianness
    const isLE = hex.substring(0, 2) === '01';
    if (!isLE) return null; // Only handle LE for now (Supabase always uses LE)

    // Bytes 1-4: type (LE) — read 4 bytes and reconstruct as uint32 LE
    const typeByte0 = parseInt(hex.substring(2, 4), 16);
    const typeByte1 = parseInt(hex.substring(4, 6), 16);
    const typeByte2 = parseInt(hex.substring(6, 8), 16);
    const typeByte3 = parseInt(hex.substring(8, 10), 16);
    const wkbType = (typeByte3 << 24) | (typeByte2 << 16) | (typeByte1 << 8) | typeByte0;

    // Check if it's a Point (base type 1) with optional SRID flag (0x20000000)
    const baseType = wkbType & 0x000000FF;
    const hasSRID = (wkbType & 0x20000000) !== 0;

    if (baseType !== 1) return null; // Not a Point

    // Coordinates offset: skip endian(1) + type(4) + optional SRID(4)
    const coordOffset = hasSRID ? 18 : 10; // in hex chars

    if (hex.length < coordOffset + 32) return null; // Need 16 bytes for X+Y

    const lng = readFloat64LE(hex, coordOffset);
    const lat = readFloat64LE(hex, coordOffset + 16);

    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;

    return { lng, lat };
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
