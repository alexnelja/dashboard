-- Migration: Add source tracking columns to mines and harbours
-- Run this in Supabase SQL Editor or via `supabase db push`

-- Mines: source tracking and additional metadata
ALTER TABLE mines ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'seed';
ALTER TABLE mines ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE mines ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE mines ADD COLUMN IF NOT EXISTS confidence TEXT;
ALTER TABLE mines ADD COLUMN IF NOT EXISTS secondary_commodities TEXT[];
ALTER TABLE mines ADD COLUMN IF NOT EXISTS group_names TEXT;

-- Harbours: source tracking
ALTER TABLE harbours ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'seed';
ALTER TABLE harbours ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE harbours ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE harbours ADD COLUMN IF NOT EXISTS unlocode TEXT;

-- Indexes for source lookups
CREATE INDEX IF NOT EXISTS idx_mines_source ON mines(source);
CREATE INDEX IF NOT EXISTS idx_mines_source_id ON mines(source_id);
CREATE INDEX IF NOT EXISTS idx_harbours_source ON harbours(source);
CREATE INDEX IF NOT EXISTS idx_harbours_source_id ON harbours(source_id);
CREATE INDEX IF NOT EXISTS idx_harbours_unlocode ON harbours(unlocode);
