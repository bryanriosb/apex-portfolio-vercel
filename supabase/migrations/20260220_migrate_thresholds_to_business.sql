-- Migración: Cambiar notification_thresholds y attachment_rules de business_account_id a business_id
-- Fecha: 2026-02-20
-- Objetivo: Permitir que cada negocio/sucursal configure sus propios umbrales

-- 1. Agregar columna business_id a notification_thresholds si no existe
ALTER TABLE notification_thresholds 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- 2. Migrar datos de business_account_id a business_id
-- Primero, obtener el business_id correspondiente para cada business_account_id
UPDATE notification_thresholds nt
SET business_id = b.id
FROM business_accounts ba
JOIN businesses b ON b.business_account_id = ba.id
WHERE nt.business_account_id = ba.id
  AND nt.business_id IS NULL;

-- 3. Agregar columna business_id a attachment_rules si no existe
ALTER TABLE attachment_rules 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- 4. Migrar datos de business_account_id a business_id en attachment_rules
UPDATE attachment_rules ar
SET business_id = b.id
FROM business_accounts ba
JOIN businesses b ON b.business_account_id = ba.id
WHERE ar.business_account_id = ba.id
  AND ar.business_id IS NULL;

-- 5. Eliminar funciones existentes para recrearlas con nuevos parámetros
DROP FUNCTION IF EXISTS get_threshold_for_days(UUID, INTEGER);
DROP FUNCTION IF EXISTS resolve_attachments_by_rules(UUID, UUID, UUID, UUID, INTEGER, NUMERIC);

-- 6. Actualizar la función RPC get_threshold_for_days para usar business_id
CREATE OR REPLACE FUNCTION get_threshold_for_days(
    p_business_id UUID,
    p_days_overdue INTEGER
)
RETURNS TABLE (id UUID, name VARCHAR, email_template_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT nt.id, nt.name, nt.email_template_id
    FROM notification_thresholds nt
    WHERE nt.business_id = p_business_id
      AND nt.is_active = TRUE
      AND p_days_overdue >= nt.days_from
      AND (nt.days_to IS NULL OR p_days_overdue <= nt.days_to)
    ORDER BY nt.days_from DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 7. Actualizar la función RPC resolve_attachments_by_rules para usar business_id
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

-- 8. Actualizar índices
DROP INDEX IF EXISTS idx_thresholds_lookup;
CREATE INDEX idx_thresholds_lookup 
ON notification_thresholds(business_id, is_active, days_from);

-- Verificar datos migrados
SELECT 
    'notification_thresholds' as table_name,
    COUNT(*) as total,
    COUNT(business_id) as with_business_id,
    COUNT(business_account_id) as with_business_account_id
FROM notification_thresholds
UNION ALL
SELECT 
    'attachment_rules' as table_name,
    COUNT(*) as total,
    COUNT(business_id) as with_business_id,
    COUNT(business_account_id) as with_business_account_id
FROM attachment_rules;
