-- Full Seed Data — Mining Materials Aggregator Platform
-- Run AFTER supabase-setup.sql and seed-data.sql (adds to existing data, no deletes)
-- Use ON CONFLICT DO NOTHING for harbours/mines to avoid duplicates

-- ============================================================
-- 1. NEW DESTINATION PORTS
-- ============================================================
INSERT INTO harbours (id, name, location, country, type) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Qinzhou',        ST_MakePoint(108.6470,  21.6832)::geography, 'CN', 'destination'),
  ('d0000000-0000-0000-0000-000000000002', 'Tianjin',         ST_MakePoint(117.7100,  38.9800)::geography, 'CN', 'destination'),
  ('d0000000-0000-0000-0000-000000000003', 'Qingdao',         ST_MakePoint(120.3826,  36.0671)::geography, 'CN', 'destination'),
  ('d0000000-0000-0000-0000-000000000004', 'Lianyungang',     ST_MakePoint(119.1800,  34.7300)::geography, 'CN', 'destination'),
  ('d0000000-0000-0000-0000-000000000010', 'Mundra',          ST_MakePoint( 69.5659,  22.7483)::geography, 'IN', 'destination'),
  ('d0000000-0000-0000-0000-000000000011', 'Visakhapatnam',   ST_MakePoint( 83.3000,  17.4000)::geography, 'IN', 'destination'),
  ('d0000000-0000-0000-0000-000000000012', 'Paradip',         ST_MakePoint( 86.6167,  20.3167)::geography, 'IN', 'destination'),
  ('d0000000-0000-0000-0000-000000000020', 'Iskenderun',      ST_MakePoint( 36.1684,  36.5894)::geography, 'TR', 'destination'),
  ('d0000000-0000-0000-0000-000000000030', 'Kashima',         ST_MakePoint(140.6167,  35.9000)::geography, 'JP', 'destination'),
  ('d0000000-0000-0000-0000-000000000040', 'Gwangyang',       ST_MakePoint(127.8200,  34.9400)::geography, 'KR', 'destination'),
  ('d0000000-0000-0000-0000-000000000050', 'Port Qasim',      ST_MakePoint( 67.3500,  24.7860)::geography, 'PK', 'destination')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. NEW LOADING PORTS
-- ============================================================
INSERT INTO harbours (id, name, location, country, type) VALUES
  ('a0000000-0000-0000-0000-000000000009', 'Port Ngqura', ST_MakePoint(25.6667, -33.7667)::geography, 'ZA', 'loading'),
  ('a0000000-0000-0000-0000-000000000010', 'Gqeberha',    ST_MakePoint(25.6149, -33.9611)::geography, 'ZA', 'loading')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. NEW MINES (~26 additional, existing 6 untouched)
