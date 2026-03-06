-- Migration: Optimize trigger to handle duplicate events and partial failures
-- Date: 2026-03-06
-- Description: 
--   Fixes the counter increment logic to handle:
--   1. Duplicate webhook events from providers (Brevo retries)
--   2. Partial failures (event inserted but client update failed)
--   3. Multiple status transitions without double-counting
--   
--   APPROACH: Track which metrics have been counted per client using timestamp fields

-- ============================================
-- STEP 1: Add tracking columns to collection_clients
-- ============================================

-- Add columns to track when client was counted in each metric
-- These will be NULL if not yet counted, or have timestamp if counted
ALTER TABLE collection_clients 
ADD COLUMN IF NOT EXISTS counted_as_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS counted_as_delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS counted_as_opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS counted_as_bounced_at TIMESTAMPTZ;

-- Add indexes for the new columns (optional, for analytics queries)
CREATE INDEX IF NOT EXISTS idx_collection_clients_counted_sent 
ON collection_clients (execution_id) WHERE counted_as_sent_at IS NOT NULL;

-- ============================================
-- STEP 2: Update existing data to mark already-counted clients
-- ============================================

-- Mark clients that have already been counted by the trigger
-- This prevents double-counting when we deploy the new trigger
UPDATE collection_clients
SET 
    counted_as_sent_at = CASE WHEN status IN ('sent', 'delivered', 'opened', 'bounced') THEN NOW() END,
    counted_as_delivered_at = CASE WHEN status IN ('delivered', 'opened') THEN NOW() END,
    counted_as_opened_at = CASE WHEN status = 'opened' THEN NOW() END,
    counted_as_bounced_at = CASE WHEN status = 'bounced' THEN NOW() END
WHERE execution_id IN (
    SELECT id FROM collection_executions 
    WHERE status IN ('processing', 'completed')
);

-- ============================================
-- STEP 3: Create optimized trigger function
-- ============================================

CREATE OR REPLACE FUNCTION increment_execution_counters_optimized()
RETURNS TRIGGER AS $$
DECLARE
    v_batch_id UUID;
    v_should_count BOOLEAN;
BEGIN
    -- Fast path: batch_id stamped by workflow
    v_batch_id := NEW.batch_id;

    -- Fallback: find batch via client_ids array (legacy support)
    IF v_batch_id IS NULL THEN
        SELECT id INTO v_batch_id
        FROM execution_batches
        WHERE execution_id = NEW.execution_id
          AND NEW.id = ANY(client_ids)
        LIMIT 1;
    END IF;

    -- ── emails_sent (Lambda marks client as 'sent') ────────────────────────────
    -- Only count if: status changed to 'sent' AND not already counted
    IF NEW.status = 'sent' 
       AND (OLD.status IS NULL OR OLD.status <> 'sent')
       AND NEW.counted_as_sent_at IS NULL 
    THEN
        UPDATE collection_executions
            SET emails_sent = emails_sent + 1
            WHERE id = NEW.execution_id;

        IF v_batch_id IS NOT NULL THEN
            UPDATE execution_batches
                SET emails_sent = emails_sent + 1
                WHERE id = v_batch_id;
        END IF;
        
        -- Mark as counted
        NEW.counted_as_sent_at := NOW();
    END IF;

    -- ── emails_delivered (webhook: 'delivered') ───────────────────────────────
    IF NEW.status = 'delivered' 
       AND (OLD.status IS NULL OR OLD.status <> 'delivered')
       AND NEW.counted_as_delivered_at IS NULL 
    THEN
        UPDATE collection_executions
            SET emails_delivered = emails_delivered + 1
            WHERE id = NEW.execution_id;

        IF v_batch_id IS NOT NULL THEN
            UPDATE execution_batches
                SET emails_delivered = emails_delivered + 1
                WHERE id = v_batch_id;
        END IF;
        
        NEW.counted_as_delivered_at := NOW();
    END IF;

    -- ── emails_opened (webhook: 'opened') ─────────────────────────────────────
    IF NEW.status = 'opened' 
       AND (OLD.status IS NULL OR OLD.status <> 'opened')
       AND NEW.counted_as_opened_at IS NULL 
    THEN
        UPDATE collection_executions
            SET emails_opened = emails_opened + 1
            WHERE id = NEW.execution_id;

        IF v_batch_id IS NOT NULL THEN
            UPDATE execution_batches
                SET emails_opened = emails_opened + 1
                WHERE id = v_batch_id;
        END IF;
        
        NEW.counted_as_opened_at := NOW();
    END IF;

    -- ── emails_bounced (webhook: 'bounced', 'hard_bounce', 'soft_bounce') ──────
    IF NEW.status IN ('bounced', 'hard_bounce', 'soft_bounce')
       AND (OLD.status IS NULL OR OLD.status NOT IN ('bounced', 'hard_bounce', 'soft_bounce'))
       AND NEW.counted_as_bounced_at IS NULL 
    THEN
        UPDATE collection_executions
            SET emails_bounced = emails_bounced + 1
            WHERE id = NEW.execution_id;

        IF v_batch_id IS NOT NULL THEN
            UPDATE execution_batches
                SET emails_bounced = emails_bounced + 1
                WHERE id = v_batch_id;
        END IF;
        
        NEW.counted_as_bounced_at := NOW();
    END IF;

    -- ── emails_failed (Lambda: client failed after all retries) ───────────────
    IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status <> 'failed') THEN
        IF v_batch_id IS NOT NULL THEN
            UPDATE execution_batches
                SET emails_failed = emails_failed + 1
                WHERE id = v_batch_id;
        END IF;
    END IF;

    -- ── Recalculate rates on collection_executions ─────────────────────────────
    UPDATE collection_executions
    SET
        open_rate     = CASE WHEN emails_delivered > 0
                            THEN ROUND((emails_opened::numeric    / emails_delivered) * 100, 2)
                            ELSE 0 END,
        bounce_rate   = CASE WHEN emails_sent > 0
                            THEN ROUND((emails_bounced::numeric   / emails_sent)      * 100, 2)
                            ELSE 0 END,
        delivery_rate = CASE WHEN emails_sent > 0
                            THEN ROUND((emails_delivered::numeric / emails_sent)      * 100, 2)
                            ELSE 0 END
    WHERE id = NEW.execution_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Replace the old trigger with optimized version
-- ============================================

DROP TRIGGER IF EXISTS increment_counters_on_client_update ON collection_clients;

CREATE TRIGGER increment_counters_on_client_update
    BEFORE UPDATE ON collection_clients
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION increment_execution_counters_optimized();

-- ============================================
-- STEP 5: Add comments
-- ============================================

COMMENT ON FUNCTION increment_execution_counters_optimized() IS 
    'Optimized counter increment with duplicate detection. Uses counted_as_*_at columns to prevent double-counting.';

COMMENT ON COLUMN collection_clients.counted_as_sent_at IS 
    'Timestamp when client was first counted as sent. Prevents duplicate counting on retries.';
COMMENT ON COLUMN collection_clients.counted_as_delivered_at IS 
    'Timestamp when client was first counted as delivered. Prevents duplicate counting on retries.';
COMMENT ON COLUMN collection_clients.counted_as_opened_at IS 
    'Timestamp when client was first counted as opened. Prevents duplicate counting on retries.';
COMMENT ON COLUMN collection_clients.counted_as_bounced_at IS 
    'Timestamp when client was first counted as bounced. Prevents duplicate counting on retries.';
