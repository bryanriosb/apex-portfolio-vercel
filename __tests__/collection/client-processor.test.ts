/**
 * Tests for ClientProcessor - Batch Processing
 * Validates batch threshold lookup and in-memory matching
 */

import { describe, it, expect, beforeEach, jest } from 'vitest'

// Mock the service module
jest.mock('@/lib/services/collection/notification-threshold-service', () => ({
  NotificationThresholdService: {
    fetchThresholds: jest.fn(),
  },
}))

jest.mock('@/lib/services/collection/attachment-rules-service', () => ({
  AttachmentRulesService: {
    resolveAttachmentsBulk: jest.fn(),
  },
}))

import { ClientProcessor } from '@/lib/services/collection/client-processor'
import { NotificationThresholdService } from '@/lib/services/collection/notification-threshold-service'
import { AttachmentRulesService } from '@/lib/services/collection/attachment-rules-service'
import type { NotificationThreshold } from '@/lib/models/collection/notification-threshold'

describe('ClientProcessor - Batch Processing', () => {
  const businessId = 'test-business-uuid'
  const executionId = 'test-execution-uuid'

  const mockThresholds: NotificationThreshold[] = [
    { 
      id: 'threshold-1', 
      name: '0-30 días', 
      days_from: 0, 
      days_to: 30, 
      email_template_id: 'template-1',
      business_id: businessId,
      is_active: true,
      display_order: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    { 
      id: 'threshold-2', 
      name: '31-60 días', 
      days_from: 31, 
      days_to: 60, 
      email_template_id: 'template-2',
      business_id: businessId,
      is_active: true,
      display_order: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    { 
      id: 'threshold-3', 
      name: '60+ días', 
      days_from: 61, 
      days_to: null, 
      email_template_id: 'template-3',
      business_id: businessId,
      is_active: true,
      display_order: 2,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(NotificationThresholdService.fetchThresholds as jest.Mock).mockResolvedValue({
      data: mockThresholds,
      total: mockThresholds.length,
    })

    ;(AttachmentRulesService.resolveAttachmentsBulk as jest.Mock).mockResolvedValue(new Map())
  })

  describe('Single DB Call Validation', () => {
    it('should make only ONE call to fetchThresholds for 1000 clients', async () => {
      const clients = Array.from({ length: 1000 }, (_, i) => ({
        nit: `900${i.toString().padStart(6, '0')}`,
        customer: { id: `cust-${i}` },
        invoices: [{ amount_due: 1000 }],
        total: { total_days_overdue: 15, total_amount_due: 1000, total_invoices: 1 },
      }))

      await ClientProcessor.processClientsWithThresholds({
        clients,
        business_id: businessId,
        execution_id: executionId,
      })

      expect(NotificationThresholdService.fetchThresholds).toHaveBeenCalledTimes(1)
      expect(NotificationThresholdService.fetchThresholds).toHaveBeenCalledWith(businessId)
    })

    it('should make only ONE call to fetchThresholds for 16000 clients', async () => {
      const clients = Array.from({ length: 16000 }, (_, i) => ({
        nit: `900${i.toString().padStart(6, '0')}`,
        customer: { id: `cust-${i}` },
        invoices: [{ amount_due: 1000 }],
        total: { total_days_overdue: 15, total_amount_due: 1000, total_invoices: 1 },
      }))

      await ClientProcessor.processClientsWithThresholds({
        clients,
        business_id: businessId,
        execution_id: executionId,
      })

      expect(NotificationThresholdService.fetchThresholds).toHaveBeenCalledTimes(1)
    })
  })

  describe('Threshold Assignment', () => {
    it('should correctly assign thresholds based on days overdue ranges', async () => {
      const clients = [
        {
          nit: '1',
          customer: { id: 'cust-1' },
          invoices: [],
          total: { total_days_overdue: 15, total_amount_due: 1000, total_invoices: 1 },
        },
        {
          nit: '2',
          customer: { id: 'cust-2' },
          invoices: [],
          total: { total_days_overdue: 45, total_amount_due: 2000, total_invoices: 1 },
        },
        {
          nit: '3',
          customer: { id: 'cust-3' },
          invoices: [],
          total: { total_days_overdue: 90, total_amount_due: 3000, total_invoices: 1 },
        },
      ]

      const result = await ClientProcessor.processClientsWithThresholds({
        clients,
        business_id: businessId,
        execution_id: executionId,
      })

      expect(result).toHaveLength(3)
      expect(result[0].threshold_id).toBe('threshold-1')
      expect(result[0].email_template_id).toBe('template-1')
      expect(result[1].threshold_id).toBe('threshold-2')
      expect(result[1].email_template_id).toBe('template-2')
      expect(result[2].threshold_id).toBe('threshold-3')
      expect(result[2].email_template_id).toBe('template-3')
    })

    it('should handle clients with no matching threshold', async () => {
      const clients = [
        {
          nit: '1',
          customer: { id: 'cust-1' },
          invoices: [],
          total: { total_days_overdue: -5, total_amount_due: 1000, total_invoices: 1 },
        },
      ]

      const result = await ClientProcessor.processClientsWithThresholds({
        clients,
        business_id: businessId,
        execution_id: executionId,
      })

      expect(result[0].threshold_id).toBeUndefined()
      expect(result[0].email_template_id).toBeUndefined()
    })
  })

  describe('Performance', () => {
    it('should process 16000 clients efficiently', async () => {
      const clients = Array.from({ length: 16000 }, (_, i) => ({
        nit: `900${i.toString().padStart(6, '0')}`,
        customer: { id: `cust-${i}` },
        invoices: [{ amount: 1000 + i }],
        total: { 
          total_days_overdue: Math.floor(Math.random() * 100), 
          total_amount_due: 1000 + i, 
          total_invoices: 1 
        },
      }))

      const start = performance.now()
      const result = await ClientProcessor.processClientsWithThresholds({
        clients,
        business_id: businessId,
        execution_id: executionId,
      })
      const duration = performance.now() - start

      expect(result).toHaveLength(16000)
      expect(NotificationThresholdService.fetchThresholds).toHaveBeenCalledTimes(1)
      expect(AttachmentRulesService.resolveAttachmentsBulk).toHaveBeenCalledTimes(1)
      expect(duration).toBeLessThan(5000) // Under 5 seconds
    })
  })
})
