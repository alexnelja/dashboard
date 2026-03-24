-- Seed data for deals (run after seed-data-full.sql)
-- Uses existing listing and user IDs from the full seed data

-- First, get some listing and user IDs to reference
-- This assumes seed-data-full.sql has been run and we have active listings

-- Insert sample deals at various stages
-- (In practice, you'd use actual UUIDs from your seeded data)
-- Run this in Supabase SQL Editor after verifying your listing/user IDs

DO $$
DECLARE
  v_listing RECORD;
  v_buyer_id UUID;
  v_deal_id UUID;
BEGIN
  -- Get a buyer (someone who isn't the seller)
  SELECT id INTO v_buyer_id FROM users WHERE role IN ('buyer', 'both') LIMIT 1;

  -- Create deals from the first 5 active listings
  FOR v_listing IN
    SELECT l.id, l.seller_id, l.commodity_type, l.volume_tonnes, l.price_per_tonne, l.currency, l.incoterms[1] as incoterm
    FROM listings l
    WHERE l.status = 'active' AND l.seller_id != v_buyer_id
    LIMIT 5
  LOOP
    -- Deal 1: Interest stage
    IF v_listing.incoterm IS NOT NULL THEN
      INSERT INTO deals (listing_id, buyer_id, seller_id, commodity_type, volume_tonnes, agreed_price, currency, incoterm, spec_tolerances, price_adjustment_rules, escrow_status, status)
      VALUES (v_listing.id, v_buyer_id, v_listing.seller_id, v_listing.commodity_type, v_listing.volume_tonnes, v_listing.price_per_tonne, v_listing.currency, v_listing.incoterm, '{}', '{}', 'pending_deposit', 'interest')
      RETURNING id INTO v_deal_id;
    END IF;
  END LOOP;

  -- Advance one deal to in_transit with milestones
  SELECT id INTO v_deal_id FROM deals WHERE status = 'interest' LIMIT 1;
  IF v_deal_id IS NOT NULL THEN
    UPDATE deals SET status = 'in_transit', escrow_status = 'held', escrow_amount = agreed_price * volume_tonnes, second_accept_at = now() - interval '7 days' WHERE id = v_deal_id;
    INSERT INTO deal_milestones (deal_id, milestone_type, timestamp, location_name, created_by) VALUES
      (v_deal_id, 'loaded', now() - interval '5 days', 'Mine Site', v_buyer_id),
      (v_deal_id, 'departed_port', now() - interval '3 days', 'Richards Bay', v_buyer_id),
      (v_deal_id, 'in_transit', now() - interval '1 day', 'Indian Ocean', v_buyer_id);
  END IF;

  -- Advance another deal to negotiation
  SELECT id INTO v_deal_id FROM deals WHERE status = 'interest' LIMIT 1;
  IF v_deal_id IS NOT NULL THEN
    UPDATE deals SET status = 'negotiation' WHERE id = v_deal_id;
  END IF;

  -- Advance another to completed
  SELECT id INTO v_deal_id FROM deals WHERE status = 'interest' LIMIT 1;
  IF v_deal_id IS NOT NULL THEN
    UPDATE deals SET status = 'completed', escrow_status = 'released', escrow_amount = agreed_price * volume_tonnes, second_accept_at = now() - interval '30 days' WHERE id = v_deal_id;
  END IF;
END $$;
