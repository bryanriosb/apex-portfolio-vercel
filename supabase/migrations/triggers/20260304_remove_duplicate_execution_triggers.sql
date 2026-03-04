-- Migration: Remove duplicate triggers that conflict with centralized execution counters
-- Date: 2026-03-04
-- Description:
--   Removes triggers that duplicate functionality now handled by the centralized
--   increment_counters_on_client_update trigger in 20260304_increment_execution_counters_trigger.sql
--   This ensures a single source of truth for all execution metrics.

-- Drop duplicate trigger that only recalculates rates
-- (the centralized trigger already does this in lines 125-136)
DROP TRIGGER IF EXISTS update_metrics_on_client_change ON collection_clients;

-- Drop the associated function that is now redundant
DROP FUNCTION IF EXISTS calculate_execution_metrics();

-- Note: trigger_accumulate_metrics is preserved as it serves a different purpose
-- (accumulating temporal metrics for ML/predictions in temporal_performance_metrics table)
-- and does not conflict with the centralized counter trigger.

COMMENT ON FUNCTION increment_execution_counters() IS 
    'Centralized trigger function for all execution metrics. Updates counters in collection_executions and execution_batches, calculates rates, and handles batch completion. Single source of truth for execution metrics.';
