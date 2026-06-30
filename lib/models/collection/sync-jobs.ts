export type SyncOperation = 'full_sync' | 'sync_invoices' | 'sync_clients'

export type SyncStatus = 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'Pending' | 'Recurring' | 'Success' | 'Completed' | 'Failed'

// Datos internos del job de sincronización de colecciones
export interface CollectionSyncData {
  business_id: string
  business_account_id: string
  operation: SyncOperation
  batch_size: number
  limit?: number | null
  sync_id: string // UUID v4 generado por el cliente o servidor para trazabilidad e2e
}

// Representa el enum ApexJob del backend
export interface ApexJobPayload {
  CollectionSync: CollectionSyncData
}

// Payload para encolado inmediato rápido (Endpoint específico)
export interface CollectionSyncPayload {
  name: string
  category: string
  operation: SyncOperation
  batch_size?: number // Por defecto: 100
  limit?: number
}

// Parámetros de planificación temporal
export interface ScheduleParams {
  datetime?: string  // Formato local "YYYY-MM-DDTHH:mm:ss" para programada
  timezone?: string  // Zona horaria. Por defecto: "UTC"
  cron?: string      // Expresión cron para recurrencia
}

// Payload para encolado general (Endpoint genérico de jobs con programación/cron)
export interface EnqueueJobRequest extends ScheduleParams {
  job: ApexJobPayload
  priority?: 'high' | 'low'
  metadata?: Record<string, any>
  business_id: string
  module: 'collection'
  name: string
  category: string
}

export interface SyncEnqueueResponse {
  job_id: string
  sync_id?: string
  status: 'Pending' | 'Recurring'
}

export interface SyncProgressResponse {
  job_id: string
  sync_id: string
  business_id: string
  entity_type: 'client' | 'invoice' | 'full' | 'unknown'
  entity_id: string
  processed: number
  total: number
  progress_pct: number
  status: SyncStatus
  error_message?: string
  created_at?: string
  updated_at?: string
}

export interface JobRecord {
  id: string
  parent_id: string | null
  status: SyncStatus
  job_type: string
  kind: string
  payload: string | any
  metadata: string | Record<string, any>
  result: string | any
  error: string | null
  scheduled_at: string | null
  timezone: string | null
  cron: string | null
  created_at: string
  updated_at: string
  module: string
  business_id: string
  name: string
  category: string
}

import { z } from 'zod'

export const syncJobFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  category: z.string().min(1, 'La categoría es requerida'),
  operation: z.enum(['full_sync', 'sync_invoices', 'sync_clients']),
  executionType: z.enum(['immediate', 'scheduled', 'cron']),
  datetime: z.string().optional(),
  cron: z.string().optional(),
  batch_size: z.coerce.number().min(1),
  connector_id: z.string().min(1, 'El conector es requerido'),
}).refine((data) => {
  if (data.executionType === 'scheduled' && !data.datetime) {
    return false
  }
  return true
}, {
  message: 'La fecha y hora son requeridas para ejecución programada',
  path: ['datetime'],
}).refine((data) => {
  if (data.executionType === 'cron' && !data.cron) {
    return false
  }
  return true
}, {
  message: 'La expresión cron es requerida para ejecución recurrente',
  path: ['cron'],
})

export type SyncJobFormValues = z.infer<typeof syncJobFormSchema>
