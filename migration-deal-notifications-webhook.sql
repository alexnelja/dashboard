-- Deal notifications webhook trigger
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Enable pg_net for async HTTP from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Function that fires the Edge Function on deal changes
CREATE OR REPLACE FUNCTION notify_deal_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  payload jsonb;
BEGIN
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
  );

  -- Call Edge Function via pg_net (async, non-blocking)
  PERFORM net.http_post(
    url := 'https://eawfhchyytnsewgnbznm.supabase.co/functions/v1/deal-notifications',
    body := payload::jsonb,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhd2ZoY2h5eXRuc2V3Z25iem5tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk5NjQ2OSwiZXhwIjoyMDg5NTcyNDY5fQ.57kJ6h03C6bm_z2kHuWazvZ88yiJNsU-qqsd6CF1iP0"}'::jsonb
  );

  RETURN NEW;
END;
$$;

-- 3. Attach trigger to deals table
DROP TRIGGER IF EXISTS on_deal_change ON deals;
CREATE TRIGGER on_deal_change
  AFTER INSERT OR UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION notify_deal_change();
