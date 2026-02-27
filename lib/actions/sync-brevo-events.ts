'use server'

/**
 * Script para sincronizar eventos de Brevo desde CSV con la ejecución
 * Ejecución ID: 3c5319ce-bc80-459e-bf48-c54ff0dee8f9
 * 
 * Este script lee el CSV de logs de Brevo y:
 * 1. Busca cada cliente por message_id
 * 2. Actualiza el estado del cliente según el evento
 * 3. Inserta eventos en collection_events
 * 4. Actualiza contadores de la ejecución
 */

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
import * as path from 'path'

interface BrevoLogEntry {
  st_text: string
  ts: string
  sub: string
  frm: string
  email: string
  tag: string
  mid: string
  link: string
}

interface SyncResult {
  success: boolean
  totalProcessed: number
  eventsInserted: number
  clientsUpdated: number
  errors: string[]
  stats: {
    sent: number
    delivered: number
    opened: number
    clicked: number
    bounced: number
    blocked: number
    deferred: number
    other: number
  }
}

const EXECUTION_ID = '3c5319ce-bc80-459e-bf48-c54ff0dee8f9'
const CSV_PATH = '/home/bryan/Desktop/logs-10600062-1772217756335.csv'

// Mapeo de eventos de Brevo a estados internos
const EVENT_TYPE_MAP: Record<string, string> = {
  'Sent': 'email_sent',
  'Delivered': 'email_delivered',
  'First opening': 'email_opened',
  'Opened': 'email_opened',
  'Clicked': 'email_clicked',
  'Hard bounce': 'email_bounced',
  'Soft bounce': 'email_bounced',
  'Blocked': 'email_blocked',
  'Deferred': 'email_deferred',
  'Loaded by proxy': 'email_opened'
}

// Mapeo de eventos a campos de fecha en collection_clients
const STATUS_DATE_FIELDS: Record<string, string> = {
  'email_sent': 'email_sent_at',
  'email_delivered': 'email_delivered_at',
  'email_opened': 'email_opened_at',
  'email_clicked': 'email_clicked_at'
}

