-- Migration: Execution Strategy (Scheduler Locks & Control Tower)
-- Generated from: docs/email-strategy-execution.md

-- 1. Scheduler Locks (Distributed Locking)
CREATE TABLE IF NOT EXISTS scheduler_locks (
    id TEXT PRIMARY KEY DEFAULT 'email_scheduler_lock',
    locked_by TEXT NOT NULL,
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    CONSTRAINT single_lock CHECK (id = 'email_scheduler_lock')
);

INSERT INTO scheduler_locks (id, locked_by, expires_at)
VALUES ('email_scheduler_lock', 'init', NULL)
ON CONFLICT (id) DO NOTHING;

-- Function: acquire_scheduler_lock
CREATE OR REPLACE FUNCTION acquire_scheduler_lock(p_worker_id TEXT, p_ttl_seconds INTEGER DEFAULT 300)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE scheduler_locks 
    SET locked_by = p_worker_id, locked_at = NOW(), expires_at = NOW() + (p_ttl_seconds || ' seconds')::INTERVAL
    WHERE id = 'email_scheduler_lock' 
    AND (locked_by IS NULL OR expires_at < NOW() OR locked_by = p_worker_id);
    
    RETURN EXISTS (
        SELECT 1 FROM scheduler_locks 
        WHERE id = 'email_scheduler_lock' 
        AND locked_by = p_worker_id 
        AND expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: release_scheduler_lock
CREATE OR REPLACE FUNCTION release_scheduler_lock(p_worker_id TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE scheduler_locks 
    SET locked_by = NULL, locked_at = NULL, expires_at = NULL
    WHERE id = 'email_scheduler_lock' AND locked_by = p_worker_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for scheduler_locks
ALTER TABLE scheduler_locks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service role" ON scheduler_locks;
CREATE POLICY "Allow service role" ON scheduler_locks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Control Tower (Audit Logs)

-- Enum: execution_event_type
DO $$ BEGIN
    CREATE TYPE execution_event_type AS ENUM (
        'ENQUEUED',
        'PICKED_UP',
        'DEFERRED',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'DLQ_SENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table: execution_audit_logs
CREATE TABLE IF NOT EXISTS execution_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES collection_executions(id),
    batch_id UUID,
    event execution_event_type NOT NULL,
    worker_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_audit_execution ON execution_audit_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON execution_audit_logs(created_at DESC);

-- RLS for execution_audit_logs
ALTER TABLE execution_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service role audit" ON execution_audit_logs;
CREATE POLICY "Allow service role audit" ON execution_audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON execution_audit_logs;
CREATE POLICY "Allow read access to authenticated users" ON execution_audit_logs FOR SELECT TO authenticated USING (true);
