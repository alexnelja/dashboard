-- Deal Messages
CREATE TABLE IF NOT EXISTS deal_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'user',  -- 'user' | 'system'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_messages_deal ON deal_messages(deal_id, created_at);

ALTER TABLE deal_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deal participants can read messages" ON deal_messages
  FOR SELECT TO authenticated
  USING (deal_id IN (SELECT id FROM deals WHERE buyer_id = auth.uid() OR seller_id = auth.uid()));
CREATE POLICY "Deal participants can send messages" ON deal_messages
  FOR INSERT TO authenticated
  WITH CHECK (deal_id IN (SELECT id FROM deals WHERE buyer_id = auth.uid() OR seller_id = auth.uid()));

-- KYC Documents
CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  doc_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  verified BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_user ON kyc_documents(user_id);
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own KYC docs" ON kyc_documents FOR ALL TO authenticated USING (user_id = auth.uid());
