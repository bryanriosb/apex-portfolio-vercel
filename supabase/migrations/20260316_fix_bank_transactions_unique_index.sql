-- =====================================================
-- MIGRATION: Fix bank_transactions unique index
-- Description: Corregir índice único para detección de duplicados
-- Version: 1.0
-- Date: 2026-03-16
-- =====================================================

-- Eliminar índice anterior (usaba customer_nit en lugar de reference)
DROP INDEX IF EXISTS idx_bank_transactions_unique;

-- Crear índice único correcto según PRD
-- Solo aplica cuando reference IS NOT NULL y no está vacío
CREATE UNIQUE INDEX idx_bank_transactions_unique 
  ON bank_transactions(business_id, transaction_date, amount, reference) 
  WHERE reference IS NOT NULL AND reference != '';

-- Agregar comentario
COMMENT ON INDEX idx_bank_transactions_unique IS 
  'Detecta duplicados por business_id + fecha + monto + referencia (solo cuando hay referencia)';
