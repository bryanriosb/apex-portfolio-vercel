-- RPC function to increment execution counters atomically
CREATE OR REPLACE FUNCTION increment_execution_counter(
    p_execution_id UUID,
    p_column TEXT
)
RETURNS void AS $$
BEGIN
    EXECUTE format(
        'UPDATE collection_executions SET %I = COALESCE(%I, 0) + 1 WHERE id = $1',
        p_column, p_column
    ) USING p_execution_id;
END;
$$ LANGUAGE plpgsql;

-- RPC function to increment client stats
CREATE OR REPLACE FUNCTION increment_client_stats(
    p_client_id UUID,
    p_event_type TEXT
)
RETURNS void AS $$
BEGIN
    IF p_event_type = 'delivered' THEN
        UPDATE collection_clients SET is_delivered = true WHERE id = p_client_id;
    ELSIF p_event_type = 'opened' THEN
        UPDATE collection_clients SET is_opened = true WHERE id = p_client_id;
    ELSIF p_event_type = 'bounced' THEN
        UPDATE collection_clients SET is_bounced = true WHERE id = p_client_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- View for execution summary with client stats
CREATE OR REPLACE VIEW execution_summary AS
SELECT 
    e.id,
    e.name,
    e.status,
    e.execution_mode,
    e.created_at,
    e.started_at,
    e.completed_at,
    e.total_clients,
    e.emails_sent,
    e.emails_delivered,
    e.emails_opened,
    e.emails_bounced,
    e.emails_failed,
    CASE 
        WHEN e.total_clients > 0 THEN ROUND((e.emails_sent::numeric / e.total_clients * 100)::numeric, 2)
        ELSE 0 
    END as send_progress_percent,
    CASE 
        WHEN e.emails_sent > 0 THEN ROUND((e.emails_opened::numeric / e.emails_sent * 100)::numeric, 2)
        ELSE 0 
    END as open_rate,
    CASE 
        WHEN e.emails_sent > 0 THEN ROUND((e.emails_bounced::numeric / e.emails_sent * 100)::numeric, 2)
        ELSE 0 
    END as bounce_rate,
    (SELECT COUNT(*) FROM collection_clients c WHERE c.execution_id = e.id AND c.status = 'pending') as pending_clients,
    (SELECT COUNT(*) FROM collection_clients c WHERE c.execution_id = e.id AND c.status = 'sent') as sent_clients,
    (SELECT COUNT(*) FROM collection_clients c WHERE c.execution_id = e.id AND c.status = 'delivered') as delivered_clients,
    (SELECT COUNT(*) FROM collection_clients c WHERE c.execution_id = e.id AND c.status = 'opened') as opened_clients,
    (SELECT COUNT(*) FROM collection_clients c WHERE c.execution_id = e.id AND c.status = 'bounced') as bounced_clients
FROM collection_executions e;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION increment_execution_counter(UUID, TEXT) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_client_stats(UUID, TEXT) TO postgres, anon, authenticated, service_role;
GRANT SELECT ON execution_summary TO postgres, anon, authenticated, service_role;
