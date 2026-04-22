import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchBankTransactionsAction,
  getBankTransactionByIdAction,
  createBankTransactionAction,
  bulkInsertBankTransactionsAction,
  updateBankTransactionAction,
  matchTransactionToCustomerAction,
  deleteBankTransactionAction,
  getUnidentifiedTransactionsCountAction,
  getTodayTransactionsSummaryAction,
  getRecaudoDashboardStatsAction,
  getRecaudoByBankAction,
} from '@/lib/actions/bank-transactions/transaction'
import * as supabaseModule from '@/lib/actions/supabase'

// Mock the Supabase client
vi.mock('@/lib/actions/supabase', () => ({
  getSupabaseAdminClient: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
}))

// Create a more robust mock query builder that properly chains
const createMockQueryBuilder = () => {
  const builder: any = {}

  // Create chainable methods
  const chainableMethods = [
    'select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'gte', 'lte',
    'gt', 'lt', 'or', 'range', 'order', 'single', 'limit', 'like', 'ilike'
  ]

  chainableMethods.forEach(method => {
    builder[method] = vi.fn(() => builder)
  })

  // Add mockResolvedValue for the final resolution
  builder.mockResolvedValue = vi.fn((value: any) => {
    // Make all chainable methods return the builder
    chainableMethods.forEach(method => {
      builder[method] = vi.fn(() => builder)
    })
    // The last call in the chain should resolve to the value
    builder.then = (resolve: any) => resolve(value)
    return builder
  })

  return builder
}

