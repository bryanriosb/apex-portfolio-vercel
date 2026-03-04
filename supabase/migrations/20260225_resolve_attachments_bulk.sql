-- RPC Batch function for resolving attachments for multiple clients
-- This function optimizes attachment resolution by processing all clients in a single query
-- Instead of N individual RPC calls, we make 1 call with all client data

-- First, create a type for the input client data
DROP TYPE IF EXISTS client_attachment_input CASCADE;
CREATE TYPE client_attachment_input AS (
    client_id TEXT,
    threshold_id UUID,
    customer_category_id UUID,
    customer_id UUID,
    days_overdue INTEGER,
    invoice_amount NUMERIC
);

-- Create the batch attachment resolution function
CREATE OR REPLACE FUNCTION resolve_attachments_bulk(
    p_business_id UUID,
    p_clients JSONB
)
RETURNS TABLE (
    client_id TEXT,
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
    WITH client_data AS (
        SELECT 
            (client->>'client_id')::TEXT as cid,
            (client->>'threshold_id')::UUID as thresh_id,
            (client->>'customer_category_id')::UUID as cat_id,
            (client->>'customer_id')::UUID as cust_id,
            (client->>'days_overdue')::INTEGER as days,
            (client->>'invoice_amount')::NUMERIC as amount
        FROM jsonb_array_elements(p_clients) as client
    )
    SELECT 
        cd.cid as client_id,
        ca.id as attachment_id,
        ca.name as attachment_name,
        ca.storage_path,
        ca.storage_bucket,
        ca.file_type as document_type,
        ar.is_required,
        ar.rule_type,
        ar.display_order
    FROM client_data cd
    CROSS JOIN attachment_rules ar
    JOIN collection_attachments ca ON ca.id = ar.attachment_id
    WHERE ar.business_id = p_business_id
      AND (
          -- Reglas globales
          ar.rule_type = 'global'
          -- Reglas por umbral
          OR (ar.rule_type = 'threshold' AND ar.rule_entity_id = cd.thresh_id)
          -- Reglas por categoría
          OR (ar.rule_type = 'customer_category' AND ar.rule_entity_id = cd.cat_id)
          -- Reglas por cliente
          OR (ar.rule_type = 'customer' AND ar.rule_entity_id = cd.cust_id)
      )
      -- Aplicar condiciones si existen
      AND (
          ar.conditions IS NULL
          OR ar.conditions = '{}'::jsonb
          OR (
              (ar.conditions->>'min_amount' IS NULL OR cd.amount >= (ar.conditions->>'min_amount')::numeric)
              AND (ar.conditions->>'max_amount' IS NULL OR cd.amount <= (ar.conditions->>'max_amount')::numeric)
          )
      )
    ORDER BY cd.cid, ar.display_order;
END;
$$ LANGUAGE plpgsql;

-- Create index for better performance if not exists
CREATE INDEX IF NOT EXISTS idx_attachment_rules_business_type ON attachment_rules(business_id, rule_type);
CREATE INDEX IF NOT EXISTS idx_attachment_rules_entity ON attachment_rules(rule_entity_id) WHERE rule_entity_id IS NOT NULL;

-- Verify function was created
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'resolve_attachments_bulk';

-- Example usage:
-- SELECT * FROM resolve_attachments_bulk(
--     '00000000-0000-0000-0000-000000000000'::UUID,
--     '[
--         {"client_id": "client1", "threshold_id": "...", "days_overdue": 30, "invoice_amount": 1000},
--         {"client_id": "client2", "threshold_id": "...", "days_overdue": 60, "invoice_amount": 2000}
--     ]'::JSONB
-- );
