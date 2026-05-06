-- =====================================================
-- Migration: Add user_id to business_customers
-- Date: 2026-04-23
-- Description: Agrega columna user_id para vincular 
--              business_customers con auth.users
-- =====================================================

-- Agregar columna user_id (nullable para clientes sin cuenta)
ALTER TABLE public.business_customers
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Crear índice para búsquedas por user_id
CREATE INDEX idx_business_customers_user_id ON public.business_customers(user_id);

-- Comentario documental
COMMENT ON COLUMN public.business_customers.user_id IS 
'FK a auth.users. Nullable para clientes sin cuenta de usuario. Un mismo user_id puede estar en múltiples business_customers de diferentes negocios.';