export async function syncBrevoEventsFromCSV(): Promise<SyncResult> {
  const supabase = await getSupabaseAdminClient()
  const result: SyncResult = {
    success: false,
    totalProcessed: 0,
    eventsInserted: 0,
    clientsUpdated: 0,
    errors: [],
    stats: {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      blocked: 0,
      deferred: 0,
      other: 0
    }
  }

  try {
    // Leer archivo CSV
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8')
    const records: BrevoLogEntry[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ','
    })

    console.log(`[SYNC] Processing ${records.length} events from CSV`)

    // Obtener todos los clientes de la ejecución
    const { data: clients, error: clientsError } = await supabase
      .from('collection_clients')
      .select('id, custom_data, status')
      .eq('execution_id', EXECUTION_ID)

    if (clientsError) {
      throw new Error(`Error fetching clients: ${clientsError.message}`)
    }

    // Crear mapa de message_id -> cliente
    const messageIdToClient = new Map<string, typeof clients[0]>()
    for (const client of clients || []) {
      const messageId = client.custom_data?.message_id
      if (messageId) {
        // Intentar con y sin brackets
        messageIdToClient.set(messageId, client)
        if (messageId.startsWith('<') && messageId.endsWith('>')) {
          messageIdToClient.set(messageId.substring(1, messageId.length - 1), client)
        } else {
          messageIdToClient.set(`<${messageId}>`, client)
        }
      }
    }

    console.log(`[SYNC] Found ${messageIdToClient.size / 2} unique clients with message_id`)

    // Procesar cada registro
    for (const record of records) {
      result.totalProcessed++
      
      const eventType = EVENT_TYPE_MAP[record.st_text] || 'email_other'
      const messageId = record.mid
      const email = record.email
      
      // Buscar cliente
      let client = messageIdToClient.get(messageId)
      
      if (!client) {
        // Intentar buscar por email si no se encuentra por message_id
        const clientByEmail = clients?.find(c => 
          c.custom_data?.emails?.includes(email) || 
          c.custom_data?.email === email
        )
        
        if (clientByEmail) {
          client = clientByEmail
        } else {
          result.errors.push(`Client not found for message_id: ${messageId}, email: ${email}`)
          continue
        }
      }

      // Parsear fecha
      const timestamp = parseBrevoDate(record.ts)
      
      // Insertar evento
      const { error: eventError } = await supabase
        .from('collection_events')
        .insert({
          client_id: client.id,
          execution_id: EXECUTION_ID,
          event_type: eventType,
          event_data: {
            message_id: messageId,
            email: email,
            subject: record.sub,
            timestamp: timestamp,
            provider: 'brevo',
            originalEvent: record.st_text,
            link: record.link !== 'NA' ? record.link : undefined
          },
          timestamp: timestamp
        })

      if (eventError) {
        // Si es error de duplicado, ignorar
        if (eventError.message?.includes('duplicate')) {
          console.log(`[SYNC] Duplicate event skipped for client ${client.id}`)
        } else {
          result.errors.push(`Error inserting event for client ${client.id}: ${eventError.message}`)
        }
      } else {
        result.eventsInserted++
      }

      // Actualizar estado del cliente
      const dateField = STATUS_DATE_FIELDS[eventType]
      if (dateField) {
        const updateData: any = {
          status: eventType.replace('email_', '')
        }
        updateData[dateField] = timestamp

        // Para eventos de apertura, actualizar custom_data también
        if (eventType === 'email_opened') {
          updateData.custom_data = {
            ...client.custom_data,
            opened_at: timestamp,
            message_id: client.custom_data?.message_id || messageId
          }
        }

        const { error: updateError } = await supabase
          .from('collection_clients')
          .update(updateData)
          .eq('id', client.id)

        if (!updateError) {
          result.clientsUpdated++
        }
      }

      // Actualizar estadísticas
      switch (record.st_text) {
        case 'Sent':
          result.stats.sent++
          break
        case 'Delivered':
          result.stats.delivered++
          break
        case 'First opening':
        case 'Opened':
        case 'Loaded by proxy':
          result.stats.opened++
          break
        case 'Clicked':
          result.stats.clicked++
          break
        case 'Hard bounce':
        case 'Soft bounce':
          result.stats.bounced++
          break
        case 'Blocked':
          result.stats.blocked++
          break
        case 'Deferred':
          result.stats.deferred++
          break
        default:
          result.stats.other++
      }

      // Log de progreso cada 1000 registros
      if (result.totalProcessed % 1000 === 0) {
        console.log(`[SYNC] Progress: ${result.totalProcessed}/${records.length} processed`)
      }
    }

    // Actualizar contadores de la ejecución
    await updateExecutionCounters(supabase, result.stats)

    result.success = true
    console.log(`[SYNC] Completed: ${result.eventsInserted} events inserted, ${result.clientsUpdated} clients updated`)

  } catch (error) {
    console.error('[SYNC] Error:', error)
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}

function parseBrevoDate(dateStr: string): string {
  // Formato: 27-02-2026 13:36:31
  const [datePart, timePart] = dateStr.split(' ')
  const [day, month, year] = datePart.split('-')
  return `${year}-${month}-${day}T${timePart}.000Z`
}

async function updateExecutionCounters(supabase: any, stats: SyncResult['stats']) {
  try {
    const { error } = await supabase
      .from('collection_executions')
      .update({
        emails_sent: stats.sent,
        emails_delivered: stats.delivered,
        emails_opened: stats.opened,
        emails_clicked: stats.clicked,
        emails_bounced: stats.bounced,
        updated_at: new Date().toISOString()
      })
      .eq('id', EXECUTION_ID)

    if (error) {
      console.error('[SYNC] Error updating execution counters:', error)
    } else {
      console.log('[SYNC] Execution counters updated')
    }
  } catch (error) {
    console.error('[SYNC] Error updating counters:', error)
  }
}

// Función para obtener estadísticas actuales
export async function getSyncStats(): Promise<{
  executionId: string
  totalClients: number
  eventsInDB: number
  csvEvents: number
}> {
  const supabase = await getSupabaseAdminClient()
  
  // Contar clientes
  const { count: totalClients } = await supabase
    .from('collection_clients')
    .select('*', { count: 'exact', head: true })
    .eq('execution_id', EXECUTION_ID)

  // Contar eventos existentes
  const { count: eventsInDB } = await supabase
    .from('collection_events')
    .select('*', { count: 'exact', head: true })
    .eq('execution_id', EXECUTION_ID)

  // Contar eventos en CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8')
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  })

  return {
    executionId: EXECUTION_ID,
    totalClients: totalClients || 0,
    eventsInDB: eventsInDB || 0,
    csvEvents: records.length
  }
}
