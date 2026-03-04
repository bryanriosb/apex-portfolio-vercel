-- Script para corregir la función resolve_attachments_by_rules
-- Ejecutar en Supabase SQL Editor

-- Eliminar la función existente (todas las sobrecargas)
DROP FUNCTION IF EXISTS resolve_attachments_by_rules(UUID, INTEGER, UUID, UUID, UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS resolve_attachments_by_rules(UUID, UUID, UUID, UUID, INTEGER, NUMERIC);
DROP FUNCTION IF EXISTS resolve_attachments_by_rules;

-- Recrear la función con la firma correcta
CREATE OR REPLACE FUNCTION resolve_attachments_by_rules(
    p_business_id UUID,
    p_threshold_id UUID,
    p_customer_category_id UUID,
    p_customer_id UUID,
    p_days_overdue INTEGER,
    p_invoice_amount NUMERIC
)
RETURNS TABLE (
    attachment_id UUID,
    attachment_name VARCHAR,
    storage_path TEXT,
    storage_bucket VARCHAR,
    document_type VARCHAR,
    is_required BOOLEAN,
    rule_type VARCHAR,
    display_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.id as attachment_id,
        ca.name as attachment_name,
        ca.storage_path,
        ca.storage_bucket,
        ca.file_type as document_type,
        ar.is_required,
        ar.rule_type,
        ar.display_order
    FROM attachment_rules ar
    JOIN collection_attachments ca ON ca.id = ar.attachment_id
    WHERE ar.business_id = p_business_id
      AND (
          -- Reglas globales
          ar.rule_type = 'global'
          -- Reglas por umbral
          OR (ar.rule_type = 'threshold' AND ar.rule_entity_id = p_threshold_id)
          -- Reglas por categoría
          OR (ar.rule_type = 'customer_category' AND ar.rule_entity_id = p_customer_category_id)
          -- Reglas por cliente
          OR (ar.rule_type = 'customer' AND ar.rule_entity_id = p_customer_id)
      )
      -- Aplicar condiciones si existen
      AND (
          ar.conditions IS NULL
          OR ar.conditions = '{}'::jsonb
          OR (
              (ar.conditions->>'min_amount' IS NULL OR p_invoice_amount >= (ar.conditions->>'min_amount')::numeric)
              AND (ar.conditions->>'max_amount' IS NULL OR p_invoice_amount <= (ar.conditions->>'max_amount')::numeric)
          )
      )
    ORDER BY ar.display_order;
END;
$$ LANGUAGE plpgsql;

-- Verificar que la función fue creada correctamente
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'resolve_attachments_by_rules';

-- Test rápido (opcional - quitar comentario para ejecutar)
-- SELECT * FROM resolve_attachments_by_rules(
--     '00000000-0000-0000-0000-000000000000'::UUID,
--     NULL::UUID,
--     NULL::UUID,
--     NULL::UUID,
--     NULL::INTEGER,
--     NULL::NUMERIC
-- );