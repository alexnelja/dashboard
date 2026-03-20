import type { GeoPoint } from './types';

/**
 * Parse PostGIS geography column returned by Supabase.
 *
 * Supabase returns GEOGRAPHY columns as WKB hex strings like:
 * "0101000020E6100000A245B6F3FD943B40E5D022DBF9BE39C0"
 *
 * WKB Point format (little-endian):
 * - Byte 0: endianness (01 = little-endian)
 * - Bytes 1-4: geometry type (01000020 = Point with SRID)
 * - Bytes 5-8: SRID (E6100000 = 4326 in LE)
 * - Bytes 9-16: X (longitude) as float64 LE
 * - Bytes 17-24: Y (latitude) as float64 LE
 */
export function parseGeoPoint(geo: unknown): GeoPoint | null {
  if (!geo) return null;

  // Handle GeoJSON format (object or JSON string)
  if (typeof geo === 'object') {
    const obj = geo as Record<string, unknown>;
    if (obj.type === 'Point' && Array.isArray(obj.coordinates)) {
      return { lng: obj.coordinates[0] as number, lat: obj.coordinates[1] as number };
    }
  }

  if (typeof geo !== 'string') return null;

  // Try GeoJSON string first
  if (geo.startsWith('{')) {
    try {
      const parsed = JSON.parse(geo);
      if (parsed?.type === 'Point' && Array.isArray(parsed.coordinates)) {
        return { lng: parsed.coordinates[0], lat: parsed.coordinates[1] };
      }
    } catch {
      return null;
    }
  }

  // Parse WKB hex string
  try {
    const hex = geo.toUpperCase();

    // Minimum length for a Point with SRID: 1 + 4 + 4 + 8 + 8 = 25 bytes = 50 hex chars
    if (hex.length < 50) return null;

    // Check it looks like hex
    if (!/^[0-9A-F]+$/.test(hex)) return null;

    // Read endianness
    const le = hex.substring(0, 2) === '01';

    // Determine offset based on geometry type
    // Type with SRID (0x20000001 or 0x01000020 in LE) has 4 extra bytes for SRID
    let offset = 10; // 1 byte endian + 4 bytes type = 5 bytes = 10 hex chars

    // Check if SRID flag is set (bit 0x20 in the type)
    const typeHex = le
      ? hex.substring(2, 10) // 4 bytes LE
      : hex.substring(2, 10); // 4 bytes BE
    const typeBytes = le
      ? parseInt(hex.substring(6, 8) + hex.substring(4, 6) + hex.substring(2, 4) + hex.substring(8, 10), 16)
      : parseInt(typeHex, 16);

    const hasSrid = (typeBytes & 0x20000000) !== 0;
    if (hasSrid) {
      offset += 8; // 4 bytes SRID = 8 hex chars
    }

    // Read X (longitude) - 8 bytes float64
    const xHex = hex.substring(offset, offset + 16);
    const yHex = hex.substring(offset + 16, offset + 32);

    const lng = readFloat64(xHex, le);
    const lat = readFloat64(yHex, le);

    // Sanity check
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;

    return { lng, lat };
  } catch {
    return null;
  }
}

/** Read a 64-bit float from a 16-char hex string */
function readFloat64(hex: string, littleEndian: boolean): number {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }

  if (!littleEndian) {
    bytes.reverse();
  }

  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  for (let i = 0; i < 8; i++) {
    view.setUint8(i, bytes[i]);
  }

  return view.getFloat64(0, true); // always read as LE after reordering
}
