/**
 * Integration Test: Wizard Step 2 and Step 3 Threshold Processing
 * 
 * This test validates the complete flow for handling large batches of invoices
 * in Step 2 (threshold preview) and Step 3 (final configuration)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ClientProcessor } from '@/lib/services/collection/client-processor'
import { NotificationThresholdService } from '@/lib/services/collection/notification-threshold-service'
import { AttachmentRulesService } from '@/lib/services/collection/attachment-rules-service'
import type { NotificationThreshold } from '@/lib/models/collection/notification-threshold'
import type { ResolvedAttachment } from '@/lib/models/collection/attachment-rule'

// Mock dependencies
vi.mock('@/lib/services/collection/notification-threshold-service')
vi.mock('@/lib/services/collection/attachment-rules-service')

describe('Wizard Step 2 & 3 - Threshold Processing Integration', () => {
  const businessId = 'test-business-id'
  const executionId = 'test-execution-id'

  const mockThresholds: NotificationThreshold[] = [
    {
      id: 'threshold-early',
      name: '0-30 días - Recordatorio',
      days_from: 0,
      days_to: 30,
      email_template_id: 'template-early',
      business_id: businessId,
      is_active: true,
      display_order: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      email_template: { id: 'template-early', name: 'Recordatorio Temprano' },
    },
    {
      id: 'threshold-medium',
      name: '31-60 días - Aviso',
      days_from: 31,
      days_to: 60,
      email_template_id: 'template-medium',
      business_id: businessId,
      is_active: true,
      display_order: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      email_template: { id: 'template-medium', name: 'Aviso de Vencimiento' },
    },
    {
      id: 'threshold-late',
      name: '60+ días - Cobro',
      days_from: 61,
      days_to: null,
      email_template_id: 'template-late',
      business_id: businessId,
      is_active: true,
      display_order: 2,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      email_template: { id: 'template-late', name: 'Cobro Formal' },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(NotificationThresholdService.fetchThresholds).mockResolvedValue({
      data: mockThresholds,
      total: mockThresholds.length,
    })

    vi.mocked(AttachmentRulesService.resolveAttachmentsBulk).mockResolvedValue(new Map())
  })

  /**
   * SCENARIO 1: Step 2 - Review Threshold Distribution
   * User uploads 1000 invoices and sees threshold distribution in Step 2
   */
  describe('Step 2: Review Threshold Distribution', () => {
    it('should process 1000 invoices with SINGLE database call for thresholds', async () => {
      // Simulate 1000 clients with various days overdue
      const clients = Array.from({ length: 1000 }, (_, i) => {
        const daysOverdue = [10, 25, 40, 55, 70, 90][i % 6] // Distribute across thresholds
        return {
          nit: `900${i.toString().padStart(6, '0')}`,
          customer: {
            id: `customer-${i}`,
            full_name: `Customer ${i}`,
            company_name: `Company ${i}`,
            emails: [`customer${i}@test.com`],
            business_id: businessId,
            nit: `900${i.toString().padStart(6, '0')}`,
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          invoices: [
            {
              amount_due: (1000 + i).toString(),
              invoice_number: `INV-${i}`,
              invoice_date: '2024-01-01',
              due_date: '2024-02-01',
              days_overdue: daysOverdue.toString(),
            }
          ],
          total: {
            total_amount_due: 1000 + i,
            total_days_overdue: daysOverdue,
            total_invoices: 1,
          },
        }
      })

      // Process clients (this happens in Step 3, but threshold assignment logic is same as Step 2)
      const result = await ClientProcessor.processClientsWithThresholds({
        clients,
        business_id: businessId,
        execution_id: executionId,
      })

      // Verify: Only ONE database call for thresholds
      expect(NotificationThresholdService.fetchThresholds).toHaveBeenCalledTimes(1)
      expect(NotificationThresholdService.fetchThresholds).toHaveBeenCalledWith(businessId)

      // Verify: All clients processed
      expect(result).toHaveLength(1000)

      // Verify: Correct threshold distribution
      const earlyCount = result.filter(r => r.threshold_id === 'threshold-early').length
      const mediumCount = result.filter(r => r.threshold_id === 'threshold-medium').length
      const lateCount = result.filter(r => r.threshold_id === 'threshold-late').length

      expect(earlyCount).toBe(334) // 10, 25 days
      expect(mediumCount).toBe(333) // 40, 55 days
      expect(lateCount).toBe(333) // 70, 90 days
    })

    it('should correctly categorize clients by days overdue ranges', async () => {
      const clients = [
        // Early range (0-30 days)
        { 
          nit: '1', 
          customer: { 
            id: 'c1', 
            full_name: 'A', 
            company_name: 'A Corp',
            emails: ['a@test.com'],
            business_id: businessId,
            nit: '1',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }, 
          invoices: [], 
          total: { total_days_overdue: 0, total_amount_due: 1000, total_invoices: 1 } 
        },
        { 
          nit: '2', 
          customer: { 
            id: 'c2', 
            full_name: 'B', 
            company_name: 'B Corp',
            emails: ['b@test.com'],
            business_id: businessId,
            nit: '2',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }, 
          invoices: [], 
          total: { total_days_overdue: 15, total_amount_due: 2000, total_invoices: 1 } 
        },
        { 
          nit: '3', 
          customer: { 
            id: 'c3', 
            full_name: 'C', 
            company_name: 'C Corp',
            emails: ['c@test.com'],
            business_id: businessId,
            nit: '3',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }, 
          invoices: [], 
          total: { total_days_overdue: 30, total_amount_due: 3000, total_invoices: 1 } 
        },
        // Medium range (31-60 days)
        { 
          nit: '4', 
          customer: { 
            id: 'c4', 
            full_name: 'D', 
            company_name: 'D Corp',
            emails: ['d@test.com'],
            business_id: businessId,
            nit: '4',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }, 
          invoices: [], 
          total: { total_days_overdue: 31, total_amount_due: 4000, total_invoices: 1 } 
        },
        { 
          nit: '5', 
          customer: { 
            id: 'c5', 
            full_name: 'E', 
            company_name: 'E Corp',
            emails: ['e@test.com'],
            business_id: businessId,
            nit: '5',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }, 
          invoices: [], 
          total: { total_days_overdue: 45, total_amount_due: 5000, total_invoices: 1 } 
        },
        { 
          nit: '6', 
          customer: { 
            id: 'c6', 
            full_name: 'F', 
            company_name: 'F Corp',
            emails: ['f@test.com'],
            business_id: businessId,
            nit: '6',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }, 
          invoices: [], 
          total: { total_days_overdue: 60, total_amount_due: 6000, total_invoices: 1 } 
        },
        // Late range (60+ days)
        { 
          nit: '7', 
          customer: { 
            id: 'c7', 
            full_name: 'G', 
            company_name: 'G Corp',
            emails: ['g@test.com'],
            business_id: businessId,
            nit: '7',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }, 
          invoices: [], 
          total: { total_days_overdue: 61, total_amount_due: 7000, total_invoices: 1 } 
        },
        { 
          nit: '8', 
          customer: { 
            id: 'c8', 
            full_name: 'H', 
            company_name: 'H Corp',
            emails: ['h@test.com'],
            business_id: businessId,
            nit: '8',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }, 
          invoices: [], 
          total: { total_days_overdue: 90, total_amount_due: 8000, total_invoices: 1 } 
        },
        { 
          nit: '9', 
          customer: { 
            id: 'c9', 
            full_name: 'I', 
            company_name: 'I Corp',
            emails: ['i@test.com'],
            business_id: businessId,
            nit: '9',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }, 
          invoices: [], 
          total: { total_days_overdue: 365, total_amount_due: 9000, total_invoices: 1 } 
        },
      ]

      const result = await ClientProcessor.processClientsWithThresholds({
        clients,
        business_id: businessId,
        execution_id: executionId,
      })

      // Verify correct template assignment
      expect(result[0].email_template_id).toBe('template-early')
      expect(result[1].email_template_id).toBe('template-early')
      expect(result[2].email_template_id).toBe('template-early')
      expect(result[3].email_template_id).toBe('template-medium')
      expect(result[4].email_template_id).toBe('template-medium')
      expect(result[5].email_template_id).toBe('template-medium')
      expect(result[6].email_template_id).toBe('template-late')
      expect(result[7].email_template_id).toBe('template-late')
      expect(result[8].email_template_id).toBe('template-late')

      // Verify threshold names in custom_data
      expect(result[0].custom_data?.threshold_name).toBe('0-30 días - Recordatorio')
      expect(result[4].custom_data?.threshold_name).toBe('31-60 días - Aviso')
      expect(result[8].custom_data?.threshold_name).toBe('60+ días - Cobro')
    })
  })

  /**
   * SCENARIO 2: Step 3 - Handle 16,000 Invoices (Critical Volume)
   * This is the main stress test - the volume that was causing crashes
   */
  describe('Step 3: Handle 16,000 Invoices (Critical Test)', () => {
    it('should process 16000 invoices without timeout (previously would crash)', async () => {
      // Generate 16,000 clients - the critical volume
      const clients = Array.from({ length: 16000 }, (_, i) => {
        const daysOverdue = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95][i % 10]
        return {
          nit: `900${i.toString().padStart(6, '0')}`,
          customer: {
            id: `customer-${i}`,
            full_name: `Customer ${i}`,
            company_name: `Company ${i}`,
            emails: [`customer${i}@test.com`],
            business_id: businessId,
            nit: `900${i.toString().padStart(6, '0')}`,
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          invoices: Array.from({ length: (i % 3) + 1 }, (_, j) => ({
            amount_due: (1000 + i + j).toString(),
            invoice_number: `INV-${i}-${j}`,
            invoice_date: '2024-01-01',
            due_date: '2024-02-01',
            days_overdue: daysOverdue.toString(),
          })),
          total: {
            total_amount_due: 1000 + i,
            total_days_overdue: daysOverdue,
            total_invoices: (i % 3) + 1,
          },
        }
      })

      const startTime = performance.now()

      // This would previously crash with 48,000+ DB calls
      // Now should complete with only 2 DB calls (thresholds + attachments)
      const result = await ClientProcessor.processClientsWithThresholds({
        clients,
        business_id: businessId,
        execution_id: executionId,
      })

      const duration = performance.now() - startTime

      // Performance assertions
      expect(duration).toBeLessThan(10000) // Should complete in under 10 seconds
      expect(NotificationThresholdService.fetchThresholds).toHaveBeenCalledTimes(1)
      expect(AttachmentRulesService.resolveAttachmentsBulk).toHaveBeenCalledTimes(1)

      // Data integrity assertions
      expect(result).toHaveLength(16000)
      expect(result.every(r => r.execution_id === executionId)).toBe(true)
      expect(result.every(r => r.status === 'pending')).toBe(true)

      // Verify threshold distribution
      const thresholds = ['threshold-early', 'threshold-medium', 'threshold-late']
      thresholds.forEach(thresholdId => {
        const count = result.filter(r => r.threshold_id === thresholdId).length
        expect(count).toBeGreaterThan(0) // Each threshold should have clients
      })

      console.log(`✅ Processed 16,000 clients in ${duration.toFixed(2)}ms`)
      console.log(`   - Threshold DB calls: 1 (was 16,000)`)
      console.log(`   - Attachment DB calls: 1 (was 16,000)`)
      console.log(`   - Total DB calls: 2 (was 48,000+)`)
      console.log(`   - Performance improvement: ~99.99% reduction in DB calls`)
    })
  })

  /**
   * SCENARIO 3: Edge Cases and Error Handling
   */
  describe('Edge Cases: Step 2 & Step 3', () => {
    it('should handle clients without matching thresholds (gaps in configuration)', async () => {
      // Only configure thresholds for 0-30 and 60+ days, leave 31-60 gap
      vi.mocked(NotificationThresholdService.fetchThresholds).mockResolvedValue({
        data: [mockThresholds[0], mockThresholds[2]], // Only early and late
        total: 2,
      })

      const clients = [
        { 
          nit: '1', 
          customer: { 
            id: 'c1', 
            full_name: 'A', 
            company_name: 'A Corp',
            emails: ['a@test.com'],
            business_id: businessId,
            nit: '1',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }, 
          invoices: [], 
          total: { total_days_overdue: 15, total_amount_due: 1000, total_invoices: 1 } 
        }, // Matches early
        { 
          nit: '2', 
          customer: { 
            id: 'c2', 
            full_name: 'B', 
            company_name: 'B Corp',
            emails: ['b@test.com'],
            business_id: businessId,
            nit: '2',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }, 
          invoices: [], 
          total: { total_days_overdue: 45, total_amount_due: 2000, total_invoices: 1 } 
        }, // Gap - no match
        { 
          nit: '3', 
          customer: { 
            id: 'c3', 
            full_name: 'C', 
            company_name: 'C Corp',
            emails: ['c@test.com'],
            business_id: businessId,
            nit: '3',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }, 
          invoices: [], 
          total: { total_days_overdue: 75, total_amount_due: 3000, total_invoices: 1 } 
        }, // Matches late
      ]

      const result = await ClientProcessor.processClientsWithThresholds({
        clients,
        business_id: businessId,
        execution_id: executionId,
      })

      // First client should have early threshold
      expect(result[0].threshold_id).toBe('threshold-early')
      
      // Second client should have NO threshold (gap)
      expect(result[1].threshold_id).toBeUndefined()
      expect(result[1].email_template_id).toBeUndefined()
      
      // Third client should have late threshold
      expect(result[2].threshold_id).toBe('threshold-late')
    })

    it('should batch resolve attachments for all clients at once', async () => {
      const mockAttachmentsMap = new Map<string, ResolvedAttachment[]>([
        ['customer-1', [
          { 
            attachment_id: 'att-1', 
            attachment_name: 'Contrato', 
            storage_path: '/contracts/1.pdf',
            storage_bucket: 'docs',
            document_type: 'pdf',
            is_required: true,
            rule_type: 'global',
            display_order: 0,
          },
        ]],
        ['customer-2', [
          { 
            attachment_id: 'att-2', 
            attachment_name: 'Factura', 
            storage_path: '/invoices/2.pdf',
            storage_bucket: 'docs',
            document_type: 'pdf',
            is_required: false,
            rule_type: 'threshold',
            display_order: 1,
          },
        ]],
      ])

      vi.mocked(AttachmentRulesService.resolveAttachmentsBulk).mockResolvedValue(mockAttachmentsMap)

      const clients = [
        { 
          nit: '1', 
          customer: { 
            id: 'customer-1', 
            full_name: 'A', 
            company_name: 'A Corp',
            emails: ['a@test.com'],
            business_id: businessId,
            nit: '1',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }, 
          invoices: [], 
          total: { total_days_overdue: 15, total_amount_due: 1000, total_invoices: 1 } 
        },
        { 
          nit: '2', 
          customer: { 
            id: 'customer-2', 
            full_name: 'B', 
            company_name: 'B Corp',
            emails: ['b@test.com'],
            business_id: businessId,
            nit: '2',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }, 
          invoices: [], 
          total: { total_days_overdue: 45, total_amount_due: 2000, total_invoices: 1 } 
        },
      ]

      const result = await ClientProcessor.processClientsWithThresholds({
        clients,
        business_id: businessId,
        execution_id: executionId,
      })

      // Verify batch call was made
      expect(AttachmentRulesService.resolveAttachmentsBulk).toHaveBeenCalledTimes(1)
      expect(AttachmentRulesService.resolveAttachmentsBulk).toHaveBeenCalledWith(
        businessId,
        expect.arrayContaining([
          expect.objectContaining({ client_id: 'customer-1' }),
          expect.objectContaining({ client_id: 'customer-2' }),
        ])
      )

      // Verify attachments were assigned
      expect(result[0].attachments).toHaveLength(1)
      expect(result[0].attachments?.[0].attachment_name).toBe('Contrato')
      expect(result[1].attachments).toHaveLength(1)
      expect(result[1].attachments?.[0].attachment_name).toBe('Factura')
    })
  })

  /**
   * SCENARIO 4: Performance Benchmarks
   */
  describe('Performance Benchmarks', () => {
    it('should process different volumes within time limits', async () => {
      const volumes = [
        { count: 100, maxTime: 500 },    // 100 clients: < 500ms
        { count: 1000, maxTime: 2000 },  // 1k clients: < 2s
        { count: 5000, maxTime: 5000 },  // 5k clients: < 5s
        { count: 10000, maxTime: 8000 }, // 10k clients: < 8s
      ]

      for (const { count, maxTime } of volumes) {
        const clients = Array.from({ length: count }, (_, i) => ({
          nit: `900${i.toString().padStart(6, '0')}`,
          customer: {
            id: `customer-${i}`,
            full_name: `Customer ${i}`,
            company_name: `Company ${i}`,
            emails: [`customer${i}@test.com`],
            business_id: businessId,
            nit: `900${i.toString().padStart(6, '0')}`,
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          invoices: [],
          total: {
            total_amount_due: 1000 + i,
            total_days_overdue: Math.floor(Math.random() * 100),
            total_invoices: 1,
          },
        }))

        vi.clearAllMocks()
        vi.mocked(NotificationThresholdService.fetchThresholds).mockResolvedValue({
          data: mockThresholds,
          total: mockThresholds.length,
        })
        vi.mocked(AttachmentRulesService.resolveAttachmentsBulk).mockResolvedValue(new Map())

        const start = performance.now()
        const result = await ClientProcessor.processClientsWithThresholds({
          clients,
          business_id: businessId,
          execution_id: executionId,
        })
        const duration = performance.now() - start

        expect(result).toHaveLength(count)
        expect(duration).toBeLessThan(maxTime)
        expect(NotificationThresholdService.fetchThresholds).toHaveBeenCalledTimes(1)

        console.log(`✅ ${count.toLocaleString()} clients: ${duration.toFixed(2)}ms (limit: ${maxTime}ms)`)
      }
    })
  })
})
