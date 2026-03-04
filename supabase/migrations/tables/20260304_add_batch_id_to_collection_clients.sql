-- Migration: Add batch_id to collection_clients
-- Date: 2026-03-04
-- Description:
--   Adds batch_id column to collection_clients to enable granular batch-level
--   metric tracking. The batch_id is populated by the workflow after batches
--   are created and is used by triggers to update execution_batches metrics.

-- Add batch_id column
ALTER TABLE collection_clients
    ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES execution_batches(id);

-- Create index for fast batch lookups
CREATE INDEX IF NOT EXISTS idx_collection_clients_batch_id
    ON collection_clients(batch_id)
    WHERE batch_id IS NOT NULL;

COMMENT ON COLUMN collection_clients.batch_id IS 
    'Reference to the execution batch this client belongs to. Used for granular batch-level metrics tracking.';
