-- Fix: PGRST204 "Could not find the 'created_by' column of 'business_accounts'"
-- El frontend envía created_by (app/admin/business-accounts/page.tsx) pero la
-- columna nunca se creó en la tabla. Se define como uuid sin FK, igual que
-- created_by en collection_executions, bank_transaction_batches, etc.

ALTER TABLE public.business_accounts
  ADD COLUMN IF NOT EXISTS created_by uuid;

COMMENT ON COLUMN public.business_accounts.created_by IS 'Usuario que creó la cuenta';

-- Refresca el schema cache de PostgREST (Supabase lo hace solo tras DDL en el
-- dashboard, pero por si se ejecuta vía conexión directa):
NOTIFY pgrst, 'reload schema';
