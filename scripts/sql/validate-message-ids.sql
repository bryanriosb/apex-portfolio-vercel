-- ============================================
-- CRITICAL FIX: Message ID Matching Validation
-- Issue: Events not matching due to status filtering
-- ============================================

-- Step 1: Verify message_id storage
-- All message_ids should be in custom_data->>message_id with brackets <>
SELECT 
  COUNT(*) as total_clients_with_message_id,
  COUNT(CASE WHEN custom_data->>'message_id' LIKE '<%>' THEN 1 END) as with_brackets,
  COUNT(CASE WHEN custom_data->>'message_id' NOT LIKE '<%>' THEN 1 END) as without_brackets
FROM collection_clients 
WHERE custom_data->>'message_id' IS NOT NULL;

-- Step 2: Check for any message_ids without brackets (should be rare)
SELECT 
  id,
  custom_data->>'message_id' as message_id,
  status
FROM collection_clients 
WHERE custom_data->>'message_id' IS NOT NULL
  AND custom_data->>'message_id' NOT LIKE '<%>'
LIMIT 10;

-- ============================================
-- NOTES:
-- 1. The webhook handler searches by message_id in custom_data->>message_id
--    trying both formats: with and without brackets
-- 
-- 2. Email fallback NO LONGER filters by status, allowing
--    multiple events to match even after client reaches final states
--
-- 3. Worker saves message_id in custom_data->>message_id only
--    (ses_message_id column is NOT used)
-- ============================================
