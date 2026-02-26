-- Migration to move collection_config from business_account_id to business_id

-- 1. Drop dependent policies first
DROP POLICY IF EXISTS "Users can view own config" ON collection_config;
DROP POLICY IF EXISTS "Users can update own config" ON collection_config;
DROP POLICY IF EXISTS "Users can create config" ON collection_config;

-- 2. Add the new column
ALTER TABLE collection_config ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- 3. Migrate existing data (find a matching business for the account)
-- Note: If an account has multiple businesses, this picks one arbitrarily for the config.
-- This is a best-effort migration of existing data during the multitenant shift.
UPDATE collection_config cc
SET business_id = (
    SELECT b.id 
    FROM businesses b 
    WHERE b.business_account_id = cc.business_account_id 
    LIMIT 1
);

-- Delete orphaned configs that couldn't be matched to avoid NOT NULL violations
DELETE FROM collection_config WHERE business_id IS NULL;

-- 4. Make the new column NOT NULL and UNIQUE (required for UPSERT)
ALTER TABLE collection_config ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE collection_config ADD CONSTRAINT collection_config_business_id_key UNIQUE(business_id);

-- 5. Drop the old column and its constraints
ALTER TABLE collection_config DROP COLUMN business_account_id;

-- 6. Recreate Policies for multitenant support using business_id
CREATE POLICY "Users can view own config"
  ON collection_config FOR SELECT
  USING (
    business_id = (auth.jwt() -> 'user_metadata' ->> 'business_id')::UUID
    OR
    business_id IN (
      SELECT (jsonb_array_elements((auth.jwt() -> 'user_metadata' -> 'businesses'))::jsonb ->> 'id')::UUID
    )
  );

CREATE POLICY "Users can create config"
  ON collection_config FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own config"
  ON collection_config FOR UPDATE
  USING (
    business_id = (auth.jwt() -> 'user_metadata' ->> 'business_id')::UUID
    OR
    business_id IN (
      SELECT (jsonb_array_elements((auth.jwt() -> 'user_metadata' -> 'businesses'))::jsonb ->> 'id')::UUID
    )
  );
