-- Example data: listings, requirements, and deals
-- Run AFTER seed-data.sql and after at least one user has signed up

-- First, ensure we have users to work with
-- Get the first user's ID (the person who signed up)
DO $$
DECLARE
  seller_id UUID;
  buyer_id UUID;
BEGIN
  -- Get first available user as seller
  SELECT id INTO seller_id FROM users LIMIT 1;

  -- If no users exist, we can't create listings
  IF seller_id IS NULL THEN
    RAISE NOTICE 'No users found. Sign up first, then run this script.';
    RETURN;
  END IF;

  -- Use same user as both buyer and seller for demo
  buyer_id := seller_id;

  -- Assign mines to this user
  UPDATE mines SET owner_id = seller_id WHERE owner_id IS NULL;

  -- Create example listings
  INSERT INTO listings (seller_id, source_mine_id, commodity_type, spec_sheet, volume_tonnes, price_per_tonne, currency, incoterms, loading_port_id, is_verified, status) VALUES
    (seller_id, 'b0000000-0000-0000-0000-000000000001', 'chrome',
     '{"cr2o3_pct": 42, "fe_pct": 24, "sio2_pct": 2.5, "moisture_pct": 4}'::jsonb,
     15000, 185.00, 'USD', '{FOB,CIF}', 'a0000000-0000-0000-0000-000000000001', true, 'active'),

    (seller_id, 'b0000000-0000-0000-0000-000000000002', 'chrome',
     '{"cr2o3_pct": 40, "fe_pct": 22, "sio2_pct": 3.0, "moisture_pct": 5}'::jsonb,
     8000, 172.00, 'USD', '{FOB}', 'a0000000-0000-0000-0000-000000000001', false, 'active'),

    (seller_id, 'b0000000-0000-0000-0000-000000000001', 'chrome',
     '{"cr2o3_pct": 46, "fe_pct": 26, "sio2_pct": 1.8, "moisture_pct": 3}'::jsonb,
     20000, 198.00, 'USD', '{FOB,CIF,CFR}', 'a0000000-0000-0000-0000-000000000001', true, 'active'),

    (seller_id, 'b0000000-0000-0000-0000-000000000003', 'manganese',
     '{"mn_pct": 44, "fe_pct": 6, "sio2_pct": 5.5, "moisture_pct": 3}'::jsonb,
     30000, 4.20, 'USD', '{FOB,CIF}', 'a0000000-0000-0000-0000-000000000002', true, 'active'),

    (seller_id, 'b0000000-0000-0000-0000-000000000003', 'manganese',
     '{"mn_pct": 38, "fe_pct": 8, "sio2_pct": 7.0, "moisture_pct": 4}'::jsonb,
     25000, 3.80, 'USD', '{FOB}', 'a0000000-0000-0000-0000-000000000002', false, 'active'),

    (seller_id, 'b0000000-0000-0000-0000-000000000004', 'iron_ore',
     '{"fe_pct": 62, "sio2_pct": 4.5, "al2o3_pct": 2.8, "moisture_pct": 5}'::jsonb,
     50000, 108.00, 'USD', '{FOB,CFR}', 'a0000000-0000-0000-0000-000000000002', true, 'active'),

    (seller_id, 'b0000000-0000-0000-0000-000000000004', 'iron_ore',
     '{"fe_pct": 58, "sio2_pct": 6.0, "al2o3_pct": 3.5, "moisture_pct": 6}'::jsonb,
     35000, 95.00, 'USD', '{FOB}', 'a0000000-0000-0000-0000-000000000002', false, 'active'),

    (seller_id, 'b0000000-0000-0000-0000-000000000005', 'coal',
     '{"cv_kcal": 6000, "ash_pct": 15, "volatile_pct": 24, "moisture_pct": 8}'::jsonb,
     40000, 92.00, 'USD', '{FOB}', 'a0000000-0000-0000-0000-000000000001', false, 'active'),

    (seller_id, 'b0000000-0000-0000-0000-000000000006', 'aggregates',
     '{"particle_size_mm": 19, "density": 2.65, "moisture_pct": 2}'::jsonb,
     10000, 12.50, 'ZAR', '{EXW}', 'a0000000-0000-0000-0000-000000000003', false, 'active');

  -- Create example requirements
  INSERT INTO requirements (buyer_id, commodity_type, target_spec_range, volume_needed, target_price, currency, delivery_port, incoterm, status) VALUES
    (buyer_id, 'chrome',
     '{"cr2o3_pct": {"min": 40, "max": 44}, "moisture_pct": {"max": 5}}'::jsonb,
     20000, 180.00, 'USD', 'Shanghai', 'CIF', 'active'),

    (buyer_id, 'chrome',
     '{"cr2o3_pct": {"min": 38, "max": 42}, "moisture_pct": {"max": 6}}'::jsonb,
     15000, 170.00, 'USD', 'Mersin', 'CFR', 'active'),

    (buyer_id, 'manganese',
     '{"mn_pct": {"min": 42, "max": 46}}'::jsonb,
     30000, 4.00, 'USD', 'Tianjin', 'CIF', 'active'),

    (buyer_id, 'iron_ore',
     '{"fe_pct": {"min": 60, "max": 65}}'::jsonb,
     50000, 105.00, 'USD', 'Shanghai', 'CFR', 'active'),

    (buyer_id, 'coal',
     '{"cv_kcal": {"min": 5500}}'::jsonb,
     25000, 88.00, 'USD', 'Vizag', 'CIF', 'active');

END $$;
