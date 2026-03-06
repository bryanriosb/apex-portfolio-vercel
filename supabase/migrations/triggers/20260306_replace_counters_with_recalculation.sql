-- Migration: Replace increment trigger with recalculation trigger
-- Date: 2026-03-06
-- Description: 
--   Replaces the append-only counter trigger with a recalculation trigger.
--   This ensures counters are always accurate by calculating from real events.
--   
--   CHANGES:
--   1. Disables the old trigger on collection_clients
--   2. Creates new trigger on collection_events that recalculates counters
--   3. Updates counters immediately for all existing executions

-- ============================================
-- STEP 1: Disable the old counter trigger
-- ============================================
DROP TRIGGER IF EXISTS increment_counters_on_client_update ON collection_clients;

COMMENT ON FUNCTION increment_execution_counters() IS 
    'DEPRECATED: This function is no longer used. Counters are now calculated from events.';

-- ============================================
-- STEP 2: Create recalculation function
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_execution_counters(p_execution_id UUID)
RETURNS TABLE (
    emails_sent INTEGER,
    emails_delivered INTEGER,
    emails_opened INTEGER,
    emails_bounced INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT CASE WHEN event_type = 'email_sent' THEN client_id END)::INTEGER as emails_sent,
        COUNT(DISTINCT CASE WHEN event_type = 'email_delivered' THEN client_id END)::INTEGER as emails_delivered,
        COUNT(DISTINCT CASE WHEN event_type = 'email_opened' THEN client_id END)::INTEGER as emails_opened,
        COUNT(DISTINCT CASE WHEN event_type = 'email_bounced' THEN client_id END)::INTEGER as emails_bounced
    FROM collection_events
    WHERE execution_id = p_execution_id
      AND event_type IN ('email_sent', 'email_delivered', 'email_opened', 'email_bounced');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 3: Create trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_execution_counters_from_events()
RETURNS TRIGGER AS $$
DECLARE
    v_execution_id UUID;
    v_counters RECORD;
BEGIN
    v_execution_id := NEW.execution_id;
    
    IF v_execution_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Recalculate counters from events
    SELECT * INTO v_counters FROM recalculate_execution_counters(v_execution_id);
    
    -- Update execution with accurate values
    UPDATE collection_executions
    SET 
        emails_sent = COALESCE(v_counters.emails_sent, 0),
        emails_delivered = COALESCE(v_counters.emails_delivered, 0),
        emails_opened = COALESCE(v_counters.emails_opened, 0),
        emails_bounced = COALESCE(v_counters.emails_bounced, 0),
        open_rate = CASE 
            WHEN COALESCE(v_counters.emails_delivered, 0) > 0 
            THEN ROUND((COALESCE(v_counters.emails_opened, 0)::numeric / v_counters.emails_delivered) * 100, 2)
            ELSE 0 
        END,
        bounce_rate = CASE 
            WHEN COALESCE(v_counters.emails_sent, 0) > 0 
            THEN ROUND((COALESCE(v_counters.emails_bounced, 0)::numeric / v_counters.emails_sent) * 100, 2)
            ELSE 0 
        END,
        delivery_rate = CASE 
            WHEN COALESCE(v_counters.emails_sent, 0) > 0 
            THEN ROUND((COALESCE(v_counters.emails_delivered, 0)::numeric / v_counters.emails_sent) * 100, 2)
            ELSE 0 
        END,
        updated_at = NOW()
    WHERE id = v_execution_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Create new trigger
-- ============================================
DROP TRIGGER IF EXISTS update_counters_on_event_insert ON collection_events;

CREATE TRIGGER update_counters_on_event_insert
    AFTER INSERT ON collection_events
    FOR EACH ROW
    EXECUTE FUNCTION update_execution_counters_from_events();

-- ============================================
-- STEP 5: Recalculate all existing executions
-- ============================================
DO $$
DECLARE
    r RECORD;
    v_counters RECORD;
BEGIN
    FOR r IN SELECT id FROM collection_executions WHERE status IN ('processing', 'completed')
    LOOP
        SELECT * INTO v_counters FROM recalculate_execution_counters(r.id);
        
        UPDATE collection_executions
        SET 
            emails_sent = COALESCE(v_counters.emails_sent, 0),
            emails_delivered = COALESCE(v_counters.emails_delivered, 0),
            emails_opened = COALESCE(v_counters.emails_opened, 0),
            emails_bounced = COALESCE(v_counters.emails_bounced, 0),
            updated_at = NOW()
        WHERE id = r.id;
    END LOOP;
END $$;

-- Comments
COMMENT ON FUNCTION recalculate_execution_counters IS 
    'Recalculates execution counters based on actual events. Always returns accurate counts.';

COMMENT ON FUNCTION update_execution_counters_from_events IS 
    'Automatically updates execution counters when events are inserted. Replaces old increment trigger.';
