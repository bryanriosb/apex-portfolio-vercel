# Collection Migration SQL - Fixes Applied

## ✅ Issues Fixed

### 1. Table Order Issue
**Problem:** `collection_executions` referenced `collection_templates` before it was created (line 32 vs line 166)

**Solution:** Moved `collection_templates` table creation to the top (before `collection_executions`)

**Order now:**
1. collection_templates (FIRST - referenced by others)
2. collection_executions
3. collection_clients
4. collection_events
5. collection_attachments
6. collection_config

### 2. RLS Policies - user_businesses Error
**Problem:** All RLS policies referenced non-existent `user_businesses` table

**Solution:** Updated all policies to use `auth.users` metadata pattern

**Before:**
```sql
business_id IN (
  SELECT business_id FROM user_businesses 
  WHERE user_id = auth.uid()
)
```

**After:**
```sql
business_id = (auth.jwt() -> 'user_metadata' ->> 'business_id')::UUID
OR
business_id IN (
  SELECT (jsonb_array_elements((auth.jwt() -> 'user_metadata' -> 'businesses'))::jsonb ->> 'id')::UUID
)
```

### 3. Policy Updates Summary

**For business_id based tables** (executions, clients, events):
- Checks `user_metadata -> business_id` (primary business)
- Also checks `user_metadata -> businesses` array (multi-business support)

**For business_account_id based tables** (templates, attachments, config):
- Checks `user_metadata -> business_account_id`

## 📋 RLS Policies Updated

All policies now correctly access user metadata from `auth.jwt()`:

1. **collection_executions**: 4 policies (SELECT, INSERT, UPDATE, DELETE)
2. **collection_clients**: 3 policies (SELECT, INSERT, UPDATE)
3. **collection_events**: 2 policies (SELECT, INSERT)
4. **collection_templates**: 4 policies (SELECT, INSERT, UPDATE, DELETE)
5. **collection_attachments**: 4 policies (SELECT, INSERT, UPDATE, DELETE)
6. **collection_config**: 3 policies (SELECT, INSERT, UPDATE)

**Total:** 20 policies corrected

## ✅ Ready to Execute

The migration file is now ready to run:

```bash
# From Supabase SQL Editor or psql:
psql -h <host> -U <user> -d <database> -f docs/collection_migration.sql
```

or copy/paste into Supabase SQL Editor.

## 🔐 Security Notes

- RLS properly enforces business isolation using JWT metadata
- Multi-business users can access all their businesses
- Policies support both single and multiple business access patterns
- INSERT policies check authentication role
- All sensitive tables have proper row-level security

## 📊 Tables Created

- ✅ collection_templates (45 lines)
- ✅ collection_executions (102 lines)
- ✅ collection_clients (170 lines)
- ✅ collection_events (210 lines)
- ✅ collection_attachments (238 lines)
- ✅ collection_config (280 lines)
- ✅ All RLS policies (20 policies)
- ✅ All triggers and functions (5 triggers, 3 functions)
- ✅ All indexes (13 indexes)
