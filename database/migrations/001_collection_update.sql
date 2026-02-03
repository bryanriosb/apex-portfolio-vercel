-- Migration file for Collection Module Updates

-- Add new columns to collection_executions table
ALTER TABLE collection_executions 
ADD COLUMN IF NOT EXISTS execution_mode TEXT NOT NULL DEFAULT 'immediate' CHECK (execution_mode IN ('immediate', 'scheduled')),
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS eventbridge_rule_name TEXT;

-- Create index for scheduled executions to easily find upcoming tasks
CREATE INDEX IF NOT EXISTS idx_collection_executions_scheduled_at ON collection_executions (scheduled_at);

-- Add JSONB validation for invoices in collection_clients table
-- First, ensure the invoices column exists and is JSONB (it should be already, but being safe)
-- ALTER TABLE collection_clients ALTER COLUMN invoices TYPE JSONB USING invoices::JSONB;

-- Add check constraint to ensure invoices is an array
ALTER TABLE collection_clients 
ADD CONSTRAINT check_invoices_is_array 
CHECK (jsonb_typeof(invoices) = 'array');

-- Comment on columns
COMMENT ON COLUMN collection_executions.execution_mode IS 'Mode of execution: immediate or scheduled';
COMMENT ON COLUMN collection_executions.scheduled_at IS 'Timestamp for scheduled execution';
COMMENT ON COLUMN collection_executions.eventbridge_rule_name IS 'Name of the EventBridge rule for scheduled execution';
