CREATE OR REPLACE FUNCTION get_or_create_whatsapp_conversation(
    p_business_account_id UUID,
    p_business_id UUID,
    p_phone TEXT,
    p_customer_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_conversation_id UUID;
    v_expires_at TIMESTAMPTZ := NOW() + INTERVAL '24 hours';
BEGIN
    -- Buscar conversación activa existente
    SELECT id INTO v_conversation_id
    FROM whatsapp_conversations
    WHERE business_id = p_business_id
      AND phone = p_phone
      AND is_active = TRUE
      AND expires_at > NOW()
    ORDER BY last_message_at DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_conversation_id IS NOT NULL THEN
        UPDATE whatsapp_conversations
        SET last_message_at = NOW(),
            customer_name = COALESCE(p_customer_name, customer_name),
            expires_at = v_expires_at
        WHERE id = v_conversation_id;

        RETURN v_conversation_id;
    END IF;

    -- Crear nueva conversación
    INSERT INTO whatsapp_conversations (
        business_account_id,
        business_id,
        phone,
        customer_name,
        last_message_at,
        expires_at,
        is_active
    ) VALUES (
        p_business_account_id,
        p_business_id,
        p_phone,
        p_customer_name,
        NOW(),
        v_expires_at,
        TRUE
    )
    ON CONFLICT (business_id, phone) WHERE is_active = TRUE
    DO UPDATE SET
        last_message_at = NOW(),
        expires_at = v_expires_at,
        customer_name = COALESCE(p_customer_name, whatsapp_conversations.customer_name)
    RETURNING id INTO v_conversation_id;

    RETURN v_conversation_id;
END;
$$;
