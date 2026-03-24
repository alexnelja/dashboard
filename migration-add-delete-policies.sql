-- Migration: Add DELETE RLS policies
-- Run this against the live database to add missing DELETE policies without recreating tables.
-- Safe to run multiple times — DROP IF EXISTS prevents errors on re-runs.

-- Listings: allow sellers to delete their own
DROP POLICY IF EXISTS "Seller can delete listings" ON listings;
CREATE POLICY "Seller can delete listings" ON listings
  FOR DELETE USING (auth.uid() = seller_id);

-- Requirements: allow buyers to delete their own
DROP POLICY IF EXISTS "Buyer can delete requirements" ON requirements;
CREATE POLICY "Buyer can delete requirements" ON requirements
  FOR DELETE USING (auth.uid() = buyer_id);

-- Users: allow account self-deletion
DROP POLICY IF EXISTS "Users can delete own profile" ON users;
CREATE POLICY "Users can delete own profile" ON users
  FOR DELETE USING (auth.uid() = id);

-- Deal milestones: allow creator to delete
DROP POLICY IF EXISTS "Creator can delete milestones" ON deal_milestones;
CREATE POLICY "Creator can delete milestones" ON deal_milestones
  FOR DELETE USING (auth.uid() = created_by);

-- Deal documents: allow uploader to delete
DROP POLICY IF EXISTS "Uploader can delete documents" ON deal_documents;
CREATE POLICY "Uploader can delete documents" ON deal_documents
  FOR DELETE USING (auth.uid() = uploaded_by);
