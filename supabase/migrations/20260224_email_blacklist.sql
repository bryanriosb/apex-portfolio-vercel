-- Migration: Create email_blacklist table for tracking bounced emails
-- Date: 2026-02-24
-- Purpose: Store emails that have bounced to prevent future sends and allow user management

-- Create email_blacklist table
CREATE TABLE IF NOT EXISTS email_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    bounce_type VARCHAR(50), -- 'hard', 'soft', 'complaint'
    bounce_reason TEXT, -- Detailed reason from the bounce event
    source_customer_id UUID REFERENCES business_customers(id) ON DELETE SET NULL,
    source_execution_id UUID REFERENCES collection_executions(id) ON DELETE SET NULL,
    source_client_id UUID REFERENCES collection_clients(id) ON DELETE SET NULL,
    provider VARCHAR(50) DEFAULT 'brevo', -- 'brevo', 'ses', etc.
    bounced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates per business
    UNIQUE (business_id, email)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_email_blacklist_business_id ON email_blacklist(business_id);
CREATE INDEX IF NOT EXISTS idx_email_blacklist_email ON email_blacklist(email);
CREATE INDEX IF NOT EXISTS idx_email_blacklist_bounce_type ON email_blacklist(bounce_type);
CREATE INDEX IF NOT EXISTS idx_email_blacklist_bounced_at ON email_blacklist(bounced_at DESC);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_blacklist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_blacklist_updated_at ON email_blacklist;
CREATE TRIGGER update_email_blacklist_updated_at
    BEFORE UPDATE ON email_blacklist
    FOR EACH ROW
    EXECUTE FUNCTION update_email_blacklist_updated_at();

-- Enable Row Level Security
ALTER TABLE email_blacklist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- View own business blacklist
CREATE POLICY "View own blacklist" ON email_blacklist
    FOR SELECT
    USING (business_id = (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid);

-- Manage own business blacklist
CREATE POLICY "Manage own blacklist" ON email_blacklist
    FOR ALL
    USING (business_id = (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid);

-- Function to add email to blacklist (idempotent)
CREATE OR REPLACE FUNCTION add_to_blacklist(
    p_business_id UUID,
    p_email VARCHAR(255),
    p_bounce_type VARCHAR(50) DEFAULT 'hard',
    p_bounce_reason TEXT DEFAULT NULL,
    p_source_customer_id UUID DEFAULT NULL,
    p_source_execution_id UUID DEFAULT NULL,
    p_source_client_id UUID DEFAULT NULL,
    p_provider VARCHAR(50) DEFAULT 'brevo'
)
RETURNS UUID AS $$
DECLARE
    v_blacklist_id UUID;
BEGIN
    -- Try to insert, if conflict (email already exists), update bounce info
    INSERT INTO email_blacklist (
        business_id,
        email,
        bounce_type,
        bounce_reason,
        source_customer_id,
        source_execution_id,
        source_client_id,
        provider,
        bounced_at
    ) VALUES (
        p_business_id,
        LOWER(TRIM(p_email)),
        p_bounce_type,
        p_bounce_reason,
        p_source_customer_id,
        p_source_execution_id,
        p_source_client_id,
        p_provider,
        NOW()
    )
    ON CONFLICT (business_id, email) DO UPDATE SET
        bounce_type = EXCLUDED.bounce_type,
        bounce_reason = EXCLUDED.bounce_reason,
        bounced_at = EXCLUDED.bounced_at,
        updated_at = NOW()
    RETURNING id INTO v_blacklist_id;
    
    RETURN v_blacklist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if email is blacklisted
CREATE OR REPLACE FUNCTION is_email_blacklisted(
    p_business_id UUID,
    p_email VARCHAR(255)
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM email_blacklist
        WHERE business_id = p_business_id
        AND email = LOWER(TRIM(p_email))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to filter blacklisted emails from an array
CREATE OR REPLACE FUNCTION filter_blacklisted_emails(
    p_business_id UUID,
    p_emails TEXT[]
)
RETURNS TABLE (
    email VARCHAR(255),
    is_blacklisted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        LOWER(TRIM(e.email))::VARCHAR(255) as email,
        EXISTS (
            SELECT 1 FROM email_blacklist b
            WHERE b.business_id = p_business_id
            AND b.email = LOWER(TRIM(e.email))
        ) as is_blacklisted
    FROM unnest(p_emails) as e(email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on table
COMMENT ON TABLE email_blacklist IS 'Stores emails that have bounced to prevent future sends and allow user management';
COMMENT ON COLUMN email_blacklist.bounce_type IS 'Type of bounce: hard (permanent), soft (temporary), complaint (user complaint)';
COMMENT ON COLUMN email_blacklist.bounced_at IS 'Timestamp when the bounce occurred';
