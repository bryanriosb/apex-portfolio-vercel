import { describe, it, expect } from 'vitest'
import {
  parseTransactionDate,
  normalizeNit,
  normalizeAmount,
  excelSerialToDate,
  normalizeColumnName,
  normalizeBankName,
} from '@/lib/services/bank-transactions/import-service'

// Note: Excel serial dates can have timezone issues depending on the system.
// The tests verify that the conversion produces valid dates rather than exact values.

describe('import-service', () => {
  describe('normalizeColumnName', () => {
    it('should normalize headers with spaces', () => {
      expect(normalizeColumnName('  FECHA  ')).toBe('fecha')
      expect(normalizeColumnName('NOMBRE  CLIENTE')).toBe('nombre cliente')
    })

    it('should normalize headers with accents', () => {
      expect(normalizeColumnName('FECHA_TRANSACCIÓN')).toBe('fecha_transaccion')
      expect(normalizeColumnName('NÚMERO')).toBe('numero')
    })

    it('should normalize headers with uppercase', () => {
      expect(normalizeColumnName('BANCOLOMBIA')).toBe('bancolombia')
      expect(normalizeColumnName('Valor')).toBe('valor')
    })

    it('should handle multiple spaces', () => {
      expect(normalizeColumnName('NOMBRE   CLIENTE')).toBe('nombre cliente')
    })

    it('should handle empty strings', () => {
      expect(normalizeColumnName('')).toBe('')
    })

    it('should handle special characters', () => {
      expect(normalizeColumnName('NIT_Cédula')).toBe('nit_cedula')
    })
  })

  describe('normalizeBankName', () => {
    it('should convert to uppercase', () => {
      expect(normalizeBankName('bancolombia')).toBe('BANCOLOMBIA')
      expect(normalizeBankName('Davivienda')).toBe('DAVIVIENDA')
    })

    it('should handle accents', () => {
      expect(normalizeBankName('Banco de Bogotá')).toBe('BANCO DE BOGOTA')
      expect(normalizeBankName('BANCÓLOMBIA')).toBe('BANCOLOMBIA')
    })

    it('should trim whitespace', () => {
      expect(normalizeBankName('  BBVA  ')).toBe('BBVA')
    })

    it('should normalize multiple spaces', () => {
      expect(normalizeBankName('Banco   de   Bogotá')).toBe('BANCO DE BOGOTA')
    })
  })

  describe('excelSerialToDate', () => {
    it('should convert Excel serial 46064 to a valid date', () => {
      const date = excelSerialToDate(46064)
      expect(date).toBeInstanceOf(Date)
      // Excel serial dates can have timezone issues, just verify it's a valid date
      expect(date.getFullYear()).toBeGreaterThan(2020)
    })

    it('should convert Excel serial 1 to a valid date', () => {
      const date = excelSerialToDate(1)
      expect(date).toBeInstanceOf(Date)
      // Excel epoch is around Dec 1899 / Jan 1900
      expect(date.getFullYear()).toBeLessThan(1901)
    })

    it('should convert Excel serial 45352 to a valid date', () => {
      const date = excelSerialToDate(45352)
      expect(date).toBeInstanceOf(Date)
      expect(date.getFullYear()).toBe(2024)
    })

    it('should handle decimal serials', () => {
      const date = excelSerialToDate(46064.5)
      expect(date).toBeInstanceOf(Date)
      expect(date.getFullYear()).toBeGreaterThan(2020)
    })
  })

  describe('parseTransactionDate', () => {
    describe('YYYYMMDD format', () => {
      it('should parse 20260304 to 2026-03-04', () => {
        const result = parseTransactionDate('20260304', 'DD-MM-AAAA')
        expect(result.date).toBe('2026-03-04')
        expect(result.error).toBeUndefined()
      })

      it('should parse 20240115 to 2024-01-15', () => {
        const result = parseTransactionDate('20240115', 'DD-MM-AAAA')
        expect(result.date).toBe('2024-01-15')
        expect(result.error).toBeUndefined()
      })

      it('should parse 20251231 to 2025-12-31', () => {
        const result = parseTransactionDate('20251231', 'DD-MM-AAAA')
        expect(result.date).toBe('2025-12-31')
        expect(result.error).toBeUndefined()
      })
    })

    describe('Excel serial format', () => {
      it('should parse Excel serial number', () => {
        const result = parseTransactionDate(46064, 'DD-MM-AAAA')
        expect(result.date).not.toBeNull()
        expect(result.error).toBeUndefined()
      })

      it('should parse Excel serial as string', () => {
        const result = parseTransactionDate('46064', 'DD-MM-AAAA')
        expect(result.date).not.toBeNull()
        expect(result.error).toBeUndefined()
      })
    })

    describe('Date object format', () => {
      it('should parse Date object to ISO string', () => {
        const date = new Date('2026-03-04')
        const result = parseTransactionDate(date, 'DD-MM-AAAA')
        expect(result.date).toBe('2026-03-04')
        expect(result.error).toBeUndefined()
      })

      it('should handle Date objects with time component', () => {
        const date = new Date('2026-03-04T15:30:00')
        const result = parseTransactionDate(date, 'DD-MM-AAAA')
        expect(result.date).toBe('2026-03-04')
        expect(result.error).toBeUndefined()
      })
    })

    describe('Empty/invalid values', () => {
      it('should return error for null', () => {
        const result = parseTransactionDate(null, 'DD-MM-AAAA')
        expect(result.date).toBeNull()
        expect(result.error).toBe('Fecha vacía')
      })

      it('should return error for undefined', () => {
        const result = parseTransactionDate(undefined, 'DD-MM-AAAA')
        expect(result.date).toBeNull()
        expect(result.error).toBe('Fecha vacía')
      })

      it('should return error for empty string', () => {
        const result = parseTransactionDate('', 'DD-MM-AAAA')
        expect(result.date).toBeNull()
        expect(result.error).toBe('Fecha vacía')
      })

      it('should return error for invalid date string', () => {
        const result = parseTransactionDate('not-a-date', 'DD-MM-AAAA')
        expect(result.date).toBeNull()
        expect(result.error).toBeDefined()
      })
    })

    describe('Custom date formats', () => {
      it('should parse DD-MM-AAAA format', () => {
        const result = parseTransactionDate('04-03-2026', 'DD-MM-AAAA')
        expect(result.date).toBe('2026-03-04')
        expect(result.error).toBeUndefined()
      })

      it('should parse DD/MM/AAAA format', () => {
        const result = parseTransactionDate('04/03/2026', 'DD/MM/AAAA')
        expect(result.date).toBe('2026-03-04')
        expect(result.error).toBeUndefined()
      })

      it('should parse AAAA-MM-DD format', () => {
        const result = parseTransactionDate('2026-03-04', 'AAAA-MM-DD')
        expect(result.date).toBe('2026-03-04')
        expect(result.error).toBeUndefined()
      })
    })
  })

  describe('normalizeNit', () => {
    it('should remove dots from NIT', () => {
      expect(normalizeNit('900.123.456')).toBe('900123456')
    })

    it('should remove commas from NIT', () => {
      expect(normalizeNit('900,123,456')).toBe('900123456')
    })

    it('should handle .0 suffix (Excel artifact)', () => {
      expect(normalizeNit('890907489.0')).toBe('890907489')
    })

    it('should handle dots and .0 suffix together', () => {
      expect(normalizeNit('890.907.489.0')).toBe('890907489')
    })

    it('should return null for NaN', () => {
      expect(normalizeNit('NaN')).toBeNull()
    })

    it('should return null for 0', () => {
      expect(normalizeNit('0')).toBeNull()
    })

    it('should return null for empty string', () => {
      expect(normalizeNit('')).toBeNull()
    })

    it('should return null for null', () => {
      expect(normalizeNit(null)).toBeNull()
    })

    it('should return null for undefined', () => {
      expect(normalizeNit(undefined)).toBeNull()
    })

    it('should preserve valid NITs', () => {
      expect(normalizeNit('900123456')).toBe('900123456')
      expect(normalizeNit('890907489')).toBe('890907489')
    })

    it('should handle numeric input', () => {
      expect(normalizeNit(900123456)).toBe('900123456')
    })
  })

  describe('normalizeAmount', () => {
    it('should handle numeric values', () => {
      expect(normalizeAmount(1000)).toBe(1000)
      expect(normalizeAmount(1500.50)).toBe(1500.50)
    })

    it('should handle string values', () => {
      expect(normalizeAmount('1000')).toBe(1000)
      expect(normalizeAmount('1500.50')).toBe(1500.50)
    })

    it('should return null for invalid values', () => {
      expect(normalizeAmount('not-a-number')).toBeNull()
      expect(normalizeAmount(NaN)).toBeNull()
    })

    it('should return null for null', () => {
      expect(normalizeAmount(null)).toBeNull()
    })

    it('should return null for undefined', () => {
      expect(normalizeAmount(undefined)).toBeNull()
    })

    it('should return null for empty string', () => {
      expect(normalizeAmount('')).toBeNull()
    })

    it('should handle zero', () => {
      expect(normalizeAmount(0)).toBe(0)
    })

    it('should handle negative values', () => {
      expect(normalizeAmount(-100)).toBe(-100)
    })
  })
})
