CREATE TABLE whatsapp_conversations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_account_id UUID NOT NULL,
    business_id         UUID NOT NULL,
    phone               TEXT NOT NULL,
    customer_name       TEXT,
    last_message_at     TIMESTAMPTZ DEFAULT NOW(),
    expires_at          TIMESTAMPTZ,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_conversations_lookup
    ON whatsapp_conversations(business_id, phone, is_active, expires_at);

CREATE INDEX idx_whatsapp_conversations_active
    ON whatsapp_conversations(is_active)
    WHERE is_active = TRUE;

-- Constraint requerida para evitar duplicados activos
CREATE UNIQUE INDEX idx_whatsapp_conversations_active_unique
    ON whatsapp_conversations(business_id, phone)
    WHERE is_active = TRUE;
