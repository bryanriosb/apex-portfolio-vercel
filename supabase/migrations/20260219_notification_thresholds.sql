-- ============================================================================
-- Migración: Sistema de Umbrales de Días de Mora por Días de Mora
-- Fecha: 2026-02-19
-- ============================================================================

-- 1. Tabla de Umbrales de Días de Mora
-- Define rangos de días de mora y sus templates asociados
CREATE TABLE IF NOT EXISTS notification_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_account_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
    
    -- Configuración del umbral
    name VARCHAR(255) NOT NULL,                    -- Ej: "Primer Recordatorio", "Pre-jurídico"
    description TEXT,                              -- Descripción opcional
    days_from INTEGER NOT NULL CHECK (days_from >= 0),    -- Día inicial (inclusive)
    days_to INTEGER CHECK (days_to >= days_from OR days_to IS NULL), -- Día final (inclusive), NULL = sin límite superior
    
    -- Template asociado
    email_template_id UUID REFERENCES collection_templates(id),
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,               -- Orden para mostrar en UI
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Un único umbral activo por rango de días
    UNIQUE(business_account_id, days_from, is_active)
);

CREATE INDEX idx_notification_thresholds_business 
ON notification_thresholds(business_account_id);

CREATE INDEX idx_notification_thresholds_active 
ON notification_thresholds(business_account_id, is_active, days_from);

CREATE INDEX idx_notification_thresholds_range 
ON notification_thresholds(business_account_id, is_active, days_from, days_to);

-- 2. Tabla de Reglas de Adjuntos Deterministas
-- Define qué adjuntos aplican según reglas específicas
CREATE TABLE IF NOT EXISTS attachment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attachment_id UUID NOT NULL REFERENCES collection_attachments(id) ON DELETE CASCADE,
    business_account_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
    
    -- Tipo de regla (determinista)
    rule_type VARCHAR(50) NOT NULL CHECK (
        rule_type IN ('global', 'threshold', 'customer_category', 'customer', 'execution')
    ),
    
    -- ID de la entidad según el tipo (NULL para global)
    rule_entity_id UUID,
    
    -- Configuración
    is_required BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    
    -- Condiciones en JSON para filtros adicionales
    -- Ej: {"min_amount": 1000000, "max_amount": 5000000, "customer_tags": ["VIP"]}
    conditions JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(attachment_id, rule_type, rule_entity_id)
);

CREATE INDEX idx_attachment_rules_lookup 
ON attachment_rules(business_account_id, rule_type, rule_entity_id);

CREATE INDEX idx_attachment_rules_attachment 
ON attachment_rules(attachment_id);

-- 3. Función para obtener el umbral aplicable según días de mora
CREATE OR REPLACE FUNCTION get_threshold_for_days(
    p_business_account_id UUID,
    p_days_overdue INTEGER
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    days_from INTEGER,
    days_to INTEGER,
    email_template_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nt.id,
        nt.name,
        nt.days_from,
        nt.days_to,
        nt.email_template_id
    FROM notification_thresholds nt
    WHERE nt.business_account_id = p_business_account_id
      AND nt.is_active = TRUE
      AND p_days_overdue >= nt.days_from
      AND (nt.days_to IS NULL OR p_days_overdue <= nt.days_to)
    ORDER BY nt.days_from DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para resolver adjuntos según reglas deterministas
CREATE OR REPLACE FUNCTION resolve_attachments_by_rules(
    p_business_account_id UUID,
    p_days_overdue INTEGER DEFAULT NULL,
    p_threshold_id UUID DEFAULT NULL,
    p_customer_category_id UUID DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_execution_id UUID DEFAULT NULL,
    p_invoice_amount DECIMAL DEFAULT NULL
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
    SELECT DISTINCT ON (a.id)
        a.id as attachment_id,
        a.name as attachment_name,
        a.storage_path,
        a.storage_bucket,
        a.document_type,
        ar.is_required,
        ar.rule_type,
        ar.display_order
    FROM attachment_rules ar
    JOIN collection_attachments a ON a.id = ar.attachment_id
    WHERE ar.business_account_id = p_business_account_id
      AND a.is_active = TRUE
      AND (
          -- Regla global: aplica siempre
          ar.rule_type = 'global'
          
          -- Regla por umbral: aplica si el umbral coincide
          OR (ar.rule_type = 'threshold' AND ar.rule_entity_id = p_threshold_id)
          
          -- Regla por categoría: aplica si la categoría coincide
          OR (ar.rule_type = 'customer_category' AND ar.rule_entity_id = p_customer_category_id)
          
          -- Regla por cliente: aplica si el cliente coincide
          OR (ar.rule_type = 'customer' AND ar.rule_entity_id = p_customer_id)
          
          -- Regla por ejecución: aplica si la ejecución coincide
          OR (ar.rule_type = 'execution' AND ar.rule_entity_id = p_execution_id)
      )
      -- Validar condiciones de monto si existen
      AND (
          (ar.conditions->>'min_amount') IS NULL 
          OR p_invoice_amount IS NULL
          OR p_invoice_amount >= (ar.conditions->>'min_amount')::DECIMAL
      )
      AND (
          (ar.conditions->>'max_amount') IS NULL 
          OR p_invoice_amount IS NULL
          OR p_invoice_amount <= (ar.conditions->>'max_amount')::DECIMAL
      )
    ORDER BY a.id, 
             CASE ar.rule_type 
                 WHEN 'execution' THEN 1
                 WHEN 'customer' THEN 2
                 WHEN 'customer_category' THEN 3
                 WHEN 'threshold' THEN 4
                 WHEN 'global' THEN 5
             END,
             ar.display_order
    ORDER BY ar.display_order;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para actualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_thresholds_updated_at
    BEFORE UPDATE ON notification_thresholds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attachment_rules_updated_at
    BEFORE UPDATE ON attachment_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Agregar campo document_type a collection_attachments si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collection_attachments' 
        AND column_name = 'document_type'
    ) THEN
        ALTER TABLE collection_attachments
        ADD COLUMN document_type VARCHAR(50) DEFAULT 'generic';
    END IF;
END $$;

-- 7. Agregar campo threshold_id a collection_clients para tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collection_clients' 
        AND column_name = 'threshold_id'
    ) THEN
        ALTER TABLE collection_clients
        ADD COLUMN threshold_id UUID REFERENCES notification_thresholds(id);
    END IF;
END $$;
