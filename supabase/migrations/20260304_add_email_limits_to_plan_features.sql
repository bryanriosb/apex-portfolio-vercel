-- Migration: Add email limits to plan features
-- Date: 2026-03-04
-- Description: Adds max_emails field to trial and free plan features

-- =====================================================
-- 1. UPDATE PLAN TRIAL - 10 emails total during trial period
-- =====================================================

UPDATE plans 
SET features = features || '{"max_emails": 10}'::jsonb
WHERE code = 'trial';

-- =====================================================
-- 2. UPDATE PLAN FREE - 0 emails (upgrade required)
-- =====================================================

UPDATE plans 
SET features = features || '{"max_emails": 0}'::jsonb
WHERE code = 'free';

-- =====================================================
-- 3. UPDATE OTHER PAID PLANS - Unlimited emails (null)
-- =====================================================

UPDATE plans 
SET features = features || '{"max_emails": null}'::jsonb
WHERE code NOT IN ('trial', 'free') 
  AND (features->>'max_emails' IS NULL OR NOT (features ? 'max_emails'));

-- =====================================================
-- 4. VERIFY UPDATES
-- =====================================================

SELECT code, name, features->>'max_emails' as max_emails
FROM plans 
ORDER BY code;

-- =====================================================
-- 5. ADD COMMENT
-- =====================================================

COMMENT ON COLUMN plans.features IS 'Plan features including max_emails limit. For trial: 10 total. For free: 0. For paid: null (unlimited).';