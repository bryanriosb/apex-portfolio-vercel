-- =====================================================
-- TABLE: bank_transaction_batches
-- Description: Batches de importación de extractos bancarios
-- Version: 1.0
-- Date: 2026-03-16
-- =====================================================

CREATE TABLE IF NOT EXISTS bank_transaction_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- File metadata
  file_name VARCHAR(255) NOT NULL,
  
  -- Counts
  total_records INTEGER DEFAULT 0,
  identified_count INTEGER DEFAULT 0,
  unidentified_count INTEGER DEFAULT 0,
  no_nit_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'processing', 'completed', 'failed'
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_bank_transaction_batches_business ON bank_transaction_batches(business_id);
CREATE INDEX idx_bank_transaction_batches_status ON bank_transaction_batches(status);
CREATE INDEX idx_bank_transaction_batches_created ON bank_transaction_batches(created_at DESC);

-- Enable RLS
ALTER TABLE bank_transaction_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own business batches"
  ON bank_transaction_batches FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses
      WHERE business_account_id = (auth.jwt() -> 'user_metadata' ->> 'business_account_id')::UUID
    )
  );

CREATE POLICY "Authenticated users can create batches"
  ON bank_transaction_batches FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own business batches"
  ON bank_transaction_batches FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses
      WHERE business_account_id = (auth.jwt() -> 'user_metadata' ->> 'business_account_id')::UUID
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_bank_transaction_batches_updated_at
  BEFORE UPDATE ON bank_transaction_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE bank_transaction_batches IS 'Batches de importación de extractos bancarios';
