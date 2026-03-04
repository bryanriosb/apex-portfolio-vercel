-- Migration: Add ON DELETE CASCADE to execution_audit_logs foreign key
-- Date: 2026-03-04
-- Description: Fixes deletion of executions by adding cascade delete for audit logs

-- Drop existing foreign key constraint
ALTER TABLE execution_audit_logs
DROP CONSTRAINT IF EXISTS execution_audit_logs_execution_id_fkey;

-- Recreate with ON DELETE CASCADE
ALTER TABLE execution_audit_logs
ADD CONSTRAINT execution_audit_logs_execution_id_fkey
FOREIGN KEY (execution_id) REFERENCES collection_executions(id)
ON DELETE CASCADE;
