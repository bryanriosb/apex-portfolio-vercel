-- =====================================================
-- Collection Module - Database Migration
-- Version: 1.1 (FIXED)
-- Date: 2026-01-28
-- Description: Complete database schema for Collection module
-- FIXED: Table order and RLS policies to use auth.users metadata
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: collection_templates
-- Description: Email/SMS templates (MOVED UP - referenced by executions)
-- =====================================================
CREATE TABLE collection_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
  
  -- Metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_type VARCHAR(20) NOT NULL,
    -- 'email', 'sms', 'whatsapp'
  
  -- Content
  subject VARCHAR(500),
  content_html TEXT,
  content_plain TEXT NOT NULL,
  
  -- Available variables for validation
  available_variables JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for collection_templates
CREATE INDEX idx_collection_templates_account ON collection_templates(business_account_id);
CREATE INDEX idx_collection_templates_type ON collection_templates(template_type);

-- =====================================================
-- TABLE: collection_executions
-- Description: Main table for collection runs/executions
-- =====================================================
CREATE TABLE collection_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', 
    -- 'pending', 'processing', 'completed', 'failed', 'paused'
  
  -- Files
  csv_file_path TEXT NOT NULL,
  csv_file_name VARCHAR(255) NOT NULL,
  csv_row_count INTEGER DEFAULT 0,
  
  -- Configuration
  email_template_id UUID REFERENCES collection_templates(id),
  sms_template_id UUID REFERENCES collection_templates(id),
  attachment_ids UUID[] DEFAULT '{}',
  
  -- Fallback rules
  fallback_enabled BOOLEAN DEFAULT TRUE,
  fallback_days INTEGER DEFAULT 3,
  
  -- Progress counters
  total_clients INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  fallback_sent INTEGER DEFAULT 0,
  
  -- Calculated metrics
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  bounce_rate DECIMAL(5,2) DEFAULT 0.00,
  delivery_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- AWS references
  sqs_queue_url TEXT,
  lambda_execution_arn TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for collection_executions
CREATE INDEX idx_collection_executions_business ON collection_executions(business_id);
CREATE INDEX idx_collection_executions_status ON collection_executions(status);
CREATE INDEX idx_collection_executions_created ON collection_executions(created_at DESC);

