-- Migration: Update batch metrics trigger with auto-completed_at
-- Date: 2026-03-04
-- Description:
--   1. Updates increment_execution_counters() to handle all batch states properly
--   2. Adds auto-update of completed_at when all clients in batch reach final state
--   3. Handles 'sent' status from Lambda worker (counts toward completion)
--   4. Properly tracks emails_failed only in batches (not in collection_executions)

-- Drop existing trigger to recreate
DROP TRIGGER IF EXISTS increment_counters_on_client_update ON collection_clients;

-- Update the trigger function with completed_at logic
CREATE OR REPLACE FUNCTION increment_execution_counters()
RETURNS TRIGGER AS $$
DECLARE
    v_batch_id UUID;
    v_batch_total_clients INTEGER;
    v_batch_final_state_count INTEGER;
    v_should_complete_batch BOOLEAN;
BEGIN
    -- Fast path: batch_id stamped by workflow
    v_batch_id := NEW.batch_id;

    -- Fallback: find batch via client_ids array (legacy support)
    IF v_batch_id IS NULL THEN
        SELECT id INTO v_batch_id
        FROM execution_batches
        WHERE execution_id = NEW.execution_id
          AND client_ids @> ARRAY[NEW.id::text]
        LIMIT 1;
    END IF;

    -- ── emails_sent (Lambda marks client as 'sent') ────────────────────────────
    IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status <> 'sent') THEN
        UPDATE collection_executions
            SET emails_sent = emails_sent + 1
            WHERE id = NEW.execution_id;

        IF v_batch_id IS NOT NULL THEN
            UPDATE execution_batches
                SET emails_sent = emails_sent + 1
                WHERE id = v_batch_id;
        END IF;
    END IF;

    -- ── emails_delivered (webhook: 'delivered') ───────────────────────────────
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status <> 'delivered') THEN
        UPDATE collection_executions
            SET emails_delivered = emails_delivered + 1
            WHERE id = NEW.execution_id;

        IF v_batch_id IS NOT NULL THEN
            UPDATE execution_batches
                SET emails_delivered = emails_delivered + 1
                WHERE id = v_batch_id;
        END IF;
    END IF;

    -- ── emails_opened (webhook: 'opened') ─────────────────────────────────────
    IF NEW.status = 'opened' AND (OLD.status IS NULL OR OLD.status <> 'opened') THEN
        UPDATE collection_executions
            SET emails_opened = emails_opened + 1
            WHERE id = NEW.execution_id;

        IF v_batch_id IS NOT NULL THEN
            UPDATE execution_batches
                SET emails_opened = emails_opened + 1
                WHERE id = v_batch_id;
        END IF;
    END IF;

    -- ── emails_bounced (webhook: 'bounced', 'hard_bounce', 'soft_bounce') ──────
    IF NEW.status IN ('bounced', 'hard_bounce', 'soft_bounce')
       AND (OLD.status IS NULL OR OLD.status NOT IN ('bounced', 'hard_bounce', 'soft_bounce'))
    THEN
        UPDATE collection_executions
            SET emails_bounced = emails_bounced + 1
            WHERE id = NEW.execution_id;

        IF v_batch_id IS NOT NULL THEN
            UPDATE execution_batches
                SET emails_bounced = emails_bounced + 1
                WHERE id = v_batch_id;
        END IF;
    END IF;

    -- ── emails_failed (Lambda: client failed after all retries) ───────────────
    -- NOTE: Only updates execution_batches (collection_executions has no emails_failed column)
    IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status <> 'failed') THEN
        IF v_batch_id IS NOT NULL THEN
            UPDATE execution_batches
                SET emails_failed = emails_failed + 1
                WHERE id = v_batch_id;
        END IF;
    END IF;

    -- ── Auto-update completed_at when all clients in batch reach final state ───
    -- Final states: sent, delivered, opened, bounced, failed
    IF v_batch_id IS NOT NULL AND NEW.status IN ('sent', 'delivered', 'opened', 'bounced', 'failed') THEN
        -- Get total clients in batch
        SELECT total_clients INTO v_batch_total_clients
        FROM execution_batches
        WHERE id = v_batch_id;

        -- Count clients in final states
        SELECT COUNT(*) INTO v_batch_final_state_count
        FROM collection_clients
        WHERE batch_id = v_batch_id
          AND status IN ('sent', 'delivered', 'opened', 'bounced', 'failed');

        -- Check if we should mark batch as completed
        v_should_complete_batch := (v_batch_final_state_count >= v_batch_total_clients);

        IF v_should_complete_batch THEN
            UPDATE execution_batches
                SET 
                    completed_at = NOW(),
                    status = 'completed'
                WHERE id = v_batch_id
                  AND completed_at IS NULL;
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

-- Recreate trigger with status change condition
CREATE TRIGGER increment_counters_on_client_update
    AFTER UPDATE ON collection_clients
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION increment_execution_counters();

COMMENT ON FUNCTION increment_execution_counters() IS 
    'Automatically updates metrics in collection_executions and execution_batches when client status changes. Also marks batch as completed when all clients reach final state.';