-- ============================================================
INSERT INTO mines (id, name, location, country, region, commodities, nearest_harbour_id) VALUES
  -- Chrome — Western Limb (Rustenburg / North West)
  ('b0000000-0000-0000-0000-000000000010', 'Kroondal Mine',       ST_MakePoint(27.31, -25.67)::geography, 'ZA', 'North West',    '{chrome}',     'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000011', 'Waterval Mine',       ST_MakePoint(27.28, -25.69)::geography, 'ZA', 'North West',    '{chrome}',     'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000012', 'Samancor Mooinooi',   ST_MakePoint(27.48, -25.57)::geography, 'ZA', 'North West',    '{chrome}',     'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000013', 'Ruighoek Mine',       ST_MakePoint(27.32, -25.65)::geography, 'ZA', 'North West',    '{chrome}',     'a0000000-0000-0000-0000-000000000001'),
  -- Chrome — Eastern Limb (Steelpoort area, Limpopo)
  ('b0000000-0000-0000-0000-000000000014', 'Helena Mine',         ST_MakePoint(30.1302, -24.9893)::geography, 'ZA', 'Limpopo',   '{chrome}',     'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000015', 'Thorncliffe Mine',    ST_MakePoint(30.14, -24.96)::geography,    'ZA', 'Limpopo',   '{chrome}',     'a0000000-0000-0000-0000-000000000001'),
  -- Chrome — Limpopo (further north, route to Maputo)
  ('b0000000-0000-0000-0000-000000000016', 'Mecklenburg Mine',    ST_MakePoint(29.58, -24.20)::geography, 'ZA', 'Limpopo',      '{chrome}',     'a0000000-0000-0000-0000-000000000004'),
  ('b0000000-0000-0000-0000-000000000017', 'Vlakpoort Mine',      ST_MakePoint(29.62, -24.15)::geography, 'ZA', 'Limpopo',      '{chrome}',     'a0000000-0000-0000-0000-000000000004'),
  ('b0000000-0000-0000-0000-000000000018', 'Moeijelik Mine',      ST_MakePoint(30.05, -24.85)::geography, 'ZA', 'Limpopo',      '{chrome}',     'a0000000-0000-0000-0000-000000000001'),
  -- Manganese — Northern Cape (Kalahari Manganese Field)
  ('b0000000-0000-0000-0000-000000000020', 'Mamatwan Mine',       ST_MakePoint(22.92, -27.25)::geography, 'ZA', 'Northern Cape', '{manganese}', 'a0000000-0000-0000-0000-000000000009'),
  ('b0000000-0000-0000-0000-000000000021', 'Wessels Mine',        ST_MakePoint(22.86, -27.08)::geography, 'ZA', 'Northern Cape', '{manganese}', 'a0000000-0000-0000-0000-000000000009'),
  ('b0000000-0000-0000-0000-000000000022', 'Nchwaning Mine',      ST_MakePoint(22.87, -27.11)::geography, 'ZA', 'Northern Cape', '{manganese}', 'a0000000-0000-0000-0000-000000000009'),
  ('b0000000-0000-0000-0000-000000000023', 'Gloria Mine',         ST_MakePoint(22.89, -27.10)::geography, 'ZA', 'Northern Cape', '{manganese}', 'a0000000-0000-0000-0000-000000000009'),
  ('b0000000-0000-0000-0000-000000000024', 'Black Rock Mine',     ST_MakePoint(22.85, -27.09)::geography, 'ZA', 'Northern Cape', '{manganese}', 'a0000000-0000-0000-0000-000000000009'),
  ('b0000000-0000-0000-0000-000000000025', 'UMK Mine',            ST_MakePoint(22.95, -27.32)::geography, 'ZA', 'Northern Cape', '{manganese}', 'a0000000-0000-0000-0000-000000000009'),
  -- Iron Ore — Northern Cape
  ('b0000000-0000-0000-0000-000000000030', 'Kolomela Mine',       ST_MakePoint(22.9598, -28.3943)::geography, 'ZA', 'Northern Cape', '{iron_ore}', 'a0000000-0000-0000-0000-000000000002'),
  -- Coal — Mpumalanga (COALlink corridor)
  ('b0000000-0000-0000-0000-000000000040', 'Khwezela Colliery',   ST_MakePoint(29.13, -25.92)::geography, 'ZA', 'Mpumalanga',   '{coal}',       'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000041', 'Zibulo Colliery',     ST_MakePoint(29.36, -26.01)::geography, 'ZA', 'Mpumalanga',   '{coal}',       'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000042', 'Mafube Colliery',     ST_MakePoint(29.75, -25.82)::geography, 'ZA', 'Mpumalanga',   '{coal}',       'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000043', 'Goedehoop Colliery',  ST_MakePoint(29.20, -25.95)::geography, 'ZA', 'Mpumalanga',   '{coal}',       'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000044', 'Isibonelo Colliery',  ST_MakePoint(29.22, -26.35)::geography, 'ZA', 'Mpumalanga',   '{coal}',       'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000045', 'Wolvekrans Complex',  ST_MakePoint(29.50, -25.80)::geography, 'ZA', 'Mpumalanga',   '{coal}',       'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000046', 'Twistdraai Colliery', ST_MakePoint(29.15, -26.42)::geography, 'ZA', 'Mpumalanga',   '{coal}',       'a0000000-0000-0000-0000-000000000001'),
  -- Aggregates
  ('b0000000-0000-0000-0000-000000000050', 'AfriSam Coedmore',    ST_MakePoint(30.8667, -29.8667)::geography, 'ZA', 'KwaZulu-Natal', '{aggregates}', 'a0000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000051', 'Lafarge Lichtenburg', ST_MakePoint(26.16, -26.15)::geography,    'ZA', 'North West',    '{aggregates}', 'a0000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. ROUTES WITH TRANSPORT MODE + RAIL CORRIDOR GEOMETRIES
-- ============================================================

-- ----------------------------------------------------------------
-- Rail corridors (with real linestring waypoints)
-- ----------------------------------------------------------------

-- Sishen-Saldanha iron ore line (Kolomela → Saldanha via Sishen corridor)
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000030', 'b0000000-0000-0000-0000-000000000030',
   'a0000000-0000-0000-0000-000000000002', 861, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(22.9598, -28.3943),
     ST_MakePoint(22.9964, -27.7379),
     ST_MakePoint(23.0445, -27.6945),
     ST_MakePoint(22.0,   -28.5833),
     ST_MakePoint(21.15,  -29.35),
     ST_MakePoint(19.45,  -30.9667),
     ST_MakePoint(18.5,   -31.6667),
     ST_MakePoint(17.985, -33.0302)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- COALlink corridor — one shared geometry, one route per colliery → Richards Bay
-- Khwezela
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000040', 'b0000000-0000-0000-0000-000000000040',
   'a0000000-0000-0000-0000-000000000001', 490, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(29.13,   -25.92),
     ST_MakePoint(29.2339, -25.8743),
     ST_MakePoint(29.05,   -26.05),
     ST_MakePoint(29.9833, -26.5333),
     ST_MakePoint(30.8167, -27.0),
     ST_MakePoint(30.8,    -27.7667),
     ST_MakePoint(31.9,    -28.75),
     ST_MakePoint(32.0377, -28.783)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- Zibulo
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000041', 'b0000000-0000-0000-0000-000000000041',
   'a0000000-0000-0000-0000-000000000001', 475, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(29.36,   -26.01),
     ST_MakePoint(29.2339, -25.8743),
     ST_MakePoint(29.9833, -26.5333),
     ST_MakePoint(30.8167, -27.0),
     ST_MakePoint(30.8,    -27.7667),
     ST_MakePoint(31.9,    -28.75),
     ST_MakePoint(32.0377, -28.783)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- Mafube
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000042', 'b0000000-0000-0000-0000-000000000042',
   'a0000000-0000-0000-0000-000000000001', 510, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(29.75,   -25.82),
     ST_MakePoint(29.2339, -25.8743),
     ST_MakePoint(29.9833, -26.5333),
     ST_MakePoint(30.8167, -27.0),
     ST_MakePoint(30.8,    -27.7667),
     ST_MakePoint(31.9,    -28.75),
     ST_MakePoint(32.0377, -28.783)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- Goedehoop
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000043', 'b0000000-0000-0000-0000-000000000043',
   'a0000000-0000-0000-0000-000000000001', 485, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(29.20,   -25.95),
     ST_MakePoint(29.2339, -25.8743),
     ST_MakePoint(29.9833, -26.5333),
     ST_MakePoint(30.8167, -27.0),
     ST_MakePoint(30.8,    -27.7667),
     ST_MakePoint(31.9,    -28.75),
     ST_MakePoint(32.0377, -28.783)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- Isibonelo
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000044', 'b0000000-0000-0000-0000-000000000044',
   'a0000000-0000-0000-0000-000000000001', 500, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(29.22,   -26.35),
     ST_MakePoint(29.2339, -25.8743),
     ST_MakePoint(29.9833, -26.5333),
     ST_MakePoint(30.8167, -27.0),
     ST_MakePoint(30.8,    -27.7667),
     ST_MakePoint(31.9,    -28.75),
     ST_MakePoint(32.0377, -28.783)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- Wolvekrans
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000045', 'b0000000-0000-0000-0000-000000000045',
   'a0000000-0000-0000-0000-000000000001', 470, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(29.50,   -25.80),
     ST_MakePoint(29.2339, -25.8743),
     ST_MakePoint(29.9833, -26.5333),
     ST_MakePoint(30.8167, -27.0),
     ST_MakePoint(30.8,    -27.7667),
     ST_MakePoint(31.9,    -28.75),
     ST_MakePoint(32.0377, -28.783)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- Twistdraai
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000046', 'b0000000-0000-0000-0000-000000000046',
   'a0000000-0000-0000-0000-000000000001', 495, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(29.15,   -26.42),
     ST_MakePoint(29.2339, -25.8743),
     ST_MakePoint(29.9833, -26.5333),
     ST_MakePoint(30.8167, -27.0),
     ST_MakePoint(30.8,    -27.7667),
     ST_MakePoint(31.9,    -28.75),
     ST_MakePoint(32.0377, -28.783)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- Manganese → Port Ngqura (rail)
-- Mamatwan
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000020',
   'a0000000-0000-0000-0000-000000000009', 820, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(22.92,   -27.25),
     ST_MakePoint(22.9704, -27.2021),
     ST_MakePoint(23.0667, -28.35),
     ST_MakePoint(24.7499, -28.7282),
     ST_MakePoint(24.0167, -30.65),
     ST_MakePoint(25.6167, -32.1667),
     ST_MakePoint(25.7833, -33.0833),
     ST_MakePoint(25.6667, -33.7667)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- Wessels
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000021',
   'a0000000-0000-0000-0000-000000000009', 810, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(22.86,   -27.08),
     ST_MakePoint(22.9704, -27.2021),
     ST_MakePoint(23.0667, -28.35),
     ST_MakePoint(24.7499, -28.7282),
     ST_MakePoint(24.0167, -30.65),
     ST_MakePoint(25.6167, -32.1667),
     ST_MakePoint(25.7833, -33.0833),
     ST_MakePoint(25.6667, -33.7667)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- Nchwaning
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000022',
   'a0000000-0000-0000-0000-000000000009', 815, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(22.87,   -27.11),
     ST_MakePoint(22.9704, -27.2021),
     ST_MakePoint(23.0667, -28.35),
     ST_MakePoint(24.7499, -28.7282),
     ST_MakePoint(24.0167, -30.65),
     ST_MakePoint(25.6167, -32.1667),
     ST_MakePoint(25.7833, -33.0833),
     ST_MakePoint(25.6667, -33.7667)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- Gloria
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000023', 'b0000000-0000-0000-0000-000000000023',
   'a0000000-0000-0000-0000-000000000009', 812, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(22.89,   -27.10),
     ST_MakePoint(22.9704, -27.2021),
     ST_MakePoint(23.0667, -28.35),
     ST_MakePoint(24.7499, -28.7282),
     ST_MakePoint(24.0167, -30.65),
     ST_MakePoint(25.6167, -32.1667),
     ST_MakePoint(25.7833, -33.0833),
     ST_MakePoint(25.6667, -33.7667)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- Black Rock
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000024', 'b0000000-0000-0000-0000-000000000024',
   'a0000000-0000-0000-0000-000000000009', 808, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(22.85,   -27.09),
     ST_MakePoint(22.9704, -27.2021),
     ST_MakePoint(23.0667, -28.35),
     ST_MakePoint(24.7499, -28.7282),
     ST_MakePoint(24.0167, -30.65),
     ST_MakePoint(25.6167, -32.1667),
     ST_MakePoint(25.7833, -33.0833),
     ST_MakePoint(25.6667, -33.7667)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- UMK
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000025', 'b0000000-0000-0000-0000-000000000025',
   'a0000000-0000-0000-0000-000000000009', 825, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(22.95,   -27.32),
     ST_MakePoint(22.9704, -27.2021),
     ST_MakePoint(23.0667, -28.35),
     ST_MakePoint(24.7499, -28.7282),
     ST_MakePoint(24.0167, -30.65),
     ST_MakePoint(25.6167, -32.1667),
     ST_MakePoint(25.7833, -33.0833),
     ST_MakePoint(25.6667, -33.7667)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- Chrome Eastern Limb → Richards Bay via rail
-- ----------------------------------------------------------------
-- Helena
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000014',
   'a0000000-0000-0000-0000-000000000001', 400, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(30.1302, -24.9893),
     ST_MakePoint(30.8167, -27.0),
     ST_MakePoint(30.8,    -27.7667),
     ST_MakePoint(31.9,    -28.75),
     ST_MakePoint(32.0377, -28.783)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- Thorncliffe
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000015',
   'a0000000-0000-0000-0000-000000000001', 395, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(30.14,   -24.96),
     ST_MakePoint(30.8167, -27.0),
     ST_MakePoint(30.8,    -27.7667),
     ST_MakePoint(31.9,    -28.75),
     ST_MakePoint(32.0377, -28.783)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- Moeijelik (Eastern Limb adjacent → Richards Bay rail)
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000018',
   'a0000000-0000-0000-0000-000000000001', 410, 'rail',
   ST_MakeLine(ARRAY[
     ST_MakePoint(30.05,   -24.85),
     ST_MakePoint(30.8167, -27.0),
     ST_MakePoint(30.8,    -27.7667),
     ST_MakePoint(31.9,    -28.75),
     ST_MakePoint(32.0377, -28.783)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- Chrome Western Limb → Richards Bay (road)
-- ----------------------------------------------------------------
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode) VALUES
  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 530, 'road'),
  ('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 525, 'road'),
  ('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 510, 'road'),
  ('c0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 528, 'road')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- Chrome Limpopo → Maputo (road)
-- ----------------------------------------------------------------
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode, route_geometry) VALUES
  ('c0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000016',
   'a0000000-0000-0000-0000-000000000004', 550, 'road',
   ST_MakeLine(ARRAY[
     ST_MakePoint(29.58,   -24.20),
     ST_MakePoint(27.2421, -25.6745),
     ST_MakePoint(28.2293, -25.7479),
     ST_MakePoint(30.9694, -25.4753),
     ST_MakePoint(31.95,   -25.4333),
     ST_MakePoint(32.5887, -25.9537)
   ])::geography),
  ('c0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000017',
   'a0000000-0000-0000-0000-000000000004', 545, 'road',
   ST_MakeLine(ARRAY[
     ST_MakePoint(29.62,   -24.15),
     ST_MakePoint(27.2421, -25.6745),
     ST_MakePoint(28.2293, -25.7479),
     ST_MakePoint(30.9694, -25.4753),
     ST_MakePoint(31.95,   -25.4333),
     ST_MakePoint(32.5887, -25.9537)
   ])::geography)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- Aggregates → Durban (road)
-- ----------------------------------------------------------------
INSERT INTO routes (id, origin_mine_id, harbour_id, distance_km, transport_mode) VALUES
  ('c0000000-0000-0000-0000-000000000050', 'b0000000-0000-0000-0000-000000000050', 'a0000000-0000-0000-0000-000000000003', 12, 'road'),
  ('c0000000-0000-0000-0000-000000000051', 'b0000000-0000-0000-0000-000000000051', 'a0000000-0000-0000-0000-000000000003', 280, 'road')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. LISTINGS AND REQUIREMENTS
--    Use a DO $$ block to resolve the first user dynamically
-- ============================================================
DO $$
DECLARE
  v_seller_id UUID;
  v_buyer_id  UUID;
BEGIN
  -- Grab the first seller (or any user) from the users table
  SELECT id INTO v_seller_id FROM users WHERE role IN ('seller', 'both') ORDER BY created_at LIMIT 1;
  SELECT id INTO v_buyer_id  FROM users WHERE role IN ('buyer',  'both') ORDER BY created_at LIMIT 1;

  -- Fall back to the same user if only one exists
  IF v_buyer_id IS NULL THEN v_buyer_id := v_seller_id; END IF;
  IF v_seller_id IS NULL THEN
    RAISE NOTICE 'No users found — skipping listings/requirements inserts. Create a user first.';
    RETURN;
  END IF;

  -- ------------------------------------------------------------------
  -- LISTINGS (15+)
  -- ------------------------------------------------------------------
  INSERT INTO listings
    (seller_id, source_mine_id, commodity_type, spec_sheet,
     volume_tonnes, price_per_tonne, currency, incoterms,
     loading_port_id, is_verified, allocation_mode, status)
  VALUES
    -- Chrome — Western Limb → Richards Bay
    (v_seller_id, 'b0000000-0000-0000-0000-000000000010', 'chrome',
     '{"cr2o3": 42.5, "fe": 27.0, "sio2": 4.0}',
     15000, 195, 'USD', '{FOB}',
     'a0000000-0000-0000-0000-000000000001', false, 'open', 'active'),

    (v_seller_id, 'b0000000-0000-0000-0000-000000000011', 'chrome',
     '{"cr2o3": 41.0, "fe": 28.5, "sio2": 5.0}',
     20000, 185, 'USD', '{FOB,CFR}',
     'a0000000-0000-0000-0000-000000000001', false, 'open', 'active'),

    (v_seller_id, 'b0000000-0000-0000-0000-000000000012', 'chrome',
     '{"cr2o3": 43.0, "fe": 26.5, "sio2": 3.8}',
     12000, 205, 'USD', '{FOB}',
     'a0000000-0000-0000-0000-000000000001', true, 'open', 'active'),

    (v_seller_id, 'b0000000-0000-0000-0000-000000000013', 'chrome',
     '{"cr2o3": 40.5, "fe": 29.0, "sio2": 5.5}',
     18000, 178, 'USD', '{CFR}',
     'a0000000-0000-0000-0000-000000000001', false, 'open', 'active'),

    -- Chrome — Eastern Limb → Richards Bay (rail)
    (v_seller_id, 'b0000000-0000-0000-0000-000000000014', 'chrome',
     '{"cr2o3": 44.5, "fe": 25.0, "sio2": 3.2}',
     25000, 215, 'USD', '{FOB}',
     'a0000000-0000-0000-0000-000000000001', true, 'open', 'active'),

    (v_seller_id, 'b0000000-0000-0000-0000-000000000015', 'chrome',
     '{"cr2o3": 43.8, "fe": 25.8, "sio2": 3.5}',
     10000, 210, 'USD', '{FOB,CFR}',
     'a0000000-0000-0000-0000-000000000001', false, 'open', 'active'),

    -- Chrome — Limpopo → Maputo
    (v_seller_id, 'b0000000-0000-0000-0000-000000000016', 'chrome',
     '{"cr2o3": 41.5, "fe": 28.0, "sio2": 4.5}',
     30000, 180, 'USD', '{FOB}',
     'a0000000-0000-0000-0000-000000000004', false, 'open', 'active'),

    -- Manganese — Northern Cape → Port Ngqura
    (v_seller_id, 'b0000000-0000-0000-0000-000000000020', 'manganese',
     '{"mn": 37.5, "fe": 5.5, "sio2": 5.0, "al2o3": 1.8}',
     40000, 290, 'USD', '{FOB}',
     'a0000000-0000-0000-0000-000000000009', true, 'open', 'active'),

    (v_seller_id, 'b0000000-0000-0000-0000-000000000022', 'manganese',
     '{"mn": 38.0, "fe": 5.0, "sio2": 4.8, "al2o3": 1.6}',
     35000, 305, 'USD', '{FOB,CFR}',
     'a0000000-0000-0000-0000-000000000009', true, 'open', 'active'),

    (v_seller_id, 'b0000000-0000-0000-0000-000000000024', 'manganese',
     '{"mn": 36.8, "fe": 6.0, "sio2": 5.5, "al2o3": 2.0}',
     50000, 275, 'USD', '{FOB}',
     'a0000000-0000-0000-0000-000000000009', false, 'open', 'active'),

    -- Iron Ore — Kolomela → Saldanha (rail)
    (v_seller_id, 'b0000000-0000-0000-0000-000000000030', 'iron_ore',
     '{"fe": 64.5, "sio2": 4.2, "al2o3": 1.5, "p": 0.05}',
     80000, 118, 'USD', '{FOB}',
     'a0000000-0000-0000-0000-000000000002', true, 'open', 'active'),

    -- Coal — Mpumalanga → Richards Bay (rail)
    (v_seller_id, 'b0000000-0000-0000-0000-000000000040', 'coal',
     '{"cv_gar": 5800, "ash": 15.0, "sulphur": 0.8, "moisture": 8.0}',
     60000, 97, 'USD', '{FOB}',
     'a0000000-0000-0000-0000-000000000001', false, 'open', 'active'),

    (v_seller_id, 'b0000000-0000-0000-0000-000000000041', 'coal',
     '{"cv_gar": 6000, "ash": 13.5, "sulphur": 0.7, "moisture": 7.5}',
     45000, 105, 'USD', '{FOB,CFR}',
     'a0000000-0000-0000-0000-000000000001', true, 'open', 'active'),

    (v_seller_id, 'b0000000-0000-0000-0000-000000000043', 'coal',
     '{"cv_gar": 5600, "ash": 16.0, "sulphur": 0.9, "moisture": 9.0}',
     70000, 90, 'USD', '{FOB}',
     'a0000000-0000-0000-0000-000000000001', false, 'open', 'active'),

    -- Aggregates — KwaZulu-Natal → Durban
    (v_seller_id, 'b0000000-0000-0000-0000-000000000050', 'aggregates',
     '{"size_mm": 20, "crushing_value": 18, "aav": 8}',
     5000, 32, 'USD', '{EXW,DAP}',
     'a0000000-0000-0000-0000-000000000003', false, 'open', 'active'),

    -- Aggregates — North West → Durban
    (v_seller_id, 'b0000000-0000-0000-0000-000000000051', 'aggregates',
     '{"size_mm": 19, "crushing_value": 20, "aav": 9}',
     8000, 28, 'USD', '{EXW}',
     'a0000000-0000-0000-0000-000000000003', false, 'open', 'active')

  ON CONFLICT DO NOTHING;

  -- ------------------------------------------------------------------
  -- REQUIREMENTS (8+) — targeting real destination ports
  -- ------------------------------------------------------------------
  INSERT INTO requirements
    (buyer_id, commodity_type, target_spec_range,
     volume_needed, target_price, currency,
     delivery_port, incoterm, status)
  VALUES
    -- Chrome → Qinzhou (smelter-grade UG2)
    (v_buyer_id, 'chrome',
     '{"cr2o3": {"min": 42.0}, "fe": {"max": 28.0}, "sio2": {"max": 5.0}}',
     50000, 200, 'USD', 'Qinzhou', 'CFR', 'active'),

    -- Chrome → Tianjin (high-grade)
    (v_buyer_id, 'chrome',
     '{"cr2o3": {"min": 44.0}, "fe": {"max": 26.0}}',
     30000, 220, 'USD', 'Tianjin', 'CFR', 'active'),

    -- Chrome → Iskenderun (ferrochrome feed)
    (v_buyer_id, 'chrome',
     '{"cr2o3": {"min": 40.0}, "sio2": {"max": 6.0}}',
     25000, 185, 'USD', 'Iskenderun', 'CFR', 'active'),

    -- Manganese → Qingdao (35%+ Mn)
    (v_buyer_id, 'manganese',
     '{"mn": {"min": 35.0}, "fe": {"max": 7.0}}',
     60000, 295, 'USD', 'Qingdao', 'CFR', 'active'),

    -- Manganese → Paradip (India)
    (v_buyer_id, 'manganese',
     '{"mn": {"min": 36.0}, "sio2": {"max": 6.0}}',
     40000, 285, 'USD', 'Paradip', 'CFR', 'active'),

    -- Iron Ore → Kashima (Japan blast furnace)
    (v_buyer_id, 'iron_ore',
     '{"fe": {"min": 63.0}, "sio2": {"max": 5.0}, "al2o3": {"max": 2.0}}',
     100000, 115, 'USD', 'Kashima', 'CFR', 'active'),

    -- Coal → Gwangyang (Korean steel)
    (v_buyer_id, 'coal',
     '{"cv_gar": {"min": 5500}, "ash": {"max": 17.0}, "sulphur": {"max": 1.0}}',
     80000, 100, 'USD', 'Gwangyang', 'CFR', 'active'),

    -- Coal → Port Qasim (Pakistan power)
    (v_buyer_id, 'coal',
     '{"cv_gar": {"min": 5000}, "ash": {"max": 20.0}, "moisture": {"max": 12.0}}',
     120000, 88, 'USD', 'Port Qasim', 'CFR', 'active'),

    -- Manganese → Visakhapatnam
    (v_buyer_id, 'manganese',
     '{"mn": {"min": 37.0}, "fe": {"max": 6.0}}',
     35000, 300, 'USD', 'Visakhapatnam', 'CFR', 'active')

  ON CONFLICT DO NOTHING;

END $$;
