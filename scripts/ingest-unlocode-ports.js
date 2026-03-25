#!/usr/bin/env node
/**
 * Ingest seaports from the UN/LOCODE CSV into the harbours table.
 *
 * Source: scripts/data-sources/unlocode.csv (~116k rows)
 * Filters to entries where Function[0] === '1' (port) and coordinates exist.
 * Upserts on the `unlocode` field so existing sea-ports-npm data is preserved.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eawfhchyytnsewgnbznm.supabase.co';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhd2ZoY2h5eXRuc2V3Z25iem5tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk5NjQ2OSwiZXhwIjoyMDg5NTcyNDY5fQ.57kJ6h03C6bm_z2kHuWazvZ88yiJNsU-qqsd6CF1iP0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- Country classification for harbour type ---

const LOADING_COUNTRIES = new Set([
  'ZA', 'AU', 'BR', 'IN', 'MZ', 'ZW', 'GA', 'GH', 'SL', 'TR',
  'KZ', 'PH', 'ID', 'CO', 'CL', 'PE', 'RU', 'UA', 'CN', 'MN',
]);

const DESTINATION_COUNTRIES = new Set([
  'CN', 'JP', 'KR', 'IN', 'DE', 'NL', 'BE', 'US', 'GB', 'FR', 'IT', 'ES',
]);

function harbourType(countryCode) {
  const isLoading = LOADING_COUNTRIES.has(countryCode);
  const isDestination = DESTINATION_COUNTRIES.has(countryCode);
  if (isLoading && isDestination) return 'both';
  if (isLoading) return 'loading';
  if (isDestination) return 'destination';
  return 'both';
}

// --- Coordinate parsing ---
// UN/LOCODE format: "5348N 00953E" => 53 deg 48 min N, 009 deg 53 min E
// Can also be: "5348N 953E" (without leading zeros), or empty

function parseUnlocodeCoords(raw) {
  if (!raw || !raw.trim()) return null;

  const match = raw.trim().match(
    /^(\d{2,4})([NS])\s+(\d{2,5})([EW])$/
  );
  if (!match) return null;

  const latRaw = match[1];
  const latDir = match[2];
  const lngRaw = match[3];
  const lngDir = match[4];

  let latDeg, latMin, lngDeg, lngMin;

  if (latRaw.length <= 2) {
    latDeg = parseInt(latRaw, 10);
    latMin = 0;
  } else {
    latMin = parseInt(latRaw.slice(-2), 10);
    latDeg = parseInt(latRaw.slice(0, -2), 10);
  }

  if (lngRaw.length <= 2) {
    lngDeg = parseInt(lngRaw, 10);
    lngMin = 0;
  } else {
    lngMin = parseInt(lngRaw.slice(-2), 10);
    lngDeg = parseInt(lngRaw.slice(0, -2), 10);
  }

  let lat = latDeg + latMin / 60;
  let lng = lngDeg + lngMin / 60;

  if (latDir === 'S') lat = -lat;
  if (lngDir === 'W') lng = -lng;

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

// --- Simple CSV row parser (handles quoted fields with commas) ---

function parseCSVRow(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// --- Main ---

async function main() {
  const csvPath = path.join(__dirname, 'data-sources', 'unlocode.csv');
  console.log(`Reading ${csvPath}...`);

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());

  // Skip header
  const header = parseCSVRow(lines[0]);
  console.log(`CSV headers: ${header.join(', ')}`);
  console.log(`Total CSV rows: ${lines.length - 1}`);

  // Find column indices
  const colIdx = {};
  header.forEach((h, i) => { colIdx[h.trim()] = i; });

  const ports = [];
  let noCoords = 0;
  let notPort = 0;

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVRow(lines[i]);
    const func = (fields[colIdx['Function']] || '').trim();
    // Position 0 of Function field must be '1' to indicate a port
    if (!func || func[0] !== '1') {
      notPort++;
      continue;
    }

    const coordsRaw = (fields[colIdx['Coordinates']] || '').trim();
    const coords = parseUnlocodeCoords(coordsRaw);
    if (!coords) {
      noCoords++;
      continue;
    }

    const country = (fields[colIdx['Country']] || '').trim();
    const location = (fields[colIdx['Location']] || '').trim();
    const name = (fields[colIdx['NameWoDiacritics']] || '').trim();
    const unlocode = country + location;

    if (!country || !location || !name) continue;

    ports.push({
      name,
      country,
      lat: coords.lat,
      lng: coords.lng,
      unlocode,
      type: harbourType(country),
    });
  }

  console.log(`\nFiltered to ${ports.length} seaports with coordinates`);
  console.log(`  Skipped (not port): ${notPort}`);
  console.log(`  Skipped (no coords): ${noCoords}`);

  if (ports.length === 0) {
    console.log('No ports to upsert.');
    process.exit(1);
  }

  // --- Deduplicate by name+country (DB has unique constraint on that pair) ---
  // Keep the first occurrence for each name+country combo
  const seen = new Set();
  const dedupedPorts = [];
  for (const p of ports) {
    const key = `${p.name}||${p.country}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedPorts.push(p);
  }
  console.log(`After dedup by name+country: ${dedupedPorts.length} unique ports (removed ${ports.length - dedupedPorts.length} duplicates)`);

  // --- Batch upsert on (name, country) unique constraint ---
  const BATCH_SIZE = 500;
  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < dedupedPorts.length; i += BATCH_SIZE) {
    const batch = dedupedPorts.slice(i, i + BATCH_SIZE);
    const now = new Date().toISOString();

    const records = batch.map(p => ({
      name: p.name,
      location: `SRID=4326;POINT(${p.lng} ${p.lat})`,
      country: p.country,
      type: p.type,
      source: 'unlocode',
      source_id: p.unlocode,
      unlocode: p.unlocode,
      last_verified_at: now,
    }));

    const { error } = await supabase
      .from('harbours')
      .upsert(records, { onConflict: 'name,country', ignoreDuplicates: false });

    if (error) {
      console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} error: ${error.message}`);
      // Fall back to one-by-one
      for (const rec of records) {
        const { error: singleErr } = await supabase
          .from('harbours')
          .upsert([rec], { onConflict: 'name,country', ignoreDuplicates: false });
        if (singleErr) {
          console.error(`    Error ${rec.unlocode}: ${singleErr.message}`);
          errors++;
        } else {
          upserted++;
        }
      }
    } else {
      upserted += records.length;
    }

    const progress = Math.min(i + BATCH_SIZE, ports.length);
    console.log(`  Progress: ${progress}/${ports.length} (${((progress / ports.length) * 100).toFixed(1)}%)`);
  }

  console.log('\n--- UN/LOCODE Port Ingestion Complete ---');
  console.log(`Seaports from CSV: ${ports.length}`);
  console.log(`Unique (name+country): ${dedupedPorts.length}`);
  console.log(`Upserted: ${upserted}`);
  console.log(`Errors: ${errors}`);

  // Final count
  const { count } = await supabase
    .from('harbours')
    .select('*', { count: 'exact', head: true });
  console.log(`Total harbours in DB: ${count}`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
