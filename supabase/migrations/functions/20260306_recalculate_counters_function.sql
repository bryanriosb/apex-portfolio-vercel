-- Migration: Create function to recalculate execution counters from events
-- Date: 2026-03-06
-- Description: 
--   Creates a function that recalculates counters based on actual events.
--   This ensures counters are always accurate, even after duplicates or errors.
--   The function is called automatically when events are inserted.

-- Function to recalculate execution counters from events
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

-- Function to update execution counters with calculated values
CREATE OR REPLACE FUNCTION update_execution_counters_from_events()
RETURNS TRIGGER AS $$
DECLARE
    v_execution_id UUID;
    v_counters RECORD;
BEGIN
    -- Get execution_id from the event
    v_execution_id := NEW.execution_id;
    
    -- Only process if we have a valid execution_id
    IF v_execution_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Recalculate counters
    SELECT * INTO v_counters FROM recalculate_execution_counters(v_execution_id);
    
    -- Update execution with calculated values
    UPDATE collection_executions
    SET 
        emails_sent = COALESCE(v_counters.emails_sent, 0),
        emails_delivered = COALESCE(v_counters.emails_delivered, 0),
        emails_opened = COALESCE(v_counters.opened, 0),
        emails_bounced = COALESCE(v_counters.bounced, 0),
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

-- Trigger to update counters on every event insertion
DROP TRIGGER IF EXISTS update_counters_on_event_insert ON collection_events;
CREATE TRIGGER update_counters_on_event_insert
    AFTER INSERT ON collection_events
    FOR EACH ROW
    EXECUTE FUNCTION update_execution_counters_from_events();

COMMENT ON FUNCTION recalculate_execution_counters IS 
    'Recalculates execution counters based on actual events in collection_events. Always returns accurate counts.';

COMMENT ON FUNCTION update_execution_counters_from_events IS 
    'Automatically updates execution counters whenever a new event is inserted. Ensures counters are always accurate.';
