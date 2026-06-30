CREATE TYPE whatsapp_config_status AS ENUM (
  'active',
  'inactive',
  'pending_verification'
);

CREATE TABLE whatsapp_configs (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_account_id             UUID,
    business_id                     UUID,
    phone_number_id                 TEXT NOT NULL,
    whatsapp_business_account_id    TEXT NOT NULL,
    access_token                    TEXT NOT NULL,
    webhook_verify_token            TEXT NOT NULL,
    display_phone_number            TEXT,
    status                          whatsapp_config_status DEFAULT 'active',
    is_shared                       BOOLEAN DEFAULT FALSE,
    is_enabled                      BOOLEAN DEFAULT TRUE,
    created_at                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ DEFAULT NOW(),

    -- Una sola config por (business_account_id, business_id), permitiendo NULLs
    CONSTRAINT uq_whatsapp_configs_business
        UNIQUE NULLS NOT DISTINCT (
            business_account_id,
            business_id
        )
);

CREATE INDEX idx_whatsapp_configs_account
    ON whatsapp_configs(business_account_id);

CREATE INDEX idx_whatsapp_configs_business
    ON whatsapp_configs(business_id);

CREATE INDEX idx_whatsapp_configs_phone_number
    ON whatsapp_configs(phone_number_id);

CREATE INDEX idx_whatsapp_configs_shared
    ON whatsapp_configs(is_shared)
    WHERE is_shared = TRUE;