-- =====================================================
-- TABLE: collection_clients
-- Description: Individual clients per execution
-- =====================================================
CREATE TABLE collection_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES collection_executions(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES business_customers(id),
  
  -- Client data snapshot from CSV
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  phone VARCHAR(50),
  nit VARCHAR(50),
  
  -- Debt data
  amount_due DECIMAL(12,2) NOT NULL,
  invoice_number VARCHAR(100),
  due_date DATE,
  days_overdue INTEGER,
  
  -- Custom variables (flexible JSON)
  custom_data JSONB DEFAULT '{}',
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- 'pending', 'queued', 'sent', 'delivered', 'opened', 'bounced', 'failed'
  
  -- Email tracking
  email_sent_at TIMESTAMPTZ,
  email_delivered_at TIMESTAMPTZ,
  email_opened_at TIMESTAMPTZ,
  email_bounce_type VARCHAR(50),
  email_bounce_reason TEXT,
  
  -- Fallback tracking
  fallback_required BOOLEAN DEFAULT FALSE,
  fallback_sent_at TIMESTAMPTZ,
  fallback_type VARCHAR(20),
  fallback_status VARCHAR(50),
  
  -- AWS SES
  ses_message_id VARCHAR(255),
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for collection_clients
CREATE INDEX idx_collection_clients_execution ON collection_clients(execution_id);
CREATE INDEX idx_collection_clients_customer ON collection_clients(customer_id);
CREATE INDEX idx_collection_clients_status ON collection_clients(status);
CREATE INDEX idx_collection_clients_email ON collection_clients(email);

-- =====================================================
-- TABLE: collection_events
-- Description: Event log for observability
-- =====================================================
CREATE TABLE collection_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES collection_executions(id) ON DELETE CASCADE,
  client_id UUID REFERENCES collection_clients(id) ON DELETE CASCADE,
  
  -- Event type
  event_type VARCHAR(100) NOT NULL,
    -- 'execution_started', 'execution_completed', 'execution_failed',
    -- 'batch_started', 'batch_completed', 
    -- 'email_queued', 'email_sent', 'email_delivered', 'email_opened', 'email_bounced',
    -- 'fallback_triggered', 'fallback_sent', 'retry_attempted', 'error'
  
  -- Event metadata
  event_status VARCHAR(50) NOT NULL DEFAULT 'success',
  event_data JSONB DEFAULT '{}',
  error_details TEXT,
  
  -- AWS metadata
  aws_request_id VARCHAR(255),
  lambda_function_name VARCHAR(255),
  
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for collection_events
CREATE INDEX idx_collection_events_execution ON collection_events(execution_id);
CREATE INDEX idx_collection_events_client ON collection_events(client_id);
CREATE INDEX idx_collection_events_type ON collection_events(event_type);
CREATE INDEX idx_collection_events_timestamp ON collection_events(timestamp DESC);

-- =====================================================
-- TABLE: collection_attachments
-- Description: Persistent attachments library
-- =====================================================
CREATE TABLE collection_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
  
  -- Metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_type VARCHAR(100),
  file_size_bytes BIGINT,
  
  -- Storage
  storage_path TEXT NOT NULL,
  storage_bucket VARCHAR(255) DEFAULT 'collection-attachments',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for collection_attachments
CREATE INDEX idx_collection_attachments_account ON collection_attachments(business_account_id);

-- =====================================================
-- TABLE: collection_config
-- Description: Module configuration per business account
-- =====================================================
CREATE TABLE collection_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id UUID NOT NULL UNIQUE REFERENCES business_accounts(id) ON DELETE CASCADE,
  
  -- Email config
  email_from_address VARCHAR(255) NOT NULL,
  email_from_name VARCHAR(255) NOT NULL,
  email_reply_to VARCHAR(255),
  
  -- SES Config
  ses_configuration_set VARCHAR(255),
  ses_region VARCHAR(50) DEFAULT 'us-east-1',
  
  -- Fallback config
  fallback_enabled BOOLEAN DEFAULT TRUE,
  fallback_default_days INTEGER DEFAULT 3,
  sms_from_number VARCHAR(50),
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  
  -- Internal alerts
  alert_on_high_bounce BOOLEAN DEFAULT TRUE,
  bounce_threshold_percent DECIMAL(5,2) DEFAULT 5.00,
  alert_recipients TEXT[],
  
  -- Limits
  max_emails_per_execution INTEGER DEFAULT 10000,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for collection_config
CREATE INDEX idx_collection_config_account ON collection_config(business_account_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- FIXED: Using auth.users metadata instead of user_businesses
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE collection_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_config ENABLE ROW LEVEL SECURITY;

-- Policies for collection_executions
CREATE POLICY "Users can view own business executions"
  ON collection_executions FOR SELECT
  USING (
    business_id = (auth.jwt() -> 'user_metadata' ->> 'business_id')::UUID
    OR
    business_id IN (
      SELECT (jsonb_array_elements((auth.jwt() -> 'user_metadata' -> 'businesses'))::jsonb ->> 'id')::UUID
    )
  );

CREATE POLICY "Authenticated users can create executions"
  ON collection_executions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own business executions"
  ON collection_executions FOR UPDATE
  USING (
    business_id = (auth.jwt() -> 'user_metadata' ->> 'business_id')::UUID
    OR
    business_id IN (
      SELECT (jsonb_array_elements((auth.jwt() -> 'user_metadata' -> 'businesses'))::jsonb ->> 'id')::UUID
    )
  );

CREATE POLICY "Users can delete own business executions"
  ON collection_executions FOR DELETE
  USING (
    business_id = (auth.jwt() -> 'user_metadata' ->> 'business_id')::UUID
    OR
    business_id IN (
      SELECT (jsonb_array_elements((auth.jwt() -> 'user_metadata' -> 'businesses'))::jsonb ->> 'id')::UUID
    )
  );

-- Policies for collection_clients
CREATE POLICY "Users can view clients from own executions"
  ON collection_clients FOR SELECT
  USING (
    execution_id IN (
      SELECT id FROM collection_executions
      WHERE business_id = (auth.jwt() -> 'user_metadata' ->> 'business_id')::UUID
      OR business_id IN (
        SELECT (jsonb_array_elements((auth.jwt() -> 'user_metadata' -> 'businesses'))::jsonb ->> 'id')::UUID
      )
    )
  );

CREATE POLICY "System can insert clients"
  ON collection_clients FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "System can update clients"
  ON collection_clients FOR UPDATE
  USING (
    execution_id IN (
      SELECT id FROM collection_executions
      WHERE business_id = (auth.jwt() -> 'user_metadata' ->> 'business_id')::UUID
      OR business_id IN (
        SELECT (jsonb_array_elements((auth.jwt() -> 'user_metadata' -> 'businesses'))::jsonb ->> 'id')::UUID
      )
    )
  );

-- Policies for collection_events
CREATE POLICY "Users can view events from own executions"
  ON collection_events FOR SELECT
  USING (
    execution_id IN (
      SELECT id FROM collection_executions
      WHERE business_id = (auth.jwt() -> 'user_metadata' ->> 'business_id')::UUID
      OR business_id IN (
        SELECT (jsonb_array_elements((auth.jwt() -> 'user_metadata' -> 'businesses'))::jsonb ->> 'id')::UUID
      )
    )
  );

CREATE POLICY "System can insert events"
  ON collection_events FOR INSERT
  WITH CHECK (true);

-- Policies for collection_templates
CREATE POLICY "Users can view own templates"
  ON collection_templates FOR SELECT
  USING (
    business_account_id = (auth.jwt() -> 'user_metadata' ->> 'business_account_id')::UUID
  );

CREATE POLICY "Users can create templates"
  ON collection_templates FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own templates"
  ON collection_templates FOR UPDATE
  USING (
    business_account_id = (auth.jwt() -> 'user_metadata' ->> 'business_account_id')::UUID
  );

CREATE POLICY "Users can delete own templates"
  ON collection_templates FOR DELETE
  USING (
    business_account_id = (auth.jwt() -> 'user_metadata' ->> 'business_account_id')::UUID
  );

-- Policies for collection_attachments
CREATE POLICY "Users can view own attachments"
  ON collection_attachments FOR SELECT
  USING (
    business_account_id = (auth.jwt() -> 'user_metadata' ->> 'business_account_id')::UUID
  );

CREATE POLICY "Users can create attachments"
  ON collection_attachments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own attachments"
  ON collection_attachments FOR UPDATE
  USING (
    business_account_id = (auth.jwt() -> 'user_metadata' ->> 'business_account_id')::UUID
  );

CREATE POLICY "Users can delete own attachments"
  ON collection_attachments FOR DELETE
  USING (
    business_account_id = (auth.jwt() -> 'user_metadata' ->> 'business_account_id')::UUID
  );

-- Policies for collection_config
CREATE POLICY "Users can view own config"
  ON collection_config FOR SELECT
  USING (
    business_account_id = (auth.jwt() -> 'user_metadata' ->> 'business_account_id')::UUID
  );

CREATE POLICY "Users can create config"
  ON collection_config FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own config"
  ON collection_config FOR UPDATE
  USING (
    business_account_id = (auth.jwt() -> 'user_metadata' ->> 'business_account_id')::UUID
  );

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_collection_executions_updated_at
  BEFORE UPDATE ON collection_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collection_clients_updated_at
  BEFORE UPDATE ON collection_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collection_templates_updated_at
  BEFORE UPDATE ON collection_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collection_attachments_updated_at
  BEFORE UPDATE ON collection_attachments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collection_config_updated_at
  BEFORE UPDATE ON collection_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate metrics in collection_executions
CREATE OR REPLACE FUNCTION calculate_execution_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate metrics when client status changes
  UPDATE collection_executions
  SET 
    open_rate = CASE 
      WHEN emails_delivered > 0 THEN 
        ROUND((emails_opened::DECIMAL / emails_delivered::DECIMAL) * 100, 2)
      ELSE 0
    END,
    bounce_rate = CASE
      WHEN emails_sent > 0 THEN 
        ROUND((emails_bounced::DECIMAL / emails_sent::DECIMAL) * 100, 2)
      ELSE 0
    END,
    delivery_rate = CASE
      WHEN emails_sent > 0 THEN 
        ROUND((emails_delivered::DECIMAL / emails_sent::DECIMAL) * 100, 2)
      ELSE 0
    END,
    updated_at = NOW()
  WHERE id = NEW.execution_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_metrics_on_client_change
  AFTER UPDATE OF status ON collection_clients
  FOR EACH ROW EXECUTE FUNCTION calculate_execution_metrics();

-- Auto-increment counters on collection_executions
CREATE OR REPLACE FUNCTION increment_execution_counters()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment appropriate counter based on status change
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    UPDATE collection_executions 
    SET emails_sent = emails_sent + 1
    WHERE id = NEW.execution_id;
  END IF;
  
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    UPDATE collection_executions 
    SET emails_delivered = emails_delivered + 1
    WHERE id = NEW.execution_id;
  END IF;
  
  IF NEW.status = 'opened' AND (OLD.status IS NULL OR OLD.status != 'opened') THEN
    UPDATE collection_executions 
    SET emails_opened = emails_opened + 1
    WHERE id = NEW.execution_id;
  END IF;
  
  IF NEW.status = 'bounced' AND (OLD.status IS NULL OR OLD.status != 'bounced') THEN
    UPDATE collection_executions 
    SET emails_bounced = emails_bounced + 1
    WHERE id = NEW.execution_id;
  END IF;
  
  IF NEW.fallback_sent_at IS NOT NULL AND (OLD.fallback_sent_at IS NULL) THEN
    UPDATE collection_executions 
    SET fallback_sent = fallback_sent + 1
    WHERE id = NEW.execution_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_counters_on_client_update
  AFTER UPDATE ON collection_clients
  FOR EACH ROW EXECUTE FUNCTION increment_execution_counters();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE collection_executions IS 'Main table for collection email campaign executions';
COMMENT ON TABLE collection_clients IS 'Individual clients/recipients per execution with tracking data';
COMMENT ON TABLE collection_events IS 'Event log for observability and debugging';
COMMENT ON TABLE collection_templates IS 'Reusable email and SMS templates';
COMMENT ON TABLE collection_attachments IS 'Persistent attachment library';
COMMENT ON TABLE collection_config IS 'Module configuration per business account';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