describe('transaction-actions', () => {
  let mockSupabase: any
  let mockQueryBuilder: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryBuilder = createMockQueryBuilder()
    mockSupabase = {
      from: vi.fn(() => mockQueryBuilder),
    }
    ;(supabaseModule.getSupabaseAdminClient as any).mockResolvedValue(mockSupabase)
  })

  describe('fetchBankTransactionsAction', () => {
    it('should return empty result when no business_id provided', async () => {
      const result = await fetchBankTransactionsAction()
      expect(result).toEqual({ data: [], total: 0, total_pages: 0 })
    })

    it('should fetch transactions with pagination', async () => {
      const mockData = [
        { id: '1', amount: 1000, status: 'identified' },
        { id: '2', amount: 2000, status: 'unidentified' },
      ]

      mockQueryBuilder.select.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.eq.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.order.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.range.mockImplementation(() => mockQueryBuilder)

      // Set up the final resolution
      Object.defineProperty(mockQueryBuilder, 'then', {
        get: () => (resolve: any) => resolve({ data: mockData, error: null, count: 2 }),
        configurable: true
      })

      const result = await fetchBankTransactionsAction({
        business_id: 'business-123',
        page: 1,
        page_size: 20,
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('bank_transactions')
    })

    it('should return empty result on error', async () => {
      mockQueryBuilder.select.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.eq.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.order.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.range.mockImplementation(() => mockQueryBuilder)

      Object.defineProperty(mockQueryBuilder, 'then', {
        get: () => (resolve: any) => resolve({ data: null, error: { message: 'DB error' } }),
        configurable: true
      })

      const result = await fetchBankTransactionsAction({
        business_id: 'business-123',
      })

      expect(result).toEqual({ data: [], total: 0, total_pages: 0 })
    })
  })

  describe('getBankTransactionByIdAction', () => {
    it('should fetch transaction by ID', async () => {
      const mockTransaction = {
        id: 'tx-123',
        amount: 1000,
        customer: { id: 'cust-1', full_name: 'John Doe', nit: '900123' },
      }

      mockQueryBuilder.select.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.eq.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.single.mockImplementation(() => mockQueryBuilder)

      Object.defineProperty(mockQueryBuilder, 'then', {
        get: () => (resolve: any) => resolve({ data: mockTransaction, error: null }),
        configurable: true
      })

      const result = await getBankTransactionByIdAction('tx-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('bank_transactions')
    })

    it('should return null on error', async () => {
      mockQueryBuilder.select.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.eq.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.single.mockImplementation(() => mockQueryBuilder)

      Object.defineProperty(mockQueryBuilder, 'then', {
        get: () => (resolve: any) => resolve({ data: null, error: { message: 'Not found' } }),
        configurable: true
      })

      const result = await getBankTransactionByIdAction('invalid-id')

      expect(result).toBeNull()
    })
  })

  describe('createBankTransactionAction', () => {
    it('should create transaction with defaults', async () => {
      const mockTransaction = {
        id: 'tx-new',
        business_id: 'business-123',
        amount: 1000,
        status: 'unidentified',
      }

      mockQueryBuilder.insert.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.select.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.single.mockImplementation(() => mockQueryBuilder)

      Object.defineProperty(mockQueryBuilder, 'then', {
        get: () => (resolve: any) => resolve({ data: mockTransaction, error: null }),
        configurable: true
      })

      const result = await createBankTransactionAction({
        business_id: 'business-123',
        transaction_date: '2026-03-24',
        amount: 1000,
        bank_name: 'BANCOLOMBIA',
      })

      expect(result.success).toBe(true)
    })

    it('should return error on failure', async () => {
      mockQueryBuilder.insert.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.select.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.single.mockImplementation(() => mockQueryBuilder)

      Object.defineProperty(mockQueryBuilder, 'then', {
        get: () => (resolve: any) => resolve({ data: null, error: { message: 'Insert failed' } }),
        configurable: true
      })

      const result = await createBankTransactionAction({
        business_id: 'business-123',
        transaction_date: '2026-03-24',
        amount: 1000,
        bank_name: 'BANCOLOMBIA',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('bulkInsertBankTransactionsAction', () => {
    it('should return success with count 0 for empty array', async () => {
      const result = await bulkInsertBankTransactionsAction([])

      expect(result.success).toBe(true)
      expect(result.count).toBe(0)
    })

    it('should insert multiple transactions', async () => {
      const mockData = [{ id: 'tx-1' }, { id: 'tx-2' }]

      mockQueryBuilder.insert.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.select.mockImplementation(() => mockQueryBuilder)

      Object.defineProperty(mockQueryBuilder, 'then', {
        get: () => (resolve: any) => resolve({ data: mockData, error: null }),
        configurable: true
      })

      const transactions = [
        { business_id: 'business-123', transaction_date: '2026-03-24', amount: 1000, bank_name: 'BANCOLOMBIA' },
        { business_id: 'business-123', transaction_date: '2026-03-24', amount: 2000, bank_name: 'DAVIVIENDA' },
      ]

      const result = await bulkInsertBankTransactionsAction(transactions)

      expect(result.success).toBe(true)
      expect(result.count).toBe(2)
    })

    it('should detect duplicates with error code 23505', async () => {
      mockQueryBuilder.insert.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.select.mockImplementation(() => mockQueryBuilder)

      Object.defineProperty(mockQueryBuilder, 'then', {
        get: () => (resolve: any) => resolve({
          data: null,
          error: { code: '23505', message: 'Duplicate key' },
        }),
        configurable: true
      })

      const transactions = [
        { business_id: 'business-123', transaction_date: '2026-03-24', amount: 1000, bank_name: 'BANCOLOMBIA' },
      ]

      const result = await bulkInsertBankTransactionsAction(transactions)

      expect(result.success).toBe(false)
      expect(result.duplicates).toBe(1)
    })
  })

  describe('matchTransactionToCustomerAction', () => {
    it('should update transaction with customer match', async () => {
      mockQueryBuilder.update.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.eq.mockImplementation(() => mockQueryBuilder)

      Object.defineProperty(mockQueryBuilder, 'then', {
        get: () => (resolve: any) => resolve({ error: null }),
        configurable: true
      })

      const result = await matchTransactionToCustomerAction(
        'tx-123',
        'customer-456',
        'user-789'
      )

      expect(result.success).toBe(true)
    })

    it('should return error on match failure', async () => {
      mockQueryBuilder.update.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.eq.mockImplementation(() => mockQueryBuilder)

      Object.defineProperty(mockQueryBuilder, 'then', {
        get: () => (resolve: any) => resolve({ error: { message: 'Match failed' } }),
        configurable: true
      })

      const result = await matchTransactionToCustomerAction(
        'tx-123',
        'customer-456',
        'user-789'
      )

      expect(result.success).toBe(false)
    })
  })

  describe('deleteBankTransactionAction', () => {
    it('should delete transaction', async () => {
      ;(supabaseModule.deleteRecord as any).mockResolvedValue(undefined)

      const result = await deleteBankTransactionAction('tx-123')

      expect(result.success).toBe(true)
    })

    it('should return error on delete failure', async () => {
      ;(supabaseModule.deleteRecord as any).mockRejectedValue(new Error('Delete failed'))

      const result = await deleteBankTransactionAction('tx-123')

      expect(result.success).toBe(false)
    })
  })

  describe('getUnidentifiedTransactionsCountAction', () => {
    it('should count unidentified and no_nit transactions', async () => {
      mockQueryBuilder.select.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.eq.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.in.mockImplementation(() => mockQueryBuilder)

      Object.defineProperty(mockQueryBuilder, 'then', {
        get: () => (resolve: any) => resolve({ count: 5, error: null }),
        configurable: true
      })

      const result = await getUnidentifiedTransactionsCountAction('business-123')

      expect(result).toBe(5)
    })

    it('should return 0 on error', async () => {
      mockQueryBuilder.select.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.eq.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.in.mockImplementation(() => mockQueryBuilder)

      Object.defineProperty(mockQueryBuilder, 'then', {
        get: () => (resolve: any) => resolve({ count: null, error: { message: 'Error' } }),
        configurable: true
      })

      const result = await getUnidentifiedTransactionsCountAction('business-123')

      expect(result).toBe(0)
    })
  })

  describe('getRecaudoByBankAction', () => {
    it('should return recaudo grouped by bank with percentages', async () => {
      const mockData = [
        { amount: 4000, bank_name: 'BANCOLOMBIA' },
        { amount: 2000, bank_name: 'DAVIVIENDA' },
        { amount: 2000, bank_name: 'DAVIVIENDA' },
      ]

      mockQueryBuilder.select.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.eq.mockImplementation(() => mockQueryBuilder)

      Object.defineProperty(mockQueryBuilder, 'then', {
        get: () => (resolve: any) => resolve({ data: mockData, error: null }),
        configurable: true
      })

      const result = await getRecaudoByBankAction('business-123')

      expect(result).toHaveLength(2)
      expect(result[0].bank_name).toBe('BANCOLOMBIA')
      expect(result[0].amount).toBe(4000)
      expect(result[0].count).toBe(1)
      expect(result[0].percentage).toBe(50)
    })

    it('should sort by amount descending', async () => {
      const mockData = [
        { amount: 1000, bank_name: 'BBVA' },
        { amount: 5000, bank_name: 'BANCOLOMBIA' },
      ]

      mockQueryBuilder.select.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.eq.mockImplementation(() => mockQueryBuilder)

      Object.defineProperty(mockQueryBuilder, 'then', {
        get: () => (resolve: any) => resolve({ data: mockData, error: null }),
        configurable: true
      })

      const result = await getRecaudoByBankAction('business-123')

      expect(result[0].bank_name).toBe('BANCOLOMBIA')
      expect(result[0].amount).toBe(5000)
    })

    it('should return empty array on error', async () => {
      mockQueryBuilder.select.mockImplementation(() => mockQueryBuilder)
      mockQueryBuilder.eq.mockImplementation(() => mockQueryBuilder)

      Object.defineProperty(mockQueryBuilder, 'then', {
        get: () => (resolve: any) => resolve({ data: null, error: { message: 'Error' } }),
        configurable: true
      })

      const result = await getRecaudoByBankAction('business-123')

      expect(result).toEqual([])
    })
  })
})
