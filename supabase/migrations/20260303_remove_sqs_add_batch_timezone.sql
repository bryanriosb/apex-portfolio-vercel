-- Migration: Remove SQS Infrastructure / Add timezone to execution_batches
-- Date: 2026-03-03
-- Description:
--   1. Add timezone column to execution_batches (populated from businesses.timezone)
--   2. Drop batch_queue_messages table (no longer needed, SQS removed)
--   3. Drop scheduler_locks table (replaced by atomic status='processing' transition)
--   4. Clean legacy SQS columns from collection_executions and execution_batches

BEGIN;

-- 1. Add timezone to execution_batches
ALTER TABLE execution_batches
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(100);

-- Populate from businesses via collection_executions
UPDATE execution_batches eb
SET timezone = b.timezone
FROM collection_executions ce
JOIN businesses b ON b.id = ce.business_id
WHERE eb.execution_id = ce.id
  AND eb.timezone IS NULL;

-- 2. Drop batch_queue_messages (SQS tracking table, no longer needed)
DROP TABLE IF EXISTS batch_queue_messages CASCADE;

-- 3. Drop scheduler_locks (replaced by optimistic locking via status='processing')
DROP TABLE IF EXISTS scheduler_locks CASCADE;

-- 4. Remove legacy SQS columns
ALTER TABLE collection_executions
  DROP COLUMN IF EXISTS sqs_queue_url;

ALTER TABLE execution_batches
  DROP COLUMN IF EXISTS sqs_message_id;

ALTER TABLE execution_batches
  DROP COLUMN IF EXISTS sqs_receipt_handle;

COMMIT;
