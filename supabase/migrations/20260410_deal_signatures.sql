CREATE TABLE IF NOT EXISTS deal_signatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id),
  signer_id UUID NOT NULL REFERENCES users(id),
  signer_role TEXT NOT NULL, -- 'buyer' | 'seller'
  signer_name TEXT,
  signer_company TEXT,
  signed_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  document_hash TEXT, -- SHA-256 hash of the deal terms at time of signing
  UNIQUE(deal_id, signer_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_signatures_deal ON deal_signatures(deal_id);

ALTER TABLE deal_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deal participants can read signatures" ON deal_signatures
  FOR SELECT TO authenticated
  USING (deal_id IN (SELECT id FROM deals WHERE buyer_id = auth.uid() OR seller_id = auth.uid()));
CREATE POLICY "Deal participants can sign" ON deal_signatures
  FOR INSERT TO authenticated
  WITH CHECK (signer_id = auth.uid() AND deal_id IN (SELECT id FROM deals WHERE buyer_id = auth.uid() OR seller_id = auth.uid()));
