#!/usr/bin/env node
/**
 * Ingest LBMA precious metals prices into commodity_prices table.
 *
 * Sources:
 *   - LBMA Gold PM Fix
 *   - LBMA Silver Fix
 *   - LBMA Platinum PM Fix
 *   - LBMA Palladium PM Fix
 *
 * Free, daily, no API key required.
 * Run once to backfill (last 365 days), then daily cron maintains.
 *
 * Usage: node scripts/ingest-lbma-prices.js [--days=365]
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eawfhchyytnsewgnbznm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhd2ZoY2h5eXRuc2V3Z25iem5tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk5NjQ2OSwiZXhwIjoyMDg5NTcyNDY5fQ.57kJ6h03C6bm_z2kHuWazvZ88yiJNsU-qqsd6CF1iP0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const LBMA_FEEDS = [
  { url: 'https://prices.lbma.org.uk/json/gold_pm.json', commodity: 'gold', unit: 'per_troy_oz' },
  { url: 'https://prices.lbma.org.uk/json/silver.json', commodity: 'silver', unit: 'per_troy_oz' },
  { url: 'https://prices.lbma.org.uk/json/platinum_pm.json', commodity: 'platinum', unit: 'per_troy_oz' },
  { url: 'https://prices.lbma.org.uk/json/palladium_pm.json', commodity: 'palladium', unit: 'per_troy_oz' },
];

// Parse --days=N from CLI args (default 365)
const daysArg = process.argv.find(a => a.startsWith('--days='));
const DAYS = daysArg ? parseInt(daysArg.split('=')[1], 10) : 365;

async function main() {
  console.log(`=== LBMA Price Ingestion (last ${DAYS} days) ===\n`);

  let totalIngested = 0;

  for (const feed of LBMA_FEEDS) {
    console.log(`Fetching ${feed.commodity} from ${feed.url}...`);

    try {
      const res = await fetch(feed.url);
      if (!res.ok) {
        console.error(`  HTTP ${res.status} — skipping.`);
        continue;
      }

      const data = await res.json();
      console.log(`  Received ${data.length} total entries.`);

      // Take last N days
      const recent = data.slice(-DAYS);

      // Filter valid entries
      const rows = recent
        .filter((entry) => entry?.d && entry?.v?.[0])
        .map((entry) => ({
          commodity: feed.commodity,
          price_usd: entry.v[0],
          unit: feed.unit,
          source: 'lbma',
          period: entry.d,
          recorded_at: new Date().toISOString(),
        }));

      if (rows.length === 0) {
        console.log('  No valid entries — skipping.');
        continue;
      }

      // Delete existing LBMA entries for this commodity
      const { error: delError } = await supabase
        .from('commodity_prices')
        .delete()
        .eq('commodity', feed.commodity)
        .eq('source', 'lbma');

      if (delError) {
        console.error(`  Delete error: ${delError.message}`);
        continue;
      }

      // Insert in batches of 100
      let inserted = 0;
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const { error } = await supabase.from('commodity_prices').insert(batch);
        if (error) {
          console.error(`  Insert error (batch ${i}): ${error.message}`);
        } else {
          inserted += batch.length;
        }
      }

      console.log(`  Ingested ${inserted} prices for ${feed.commodity}.`);
      totalIngested += inserted;
    } catch (err) {
      console.error(`  Error fetching ${feed.commodity}: ${err.message}`);
    }
  }

  console.log(`\nDone. Total prices ingested: ${totalIngested}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
