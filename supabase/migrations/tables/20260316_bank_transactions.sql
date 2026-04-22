-- =====================================================
-- TABLE: bank_transactions
-- Description: Transacciones bancarias importadas de extractos
-- Version: 1.0
-- Date: 2026-03-16
-- =====================================================

CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Relations (nullable for unidentified transactions)
  execution_id UUID REFERENCES collection_executions(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES business_customers(id) ON DELETE SET NULL,
  import_batch_id UUID REFERENCES bank_transaction_batches(id) ON DELETE SET NULL,
  
  -- Transaction data
  transaction_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  bank_name VARCHAR(50) NOT NULL,
  
  -- Extract data (raw from bank statement)
  customer_nit VARCHAR(50),
  customer_name_extract VARCHAR(255),
  reference VARCHAR(100),
  description TEXT,
  agent_name VARCHAR(255),
  
  -- Status fields
  receipt_status VARCHAR(20),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'unidentified',
    -- 'identified', 'unidentified', 'no_nit', 'duplicate', 'manual'
  
  -- Matching metadata
  matched_at TIMESTAMPTZ,
  matched_by UUID REFERENCES auth.users(id),
  
  -- Import metadata
  source_file_name VARCHAR(255),
  source_sheet_name VARCHAR(100),
  raw_data JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_bank_transactions_business ON bank_transactions(business_id);
CREATE INDEX idx_bank_transactions_customer ON bank_transactions(customer_id);
CREATE INDEX idx_bank_transactions_execution ON bank_transactions(execution_id);
CREATE INDEX idx_bank_transactions_batch ON bank_transactions(import_batch_id);
CREATE INDEX idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date DESC);
CREATE INDEX idx_bank_transactions_nit ON bank_transactions(customer_nit);
CREATE INDEX idx_bank_transactions_bank ON bank_transactions(bank_name);
CREATE INDEX idx_bank_transactions_amount ON bank_transactions(amount);

-- Partial unique index for duplicate detection
-- Only applies when reference IS NOT NULL
CREATE UNIQUE INDEX idx_bank_transactions_unique 
  ON bank_transactions(business_id, transaction_date, amount, customer_nit) 
  WHERE customer_nit IS NOT NULL AND customer_nit != '';

-- Enable RLS
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own business transactions"
  ON bank_transactions FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses
      WHERE business_account_id = (auth.jwt() -> 'user_metadata' ->> 'business_account_id')::UUID
    )
  );

CREATE POLICY "Authenticated users can create transactions"
  ON bank_transactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own business transactions"
  ON bank_transactions FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses
      WHERE business_account_id = (auth.jwt() -> 'user_metadata' ->> 'business_account_id')::UUID
    )
  );

CREATE POLICY "Users can delete own business transactions"
  ON bank_transactions FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses
      WHERE business_account_id = (auth.jwt() -> 'user_metadata' ->> 'business_account_id')::UUID
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_bank_transactions_updated_at
  BEFORE UPDATE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE bank_transactions IS 'Transacciones bancarias importadas de extractos para conciliación de cobro';
COMMENT ON COLUMN bank_transactions.customer_name_extract IS 'Nombre del cliente según aparece en el extracto bancario (solo referencia)';
COMMENT ON COLUMN bank_transactions.customer_nit IS 'NIT del cliente según aparece en el extracto bancario';
COMMENT ON COLUMN bank_transactions.status IS 'identified=matcheado, unidentified=sin match, no_nit=sin NIT, duplicate=duplicado, manual=match manual';
