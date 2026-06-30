CREATE TYPE whatsapp_message_type AS ENUM (
  'text',
  'image',
  'document',
  'audio',
  'video',
  'template',
  'interactive'
);

CREATE TYPE whatsapp_message_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'read',
  'failed'
);

CREATE TABLE whatsapp_messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_account_id UUID NOT NULL,
    business_id         UUID NOT NULL,
    conversation_id     UUID REFERENCES whatsapp_conversations(id),
    whatsapp_message_id TEXT,
    to_phone            TEXT NOT NULL,
    from_phone          TEXT,
    direction           TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type        whatsapp_message_type NOT NULL,
    content             TEXT,
    media_url           TEXT,
    template_name       TEXT,
    status              whatsapp_message_status DEFAULT 'pending',
    error_message       TEXT,
    sent_at             TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_messages_business
    ON whatsapp_messages(business_id);

CREATE INDEX idx_whatsapp_messages_conversation
    ON whatsapp_messages(conversation_id);

CREATE INDEX idx_whatsapp_messages_whatsapp_id
    ON whatsapp_messages(whatsapp_message_id);

CREATE INDEX idx_whatsapp_messages_phones
    ON whatsapp_messages(to_phone, from_phone);

CREATE INDEX idx_whatsapp_messages_created
    ON whatsapp_messages(business_id, created_at DESC);
