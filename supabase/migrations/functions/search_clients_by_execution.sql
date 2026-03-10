Ejecuta este SQL completo en Supabase (incluye el DROP primero):
-- Primero eliminar la función existente
DROP FUNCTION IF EXISTS search_clients_by_execution(uuid,text,integer,integer,text[],boolean,text[],text[]);
-- Luego crear la función corregida
CREATE OR REPLACE FUNCTION search_clients_by_execution(
    p_execution_id UUID,
    p_search TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 50,
    p_status TEXT[] DEFAULT NULL,
    p_fallback_required BOOLEAN DEFAULT NULL,
    p_email_bounce_type TEXT[] DEFAULT NULL,
    p_fallback_type TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    execution_id UUID,
    customer_id UUID,
    batch_id UUID,
    invoices JSONB,
    custom_data JSONB,
    status VARCHAR(50),
    email_template_id UUID,
    threshold_id UUID,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    email_delivered_at TIMESTAMP WITH TIME ZONE,
    email_opened_at TIMESTAMP WITH TIME ZONE,
    email_bounce_type VARCHAR(50),
    email_bounce_reason TEXT,
    fallback_required BOOLEAN,
    fallback_sent_at TIMESTAMP WITH TIME ZONE,
    fallback_type VARCHAR(20),
    fallback_status VARCHAR(50),
    ses_message_id VARCHAR(255),
    error_message TEXT,
    retry_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    total_count BIGINT
) AS $$
DECLARE
    v_offset INTEGER := (p_page - 1) * p_page_size;
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT 
            cc.id,
            cc.execution_id,
            cc.customer_id,
            cc.batch_id,
            cc.invoices,
            cc.custom_data,
            cc.status,
            cc.email_template_id,
            cc.threshold_id,
            cc.email_sent_at,
            cc.email_delivered_at,
            cc.email_opened_at,
            cc.email_bounce_type,
            cc.email_bounce_reason,
            cc.fallback_required,
            cc.fallback_sent_at,
            cc.fallback_type,
            cc.fallback_status,
            cc.ses_message_id,
            cc.error_message,
            cc.retry_count,
            cc.created_at,
            cc.updated_at,
            COUNT(*) OVER() as total_count
        FROM collection_clients cc
        WHERE cc.execution_id = p_execution_id
        AND (p_status IS NULL OR cc.status = ANY(p_status))
        AND (p_fallback_required IS NULL OR cc.fallback_required = p_fallback_required)
        AND (p_email_bounce_type IS NULL OR cc.email_bounce_type = ANY(p_email_bounce_type))
        AND (p_fallback_type IS NULL OR cc.fallback_type = ANY(p_fallback_type))
        AND (
            p_search IS NULL 
            OR p_search = ''
            OR cc.custom_data->>'full_name' ILIKE '%' || p_search || '%'
            OR cc.custom_data->>'company_name' ILIKE '%' || p_search || '%'
            OR cc.custom_data->>'nit' ILIKE '%' || p_search || '%'
            OR EXISTS (
                SELECT 1 
                FROM jsonb_array_elements_text(cc.custom_data->'emails') AS email
                WHERE email ILIKE '%' || p_search || '%'
            )
        )
    )
    SELECT *
    FROM filtered
    ORDER BY created_at ASC
    LIMIT p_page_size
    OFFSET v_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;