-- Enable Realtime for Control Tower tables
-- This allows the UI to receive live updates without refreshing

-- Enable realtime for execution_audit_logs
ALTER TABLE execution_audit_logs REPLICA IDENTITY FULL;

-- Add to supabase_realtime publication
BEGIN;
  -- Check if the publication exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Check if table is not already in the publication
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'execution_audit_logs'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE execution_audit_logs;
    END IF;
  END IF;
COMMIT;

-- Enable realtime for scheduler_locks
ALTER TABLE scheduler_locks REPLICA IDENTITY FULL;

-- Add to supabase_realtime publication
BEGIN;
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'scheduler_locks'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE scheduler_locks;
    END IF;
  END IF;
COMMIT;

-- Enable realtime for collection_executions (in case it's not already enabled)
ALTER TABLE collection_executions REPLICA IDENTITY FULL;

-- Enable realtime for collection_clients (in case it's not already enabled)
ALTER TABLE collection_clients REPLICA IDENTITY FULL;
