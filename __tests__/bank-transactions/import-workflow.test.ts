import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateImportConfigAction,
  importBankTransactionsAction,
} from '@/lib/actions/bank-transactions/import'
import * as configModule from '@/lib/actions/collection/config'
import * as authModule from '@/lib/services/auth/supabase-auth'
import * as batchModule from '@/lib/actions/bank-transactions/batch'
import * as supabaseModule from '@/lib/actions/supabase'

// Mock all dependencies
vi.mock('@/lib/actions/collection/config', () => ({
  getCollectionConfigAction: vi.fn(),
}))

vi.mock('@/lib/services/auth/supabase-auth', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/actions/bank-transactions/batch', () => ({
  createBankTransactionBatchAction: vi.fn(),
  completeBankTransactionBatchAction: vi.fn(),
}))

vi.mock('@/lib/actions/supabase', () => ({
  getSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/lib/services/bank-transactions/import-service', () => ({
  prepareTransactionInserts: vi.fn((businessId, batchId, transactions, matches, fileName) =>
    transactions.map((tx: any) => ({
      business_id: businessId,
      import_batch_id: batchId,
      transaction_date: tx.transaction_date,
      amount: tx.amount,
      bank_name: tx.bank_name,
      customer_id: matches[tx.customer_nit] || null,
      customer_nit: tx.customer_nit,
      status: !tx.customer_nit ? 'no_nit' : matches[tx.customer_nit] ? 'identified' : 'unidentified',
      source_file_name: fileName,
      raw_data: {},
    }))
  ),
}))

const createMockQueryBuilder = () => {
  const builder: any = {}
  const chainableMethods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'gte', 'or']

  chainableMethods.forEach(method => {
    builder[method] = vi.fn(() => builder)
  })

  return builder
}

