-- Lab/Inspector verification requests
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id),
  inspector_type TEXT NOT NULL,  -- 'lab_assay' | 'draft_survey' | 'loading_inspection' | 'discharge_inspection'
  inspector_company TEXT,         -- 'SGS' | 'Bureau Veritas' | 'Intertek' | 'Alfred H Knight'
  inspector_email TEXT,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  requested_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  results JSONB,                  -- Lab results / survey data
  report_file_url TEXT,           -- Uploaded report PDF
  notes TEXT,
  requested_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_verification_requests_deal ON verification_requests(deal_id);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
-- Deal participants can read
CREATE POLICY "Deal participants read verification requests" ON verification_requests
  FOR SELECT TO authenticated
  USING (deal_id IN (SELECT id FROM deals WHERE buyer_id = auth.uid() OR seller_id = auth.uid()));
-- Deal participants can create
CREATE POLICY "Deal participants create verification requests" ON verification_requests
  FOR INSERT TO authenticated
  WITH CHECK (deal_id IN (SELECT id FROM deals WHERE buyer_id = auth.uid() OR seller_id = auth.uid()));
