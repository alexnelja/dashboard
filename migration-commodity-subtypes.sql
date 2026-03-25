-- Migration: Add commodity subtype and price confidence columns to listings
-- Date: 2026-03-25

-- Add subtype to listings (e.g. 'chrome_met_lumpy', 'iron_fines_standard')
ALTER TABLE listings ADD COLUMN IF NOT EXISTS commodity_subtype TEXT;

-- Price confidence level: manual (user-set), high, medium, low (engine-estimated)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS price_confidence TEXT DEFAULT 'manual';

-- Full price breakdown from the estimation engine (JSON)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS price_breakdown JSONB;

-- Index for querying listings by subtype
CREATE INDEX IF NOT EXISTS idx_listings_commodity_subtype ON listings (commodity_subtype);

-- Comment for documentation
COMMENT ON COLUMN listings.commodity_subtype IS 'Commodity subtype key from lib/commodity-subtypes.ts';
COMMENT ON COLUMN listings.price_confidence IS 'Price confidence: manual | high | medium | low';
COMMENT ON COLUMN listings.price_breakdown IS 'JSON breakdown from price estimation engine';
