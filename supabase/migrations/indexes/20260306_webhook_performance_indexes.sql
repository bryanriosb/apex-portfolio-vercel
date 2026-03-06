-- Migration: Add indexes for webhook performance optimization
-- Date: 2026-03-06
-- Description: 
--   Adds indexes to optimize webhook queries on collection_clients
--   These indexes speed up lookups by message_id and email
--   WITHOUT changing any application logic

-- Enable pg_trgm extension for GIN indexes (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for message_id lookups (used in webhook handler)
-- Using expression index on JSONB text extraction
CREATE INDEX IF NOT EXISTS idx_collection_clients_message_id 
ON collection_clients ((custom_data ->> 'message_id'));

-- Index for email lookups in custom_data (used in email fallback)
CREATE INDEX IF NOT EXISTS idx_collection_clients_email 
ON collection_clients ((custom_data ->> 'email'));

-- Index for execution_id + status (used in dashboard queries)
CREATE INDEX IF NOT EXISTS idx_collection_clients_execution_status 
ON collection_clients (execution_id, status);

-- Index for collection_events to speed up duplicate checking
CREATE INDEX IF NOT EXISTS idx_collection_events_client_type_message 
ON collection_events (client_id, event_type, ((event_data ->> 'message_id')));

COMMENT ON INDEX idx_collection_clients_message_id IS 
    'Optimizes webhook lookups by message_id';
COMMENT ON INDEX idx_collection_clients_email IS 
    'Optimizes webhook email fallback lookups';
COMMENT ON INDEX idx_collection_clients_execution_status IS 
    'Optimizes dashboard queries by execution and status';
COMMENT ON INDEX idx_collection_events_client_type_message IS 
    'Optimizes duplicate event checking in webhooks';
