-- Verificar la estructura de las tablas relevantes
-- Ejecutar en Supabase SQL Editor

-- Verificar columnas en attachment_rules
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'attachment_rules'
ORDER BY ordinal_position;

-- Verificar columnas en notification_thresholds
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'notification_thresholds'
ORDER BY ordinal_position;

-- Verificar función existente
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname = 'resolve_attachments_by_rules';

-- Contar registros con business_id NULL
SELECT 
    'attachment_rules' as tabla,
    COUNT(*) as total,
    COUNT(business_id) as con_business_id,
    COUNT(business_account_id) as con_business_account_id
FROM attachment_rules
UNION ALL
SELECT 
    'notification_thresholds' as tabla,
    COUNT(*) as total,
    COUNT(business_id) as con_business_id,
    COUNT(business_account_id) as con_business_account_id
FROM notification_thresholds;