-- Migration: Fix batch metrics trigger (v2 — corrected column names)
--
-- Fixes:
-- 1. CTE SELECT 1 was silent no-op → replaced with explicit IF/UPDATE blocks
-- 2. 'emails_failed' does NOT exist on collection_executions (only on execution_batches)
--    → removed that invalid column reference
-- 3. Added batch_id to collection_clients for fast batch resolution
--
-- Metrics flow:
--   Lambda worker: marks client 'accepted' or 'failed' → trigger fires
--   Webhook (Brevo/SES): marks client 'delivered', 'opened', 'bounced' → trigger fires
--   Each event: updates BOTH collection_executions AND execution_batches atomically

-- ─── 1. batch_id on collection_clients (idempotent) ──────────────────────────
ALTER TABLE collection_clients
    ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES execution_batches(id);

CREATE INDEX IF NOT EXISTS idx_collection_clients_batch_id
    ON collection_clients(batch_id)
    WHERE batch_id IS NOT NULL;

-- ─── 2. Unified trigger function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_execution_counters()
RETURNS TRIGGER AS $$
DECLARE
    v_batch_id UUID;
BEGIN
    -- Fast path: batch_id stamped by Lambda worker
    v_batch_id := NEW.batch_id;

    -- Fallback: find batch via client_ids array
    IF v_batch_id IS NULL THEN
        SELECT id INTO v_batch_id
        FROM execution_batches
        WHERE execution_id = NEW.execution_id
          AND client_ids @> ARRAY[NEW.id]   -- uuid[] @> uuid[], no cast needed
        LIMIT 1;
    END IF;

    -- ── emails_sent (Lambda marks client as 'accepted') ────────────────────────
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
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
    -- NOTE: collection_executions has no emails_failed column → only update batch
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

-- ─── 3. Drop and recreate trigger ────────────────────────────────────────────
DROP TRIGGER IF EXISTS increment_counters_on_client_update ON collection_clients;

CREATE TRIGGER increment_counters_on_client_update
    AFTER UPDATE ON collection_clients
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION increment_execution_counters();

-- ─── 4. Backfill execution 6d62c79f from current client statuses ─────────────
-- Recalculates execution-level counters from scratch (safe to re-run)
UPDATE collection_executions ce
SET
    emails_sent      = (SELECT COUNT(*) FROM collection_clients
                        WHERE execution_id = ce.id
                          AND status IN ('accepted','delivered','opened','bounced','hard_bounce','soft_bounce')),
    emails_delivered = (SELECT COUNT(*) FROM collection_clients
                        WHERE execution_id = ce.id AND status IN ('delivered','opened')),
    emails_opened    = (SELECT COUNT(*) FROM collection_clients
                        WHERE execution_id = ce.id AND status = 'opened'),
    emails_bounced   = (SELECT COUNT(*) FROM collection_clients
                        WHERE execution_id = ce.id AND status IN ('bounced','hard_bounce','soft_bounce'))
WHERE ce.id = '6d62c79f-1b42-48ed-bde6-a35284ec4bbe';

-- Recalculate rates for that execution
UPDATE collection_executions
SET
    open_rate     = CASE WHEN emails_delivered > 0 THEN ROUND((emails_opened::numeric    / emails_delivered) * 100, 2) ELSE 0 END,
    bounce_rate   = CASE WHEN emails_sent     > 0 THEN ROUND((emails_bounced::numeric    / emails_sent)      * 100, 2) ELSE 0 END,
    delivery_rate = CASE WHEN emails_sent     > 0 THEN ROUND((emails_delivered::numeric  / emails_sent)      * 100, 2) ELSE 0 END
WHERE id = '6d62c79f-1b42-48ed-bde6-a35284ec4bbe';

-- Backfill execution_batches using batch_id on collection_clients
-- (will be NULL for existing rows, so we fallback to client_ids array)
UPDATE execution_batches eb
SET
    emails_sent      = (
        SELECT COUNT(*) FROM collection_clients cc
        WHERE (cc.batch_id = eb.id OR (cc.batch_id IS NULL AND eb.client_ids @> ARRAY[cc.id]))
          AND cc.status IN ('accepted','delivered','opened','bounced','hard_bounce','soft_bounce')
    ),
    emails_delivered = (
        SELECT COUNT(*) FROM collection_clients cc
        WHERE (cc.batch_id = eb.id OR (cc.batch_id IS NULL AND eb.client_ids @> ARRAY[cc.id]))
          AND cc.status IN ('delivered','opened')
    ),
    emails_opened    = (
        SELECT COUNT(*) FROM collection_clients cc
        WHERE (cc.batch_id = eb.id OR (cc.batch_id IS NULL AND eb.client_ids @> ARRAY[cc.id]))
          AND cc.status = 'opened'
    ),
    emails_bounced   = (
        SELECT COUNT(*) FROM collection_clients cc
        WHERE (cc.batch_id = eb.id OR (cc.batch_id IS NULL AND eb.client_ids @> ARRAY[cc.id]))
          AND cc.status IN ('bounced','hard_bounce','soft_bounce')
    ),
    emails_failed    = (
        SELECT COUNT(*) FROM collection_clients cc
        WHERE (cc.batch_id = eb.id OR (cc.batch_id IS NULL AND eb.client_ids @> ARRAY[cc.id]))
          AND cc.status = 'failed'
    )
WHERE eb.execution_id = '6d62c79f-1b42-48ed-bde6-a35284ec4bbe';
