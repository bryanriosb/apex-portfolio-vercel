-- Function: Buscar en blacklist con filtros por email, NIT y empresa
-- Creada: 2025-03-10
-- Uso: Búsqueda robusta en email_blacklist con joins a business_customers

DROP FUNCTION IF EXISTS search_blacklist_with_customer_info(UUID, TEXT, TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION search_blacklist_with_customer_info(
    p_business_id UUID,
    p_search TEXT DEFAULT NULL,
    p_bounce_type TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    business_id UUID,
    email VARCHAR(255),
    bounce_type VARCHAR(50),
    bounce_reason TEXT,
    bounced_at TIMESTAMPTZ,
    source_customer_id UUID,
    source_execution_id UUID,
    source_client_id UUID,
    provider VARCHAR(50),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    customer_name TEXT,
    customer_company TEXT,
    customer_nit TEXT,
    total_count BIGINT
) AS $$
DECLARE
    v_offset INTEGER;
    v_total BIGINT;
BEGIN
    v_offset := (p_page - 1) * p_page_size;
    
    SELECT COUNT(*)
    INTO v_total
    FROM email_blacklist bl
    LEFT JOIN business_customers bc ON bl.source_customer_id = bc.id
    WHERE bl.business_id = p_business_id
      AND (p_bounce_type IS NULL OR bl.bounce_type = p_bounce_type)
      AND (
          p_search IS NULL 
          OR p_search = ''
          OR bl.email ILIKE '%' || p_search || '%'
          OR bc.nit ILIKE '%' || p_search || '%'
          OR bc.company_name ILIKE '%' || p_search || '%'
          OR bc.full_name ILIKE '%' || p_search || '%'
      );
    
    RETURN QUERY
    SELECT 
        bl.id,
        bl.business_id,
        bl.email,
        bl.bounce_type,
        bl.bounce_reason,
        bl.bounced_at,
        bl.source_customer_id,
        bl.source_execution_id,
        bl.source_client_id,
        bl.provider,
        bl.created_at,
        bl.updated_at,
        bc.full_name::TEXT as customer_name,
        bc.company_name::TEXT as customer_company,
        bc.nit::TEXT as customer_nit,
        v_total as total_count
    FROM email_blacklist bl
    LEFT JOIN business_customers bc ON bl.source_customer_id = bc.id
    WHERE bl.business_id = p_business_id
      AND (p_bounce_type IS NULL OR bl.bounce_type = p_bounce_type)
      AND (
          p_search IS NULL 
          OR p_search = ''
          OR bl.email ILIKE '%' || p_search || '%'
          OR bc.nit ILIKE '%' || p_search || '%'
          OR bc.company_name ILIKE '%' || p_search || '%'
          OR bc.full_name ILIKE '%' || p_search || '%'
      )
    ORDER BY bl.bounced_at DESC NULLS LAST
    LIMIT p_page_size
    OFFSET v_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION search_blacklist_with_customer_info(UUID, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_blacklist_with_customer_info(UUID, TEXT, TEXT, INTEGER, INTEGER) TO service_role;