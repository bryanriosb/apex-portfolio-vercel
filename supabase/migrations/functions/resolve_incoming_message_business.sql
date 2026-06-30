CREATE OR REPLACE FUNCTION resolve_incoming_message_business(
    p_business_account_id UUID,
    p_phone TEXT
)
RETURNS TABLE (
    business_id UUID,
    conversation_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.business_id,
        c.id AS conversation_id
    FROM whatsapp_conversations c
    WHERE c.business_account_id = p_business_account_id
      AND c.phone = p_phone
      AND c.is_active = TRUE
      AND c.expires_at > NOW()
    ORDER BY c.last_message_at DESC
    LIMIT 1;
END;
$$;
