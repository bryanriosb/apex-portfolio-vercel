/**
 * Tests for useThresholdPreview Hook - Batch Processing
 * 
 * Validates that threshold preview works efficiently with large volumes
 * Step 2 and Step 3 of the wizard both use this hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useThresholdPreview } from '@/hooks/collection/use-threshold-preview'
import { NotificationThresholdService } from '@/lib/services/collection/notification-threshold-service'
import type { NotificationThreshold } from '@/lib/models/collection/notification-threshold'
import type { GroupedClient } from '@/components/collection/wizard/types'

// Mock the service
vi.mock('@/lib/services/collection/notification-threshold-service', () => ({
  NotificationThresholdService: {
    fetchThresholds: vi.fn(),
  },
}))

// Mock the store
vi.mock('@/lib/store/active-business-store', () => ({
  useActiveBusinessStore: () => ({
    activeBusiness: { id: 'test-business-id' },
  }),
}))

describe('useThresholdPreview - Batch Processing', () => {
  const mockThresholds: NotificationThreshold[] = [
    {
      id: 'thresh-1',
      name: '0-30 días',
      days_from: 0,
      days_to: 30,
      email_template_id: 'template-1',
      business_id: 'test-business-id',
      is_active: true,
      display_order: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      email_template: { id: 'template-1', name: 'Template 0-30' },
    },
    {
      id: 'thresh-2',
      name: '31-60 días',
      days_from: 31,
      days_to: 60,
      email_template_id: 'template-2',
      business_id: 'test-business-id',
      is_active: true,
      display_order: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      email_template: { id: 'template-2', name: 'Template 31-60' },
    },
    {
      id: 'thresh-3',
      name: '60+ días',
      days_from: 61,
      days_to: null,
      email_template_id: 'template-3',
      business_id: 'test-business-id',
      is_active: true,
      display_order: 2,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      email_template: { id: 'template-3', name: 'Template 60+' },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(NotificationThresholdService.fetchThresholds).mockResolvedValue({
      data: mockThresholds,
      total: mockThresholds.length,
    })
  })

  function createMockClients(count: number, daysDistribution: number[]): GroupedClient[] {
    return Array.from({ length: count }, (_, i) => {
      const daysOverdue = daysDistribution[i % daysDistribution.length]
      return {
        nit: `900${i.toString().padStart(6, '0')}`,
        invoices: [{ 
          amount_due: '1000', 
          invoice_number: `INV-${i}`,
          invoice_date: '2024-01-01',
          due_date: '2024-02-01',
          days_overdue: daysOverdue.toString(),
        }],
        customer: {
          id: `cust-${i}`,
          full_name: `Customer ${i}`,
          company_name: `Company ${i}`,
          emails: [`customer${i}@test.com`],
        },
        status: 'found',
        total: {
          total_amount_due: 1000 + i,
          total_days_overdue: daysOverdue,
          total_invoices: 1,
        },
      }
    })
  }

  describe('Single DB Call Validation', () => {
    it('should make only ONE fetchThresholds call for 1000 clients', async () => {
      const clients = new Map(
        createMockClients(1000, [15, 45, 90]).map(c => [c.nit, c])
      )

      const { result } = renderHook(() => useThresholdPreview(clients))

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(NotificationThresholdService.fetchThresholds).toHaveBeenCalledTimes(1)
      expect(NotificationThresholdService.fetchThresholds).toHaveBeenCalledWith('test-business-id')
    })

    it('should make only ONE fetchThresholds call for 16000 clients', async () => {
      const clients = new Map(
        createMockClients(16000, [15, 45, 90]).map(c => [c.nit, c])
      )

      const { result } = renderHook(() => useThresholdPreview(clients))

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(NotificationThresholdService.fetchThresholds).toHaveBeenCalledTimes(1)
    })
  })

  describe('Threshold Distribution Calculation', () => {
    it('should correctly group clients by threshold ranges', async () => {
      // 3 clients with different days overdue
      const clients = new Map([
        ['1', {
          nit: '1',
          invoices: [],
          customer: { id: 'c1' },
          status: 'found' as const,
          total: { total_amount_due: 1000, total_days_overdue: 15, total_invoices: 1 },
        }],
        ['2', {
          nit: '2',
          invoices: [],
          customer: { id: 'c2' },
          status: 'found' as const,
          total: { total_amount_due: 2000, total_days_overdue: 45, total_invoices: 1 },
        }],
        ['3', {
          nit: '3',
          invoices: [],
          customer: { id: 'c3' },
          status: 'found' as const,
          total: { total_amount_due: 3000, total_days_overdue: 90, total_invoices: 1 },
        }],
      ])

      const { result } = renderHook(() => useThresholdPreview(clients))

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.previewData).toHaveLength(3)
      expect(result.current.previewData[0].threshold?.id).toBe('thresh-1')
      expect(result.current.previewData[0].count).toBe(1)
      expect(result.current.previewData[1].threshold?.id).toBe('thresh-2')
      expect(result.current.previewData[1].count).toBe(1)
      expect(result.current.previewData[2].threshold?.id).toBe('thresh-3')
      expect(result.current.previewData[2].count).toBe(1)
    })

    it('should handle multiple clients in the same threshold', async () => {
      const clients = new Map([
        ['1', { nit: '1', invoices: [], customer: { id: 'c1' }, status: 'found' as const, total: { total_amount_due: 1000, total_days_overdue: 10, total_invoices: 1 } }],
        ['2', { nit: '2', invoices: [], customer: { id: 'c2' }, status: 'found' as const, total: { total_amount_due: 2000, total_days_overdue: 20, total_invoices: 1 } }],
        ['3', { nit: '3', invoices: [], customer: { id: 'c3' }, status: 'found' as const, total: { total_amount_due: 3000, total_days_overdue: 30, total_invoices: 1 } }],
      ])

      const { result } = renderHook(() => useThresholdPreview(clients))

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.previewData).toHaveLength(1)
      expect(result.current.previewData[0].threshold?.id).toBe('thresh-1')
      expect(result.current.previewData[0].count).toBe(3)
      expect(result.current.previewData[0].clients).toHaveLength(3)
    })

    it('should identify unassigned clients', async () => {
      const clients = new Map([
        ['1', { nit: '1', invoices: [], customer: { id: 'c1' }, status: 'found' as const, total: { total_amount_due: 1000, total_days_overdue: -5, total_invoices: 1 } }],
        ['2', { nit: '2', invoices: [], customer: { id: 'c2' }, status: 'found' as const, total: { total_amount_due: 2000, total_days_overdue: 15, total_invoices: 1 } }],
      ])

      const { result } = renderHook(() => useThresholdPreview(clients))

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.unassignedCount).toBe(1)
      expect(result.current.unassignedClients).toHaveLength(1)
      expect(result.current.unassignedClients[0].nit).toBe('1')
      expect(result.current.hasAllThresholds).toBe(false)
    })

    it('should calculate missing threshold ranges correctly', async () => {
      const clients = new Map([
        ['1', { nit: '1', invoices: [], customer: { id: 'c1' }, status: 'found' as const, total: { total_amount_due: 1000, total_days_overdue: 75, total_invoices: 1 } }],
        ['2', { nit: '2', invoices: [], customer: { id: 'c2' }, status: 'found' as const, total: { total_amount_due: 2000, total_days_overdue: 76, total_invoices: 1 } }],
        ['3', { nit: '3', invoices: [], customer: { id: 'c3' }, status: 'found' as const, total: { total_amount_due: 3000, total_days_overdue: 80, total_invoices: 1 } }],
      ])

      // Override mock to return only thresholds that don't cover 75-80 days
      vi.mocked(NotificationThresholdService.fetchThresholds).mockResolvedValue({
        data: [mockThresholds[0], mockThresholds[1]], // Only 0-30 and 31-60
        total: 2,
      })

      const { result } = renderHook(() => useThresholdPreview(clients))

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.missingThresholdRanges).toContainEqual({ min: 75, max: 80 })
    })
  })

  describe('Large Volume Processing', () => {
    it('should handle 5000 clients efficiently', async () => {
      const clients = new Map(
        createMockClients(5000, [10, 20, 45, 50, 90]).map(c => [c.nit, c])
      )

      const start = performance.now()
      const { result } = renderHook(() => useThresholdPreview(clients))

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      const duration = performance.now() - start

      expect(result.current.totalClients).toBe(5000)
      expect(result.current.previewData.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(3000) // Should complete in under 3 seconds
    })

    it('should handle 16000 clients (the critical threshold)', async () => {
      const clients = new Map(
        createMockClients(16000, [5, 15, 35, 45, 65, 75, 95]).map(c => [c.nit, c])
      )

      const start = performance.now()
      const { result } = renderHook(() => useThresholdPreview(clients))

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 10000 })
      const duration = performance.now() - start

      expect(result.current.totalClients).toBe(16000)
      expect(NotificationThresholdService.fetchThresholds).toHaveBeenCalledTimes(1)
      expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty client map', async () => {
      const clients = new Map()

      const { result } = renderHook(() => useThresholdPreview(clients))

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.previewData).toHaveLength(0)
      expect(result.current.totalClients).toBe(0)
      expect(result.current.unassignedCount).toBe(0)
      expect(result.current.hasAllThresholds).toBe(true)
    })

    it('should filter out clients with status !== found', async () => {
      const clients = new Map([
        ['1', { nit: '1', invoices: [], customer: { id: 'c1' }, status: 'found' as const, total: { total_amount_due: 1000, total_days_overdue: 15, total_invoices: 1 } }],
        ['2', { nit: '2', invoices: [], customer: undefined, status: 'not_found' as const, total: { total_amount_due: 0, total_days_overdue: 0, total_invoices: 0 } }],
        ['3', { nit: '3', invoices: [], customer: { id: 'c3' }, status: 'pending' as const, total: { total_amount_due: 2000, total_days_overdue: 45, total_invoices: 1 } }],
      ])

      const { result } = renderHook(() => useThresholdPreview(clients))

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Should only count 'found' clients
      expect(result.current.totalClients).toBe(1)
      expect(result.current.previewData[0].count).toBe(1)
    })

    it('should handle refresh correctly', async () => {
      const clients = new Map([
        ['1', { nit: '1', invoices: [], customer: { id: 'c1' }, status: 'found' as const, total: { total_amount_due: 1000, total_days_overdue: 15, total_invoices: 1 } }],
      ])

      const { result } = renderHook(() => useThresholdPreview(clients))

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Should have made one call
      expect(NotificationThresholdService.fetchThresholds).toHaveBeenCalledTimes(1)

      // Refresh
      result.current.refreshPreview()

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Should make another call after refresh
      expect(NotificationThresholdService.fetchThresholds).toHaveBeenCalledTimes(2)
    })
  })

  describe('Step 2 and Step 3 Wizard Integration', () => {
    it('should provide same results for Step 2 and Step 3 with same clients', async () => {
      // Simulates the scenario where Step 2 shows preview
      // and Step 3 uses the same hook
      const clients = new Map([
        ['1', { nit: '1', invoices: [], customer: { id: 'c1' }, status: 'found' as const, total: { total_amount_due: 1000, total_days_overdue: 15, total_invoices: 1 } }],
        ['2', { nit: '2', invoices: [], customer: { id: 'c2' }, status: 'found' as const, total: { total_amount_due: 2000, total_days_overdue: 45, total_invoices: 1 } }],
      ])

      // Step 2 renders
      const { result: step2Result } = renderHook(() => useThresholdPreview(clients))
      await waitFor(() => expect(step2Result.current.isLoading).toBe(false))

      // Step 3 renders (simulated by calling hook again with same clients)
      const { result: step3Result } = renderHook(() => useThresholdPreview(clients))
      await waitFor(() => expect(step3Result.current.isLoading).toBe(false))

      // Results should be identical
      expect(step2Result.current.previewData).toEqual(step3Result.current.previewData)
      expect(step2Result.current.unassignedCount).toBe(step3Result.current.unassignedCount)
      expect(step2Result.current.hasAllThresholds).toBe(step3Result.current.hasAllThresholds)
    })

    it('should show loading state during threshold calculation', async () => {
      // Delay the mock response
      vi.mocked(NotificationThresholdService.fetchThresholds).mockImplementation(
        () => new Promise((resolve) => {
          setTimeout(() => resolve({ data: mockThresholds, total: mockThresholds.length }), 100)
        })
      )

      const clients = new Map([
        ['1', { nit: '1', invoices: [], customer: { id: 'c1' }, status: 'found' as const, total: { total_amount_due: 1000, total_days_overdue: 15, total_invoices: 1 } }],
      ])

      const { result } = renderHook(() => useThresholdPreview(clients))

      // Should start with loading true
      expect(result.current.isLoading).toBe(true)

      // Wait for completion
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.isLoading).toBe(false)
    })
  })
})
