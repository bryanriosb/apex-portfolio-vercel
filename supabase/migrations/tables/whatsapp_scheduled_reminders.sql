CREATE TYPE whatsapp_reminder_type AS ENUM (
  'appointment_reminder',
  'appointment_confirmation',
  'custom'
);

CREATE TYPE whatsapp_reminder_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'cancelled'
);

CREATE TABLE whatsapp_scheduled_reminders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id      UUID NOT NULL,
    business_account_id UUID NOT NULL,
    business_id         UUID NOT NULL,
    customer_phone      TEXT NOT NULL,
    customer_name       TEXT NOT NULL,
    scheduled_for       TIMESTAMPTZ NOT NULL,
    reminder_type       whatsapp_reminder_type DEFAULT 'appointment_reminder',
    status              whatsapp_reminder_status DEFAULT 'pending',
    error_message       TEXT,
    sent_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_whatsapp_scheduled_reminders_appointment
        UNIQUE (appointment_id, reminder_type, scheduled_for)
);

CREATE INDEX idx_whatsapp_scheduled_reminders_pending
    ON whatsapp_scheduled_reminders(status, scheduled_for)
    WHERE status = 'pending';