describe('import-workflow', () => {
  let mockSupabase: any
  let mockQueryBuilder: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryBuilder = createMockQueryBuilder()
    mockSupabase = {
      from: vi.fn(() => mockQueryBuilder),
    }
    ;(supabaseModule.getSupabaseAdminClient as any).mockResolvedValue(mockSupabase)
    ;(authModule.getCurrentUser as any).mockResolvedValue({ id: 'user-123' })
  })

  describe('validateImportConfigAction', () => {
    it('should return valid with date format when config exists', async () => {
      ;(configModule.getCollectionConfigAction as any).mockResolvedValue({
        success: true,
        data: { input_date_format: 'DD-MM-AAAA' },
      })

      const result = await validateImportConfigAction('business-123')

      expect(result.valid).toBe(true)
      expect(result.dateFormat).toBe('DD-MM-AAAA')
    })

    it('should return invalid when config fetch fails', async () => {
      ;(configModule.getCollectionConfigAction as any).mockResolvedValue({
        success: false,
      })

      const result = await validateImportConfigAction('business-123')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Error al obtener configuración')
    })

    it('should return requiresConfig when date format not configured', async () => {
      ;(configModule.getCollectionConfigAction as any).mockResolvedValue({
        success: true,
        data: { input_date_format: null },
      })

      const result = await validateImportConfigAction('business-123')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('formato de fecha')
    })
  })

  describe('importBankTransactionsAction', () => {
    const mockSheets = [
      {
        bankName: 'BANCOLOMBIA',
        sheetName: 'Bancolombia',
        rowCount: 3,
        columns: ['FECHA', 'VALOR', 'NIT', 'NOMBRE'],
        transactions: [
          {
            transaction_date: '2026-03-24',
            amount: 1000,
            bank_name: 'BANCOLOMBIA',
            customer_nit: '900123456',
            customer_name_extract: 'Cliente Test',
            reference: 'REF001',
            description: null,
            agent_name: null,
            receipt_status: null,
            notes: null,
            raw_data: {},
            row_number: 2,
          },
          {
            transaction_date: '2026-03-24',
            amount: 2000,
            bank_name: 'BANCOLOMBIA',
            customer_nit: '900654321',
            customer_name_extract: 'Cliente Test 2',
            reference: 'REF002',
            description: null,
            agent_name: null,
            receipt_status: null,
            notes: null,
            raw_data: {},
            row_number: 3,
          },
        ],
        errors: [],
      },
    ]

    it('should return requiresConfig when config is invalid', async () => {
      ;(configModule.getCollectionConfigAction as any).mockResolvedValue({
        success: false,
      })

      const result = await importBankTransactionsAction(
        'test.xlsx',
        mockSheets,
        'business-123'
      )

      expect(result.success).toBe(false)
      expect(result.requiresConfig).toBe(true)
    })

    it('should return error when no valid transactions', async () => {
      ;(configModule.getCollectionConfigAction as any).mockResolvedValue({
        success: true,
        data: { input_date_format: 'DD-MM-AAAA' },
      })

      const emptySheets = [
        {
          bankName: 'BANCOLOMBIA',
          sheetName: 'Bancolombia',
          rowCount: 0,
          columns: [],
          transactions: [],
          errors: ['No data found'],
        },
      ]

      const result = await importBankTransactionsAction(
        'test.xlsx',
        emptySheets,
        'business-123'
      )

      expect(result.success).toBe(false)
      expect(result.errors).toContain('No data found')
    })

    it('should return error when batch creation fails', async () => {
      ;(configModule.getCollectionConfigAction as any).mockResolvedValue({
        success: true,
        data: { input_date_format: 'DD-MM-AAAA' },
      })

      ;(batchModule.createBankTransactionBatchAction as any).mockResolvedValue({
        success: false,
        error: 'Database error',
      })

      const result = await importBankTransactionsAction(
        'test.xlsx',
        mockSheets,
        'business-123'
      )

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Database error')
    })

    it('should successfully import transactions', async () => {
      ;(configModule.getCollectionConfigAction as any).mockResolvedValue({
        success: true,
        data: { input_date_format: 'DD-MM-AAAA' },
      })

      ;(batchModule.createBankTransactionBatchAction as any).mockResolvedValue({
        success: true,
        data: { id: 'batch-123' },
      })

      // Mock customer matching
      mockQueryBuilder.select.mockReturnThis()
      mockQueryBuilder.eq.mockReturnThis()
      mockQueryBuilder.in.mockImplementation(() => {
        Object.defineProperty(mockQueryBuilder, 'then', {
          get: () => (resolve: any) => resolve({
            data: [{ id: 'customer-1', nit: '900123456' }],
            error: null,
          }),
          configurable: true
        })
        return mockQueryBuilder
      })

      // Mock duplicate detection
      mockQueryBuilder.or.mockImplementation(() => {
        Object.defineProperty(mockQueryBuilder, 'then', {
          get: () => (resolve: any) => resolve({
            data: [],
            error: null,
          }),
          configurable: true
        })
        return mockQueryBuilder
      })

      // Mock transaction insertion
      mockQueryBuilder.insert.mockReturnThis()
      mockQueryBuilder.select.mockImplementation(() => {
        Object.defineProperty(mockQueryBuilder, 'then', {
          get: () => (resolve: any) => resolve({
            data: [{ id: 'tx-1' }, { id: 'tx-2' }],
            error: null,
          }),
          configurable: true
        })
        return mockQueryBuilder
      })

      ;(batchModule.completeBankTransactionBatchAction as any).mockResolvedValue({
        success: true,
      })

      const result = await importBankTransactionsAction(
        'test.xlsx',
        mockSheets,
        'business-123'
      )

      expect(result.success).toBe(true)
      expect(result.batchId).toBe('batch-123')
      expect(result.stats).toBeDefined()
      expect(result.stats?.total).toBe(2)
    })

    it('should handle transactions without NIT', async () => {
      ;(configModule.getCollectionConfigAction as any).mockResolvedValue({
        success: true,
        data: { input_date_format: 'DD-MM-AAAA' },
      })

      ;(batchModule.createBankTransactionBatchAction as any).mockResolvedValue({
        success: true,
        data: { id: 'batch-123' },
      })

      const sheetsWithNoNit = [
        {
          ...mockSheets[0],
          transactions: [
            {
              transaction_date: '2026-03-24',
              amount: 1000,
              bank_name: 'BANCOLOMBIA',
              customer_nit: null,
              customer_name_extract: 'Sin NIT',
              reference: 'REF001',
              description: null,
              agent_name: null,
              receipt_status: null,
              notes: null,
              raw_data: {},
              row_number: 2,
            },
          ],
        },
      ]

      // Mock customer matching (empty)
      mockQueryBuilder.select.mockReturnThis()
      mockQueryBuilder.eq.mockReturnThis()
      mockQueryBuilder.in.mockImplementation(() => {
        Object.defineProperty(mockQueryBuilder, 'then', {
          get: () => (resolve: any) => resolve({
            data: [],
            error: null,
          }),
          configurable: true
        })
        return mockQueryBuilder
      })

      // Mock duplicate detection
      mockQueryBuilder.or.mockImplementation(() => {
        Object.defineProperty(mockQueryBuilder, 'then', {
          get: () => (resolve: any) => resolve({
            data: [],
            error: null,
          }),
          configurable: true
        })
        return mockQueryBuilder
      })

      // Mock transaction insertion
      mockQueryBuilder.insert.mockReturnThis()
      mockQueryBuilder.select.mockImplementation(() => {
        Object.defineProperty(mockQueryBuilder, 'then', {
          get: () => (resolve: any) => resolve({
            data: [{ id: 'tx-1' }],
            error: null,
          }),
          configurable: true
        })
        return mockQueryBuilder
      })

      ;(batchModule.completeBankTransactionBatchAction as any).mockResolvedValue({
        success: true,
      })

      const result = await importBankTransactionsAction(
        'test.xlsx',
        sheetsWithNoNit,
        'business-123'
      )

      expect(result.success).toBe(true)
      expect(result.stats?.no_nit).toBe(1)
    })
  })
})
