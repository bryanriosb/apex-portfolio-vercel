import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { EmailBlacklistService } from '@/lib/services/collection/email-blacklist-service'
import type { EmailEvent } from '../parsers/ses-parser'

/**
 * Procesa eventos de email y actualiza la base de datos
 * Común para todos los proveedores de email
 */
export async function processEmailEvent(
    provider: string,
    event: EmailEvent
): Promise<void> {
    const supabase = await getSupabaseAdminClient()

    try {
        let clients = null;
        let searchError = null;

        let foundByMessageId = false;

        // Consolidar búsqueda por message_id (variaciones con/sin <>)
        const messageIdsToTry = [event.messageId];
        if (event.messageId.startsWith('<') && event.messageId.endsWith('>')) {
            messageIdsToTry.push(event.messageId.substring(1, event.messageId.length - 1));
        } else {
            messageIdsToTry.push(`<${event.messageId}>`);
        }

        for (const mid of messageIdsToTry) {
            const { data, error } = await supabase
                .from('collection_clients')
                .select('id, customer_id, status, custom_data, execution_id, email_sent_at')
                .eq("custom_data->>'message_id'", mid)
                .limit(1);

            if (data && data.length > 0) {
                clients = data;
                foundByMessageId = true;
                break;
            }
            if (error) searchError = error;
        }

        if (searchError) {
            console.error('[BREVO] Error searching for client by message_id:', searchError)
            throw searchError
        }

        // Email Fallback if message_id failed
        if (!clients || clients.length === 0) {
            console.log(`[BREVO] No client found for message_id: ${event.messageId}. Trying fallback by email: ${event.email}...`);

            // Search by email (array or string) in custom_data
            // CRITICAL: Search in ALL statuses, not just initial ones, because clients can receive
            // multiple events (e.g., multiple opens) after being processed
            const { data: emailClients, error: emailSearchError } = await supabase
                .from('collection_clients')
                .select('id, customer_id, status, custom_data, execution_id, email_sent_at')
                .or(`custom_data->emails.cs.["${event.email}"],custom_data->>'email'.eq.${event.email}`)
                .order('created_at', { ascending: false })
                .limit(1)

            if (emailSearchError) {
                console.error('[BREVO] Error in email fallback search:', emailSearchError)
            } else if (emailClients && emailClients.length > 0) {
                console.log(`[BREVO] Fallback found client ${emailClients[0].id} by email search.`);
                clients = emailClients;
            }
        }

        if (!clients || clients.length === 0) {
            console.warn(`[BREVO] No client found for id: ${event.messageId} or email: ${event.email}. Skipping to avoid constraint error.`)
            return;
        }

        const client = clients?.[0]

        // Check for existing event to avoid duplicates (Idempotency)
        // We check event_type, client_id and the provider's message_id in event_data
        // IMPORTANT: email_opened and email_clicked events can occur multiple times (user opens/clicks multiple times)
        // So we only deduplicate other event types
        const canHaveMultipleEvents = event.eventType === 'email_opened' || event.eventType === 'email_clicked'
        
        let isDuplicateEvent = false
        
        if (!canHaveMultipleEvents) {
            const { data: existingEvent, error: checkError } = await supabase
                .from('collection_events')
                .select('id')
                .eq('client_id', client.id)
                .eq('event_type', event.eventType)
                .eq("event_data->>'message_id'", event.messageId)
                .limit(1)

            if (checkError) {
                console.error('[WEBHOOK] Error checking for existing event:', checkError)
            }
            
            isDuplicateEvent = !!(existingEvent && existingEvent.length > 0)
        }
        
        if (isDuplicateEvent) {
            console.log(`[WEBHOOK] Duplicate event detected for client ${client.id}, type ${event.eventType}, msg ${event.messageId}. Will update client status if needed, but skip metrics.`)
        } else if (canHaveMultipleEvents) {
            console.log(`[WEBHOOK] Processing ${event.eventType} event for client ${client.id} (can have multiple events per message)`)    
        } else {
            // Registrar evento en collection_events
            console.log(`[WEBHOOK] Inserting event: type=${event.eventType}, timestamp=${event.timestamp}`)
            const { error: eventError } = await supabase.from('collection_events').insert({
                execution_id: client?.execution_id,
                client_id: client?.id,
                event_type: event.eventType,
                event_status: 'success',
                event_data: {
                    provider: provider,
                    message_id: event.messageId,
                    email: event.email,
                    timestamp: event.timestamp,
                    metadata: event.metadata,
                    recovered_by_email: !foundByMessageId
                },
                timestamp: event.timestamp,
            })

            if (eventError) {
                console.error('[DEBUG-v2] Error inserting event:', eventError)
                throw eventError
            }
        }

        // Actualizar status del cliente según el evento
        // IMPORTANT: Always update client status even for duplicate events to ensure state transitions
        if (client) {
            let newStatus = client.status
            let shouldUpdateMetrics = true

            switch (event.eventType) {
                case 'email_sent':
                    // Worker marca como 'accepted' cuando el proveedor acepta la petición
                    // El webhook confirma cuando realmente se envía
                    if (client.status === 'pending' || client.status === 'accepted') {
                        newStatus = 'sent'
                    }
                    break
                case 'email_delivered':
                    newStatus = 'delivered'
                    break
                case 'email_bounced':
                    newStatus = 'bounced'
                    break
                case 'email_complained':
                    newStatus = 'complained'
                    break
                case 'email_opened':
                    if (client.status === 'sent' || client.status === 'delivered' || client.status === 'pending' || client.status === 'accepted') {
                        newStatus = 'opened'
                    } else if (client.status === 'opened') {
                        shouldUpdateMetrics = false
                        console.log(`[DEBUG-v2] Client ${client.id} already opened, skipping duplicate metrics`)
                    }
                    break
                case 'email_clicked':
                    if (client.status === 'sent' || client.status === 'delivered' || client.status === 'pending' || client.status === 'accepted') {
                        newStatus = 'opened'
                    }
                    break
                case 'email_failed':
                    newStatus = 'failed'
                    break
            }

            if (newStatus !== client.status) {
                const updatedCustomData = {
                    ...client.custom_data,
                    [`${event.eventType}_at`]: event.timestamp,
                    // Si lo recuperamos, guardamos el message_id que ahora conocemos
                    message_id: client.custom_data?.message_id || event.messageId
                }

                const updatePayload: any = {
                    status: newStatus,
                    custom_data: updatedCustomData,
                }

                // Mapear eventos a columnas específicas para la UI
                if (event.eventType === 'email_delivered') {
                    updatePayload.email_delivered_at = event.timestamp
                } else if (event.eventType === 'email_opened' || event.eventType === 'email_clicked') {
                    updatePayload.email_opened_at = event.timestamp
                } else if (event.eventType === 'email_bounced') {
                    // Determinar tipo de rebote
                    const isHard = event.metadata?.originalEvent?.includes('hard') ||
                        event.metadata?.originalEvent === 'invalid_email' ||
                        event.metadata?.originalEvent === 'blocked'
                    updatePayload.email_bounce_type = isHard ? 'hard' : 'soft'
                    updatePayload.email_bounce_reason = event.metadata?.reason || 'Unknown bounce'
                } else if (event.eventType === 'email_failed') {
                    updatePayload.error_message = event.metadata?.reason || 'Delivery failed'
                }

                // Si email_sent_at es NULL, la base de datos lanza un error en el trigger
                // de métricas predictivas (EXTRACT(DOW FROM NULL) is NULL).
                // Lo inicializamos con el timestamp del evento si no existe.
                if (!client.email_sent_at) {
                    updatePayload.email_sent_at = event.timestamp
                }

                const { error: updateError } = await supabase
                    .from('collection_clients')
                    .update(updatePayload)
                    .eq('id', client.id)

                if (updateError) {
                    console.error('[DEBUG-v2] Error updating client status:', updateError)
                    throw updateError
                }

                console.log(
                    `[DEBUG-v2] Updated client ${client.id} status: ${client.status} -> ${newStatus}`
                )
            }

            // Handle blacklist for bounced/complained emails (even for duplicates)
            if (event.eventType === 'email_bounced' || event.eventType === 'email_complained') {
                await addToBlacklistFromEvent(supabase, client, event, provider)
            }
        }

        console.log(
            `[WEBHOOK] Processed ${provider} ${event.eventType} event for ${event.email}${isDuplicateEvent ? ' (duplicate - status updated, metrics skipped)' : ''}`
        )
    } catch (error) {
        console.error('[WEBHOOK] Error processing email event:', error)
        throw error
    }
}

/**
 * Agrega email a la blacklist cuando ocurre un bounce o complaint
 */
async function addToBlacklistFromEvent(
    supabase: any,
    client: any,
    event: EmailEvent,
    provider: string
): Promise<void> {
    try {
        // Obtener business_id de la ejecución
        const { data: execution, error: execError } = await supabase
            .from('collection_executions')
            .select('business_id')
            .eq('id', client.execution_id)
            .single()

        if (execError || !execution) {
            console.error('Error fetching execution for blacklist:', execError)
            return
        }

        const businessId = execution.business_id

        // Obtener customer_id del cliente
        const customerId = client.customer_id || null

        // Determinar tipo de bounce
        const bounceType = event.eventType === 'email_bounced'
            ? (event.metadata?.bounceType as 'hard' | 'soft' | 'complaint') || 'hard'
            : 'complaint'

        // Obtener razón del bounce
        const bounceReason = event.metadata?.bounceReason ||
            event.metadata?.reason ||
            (event.eventType === 'email_complained' ? 'User complaint' : 'Unknown bounce reason')

        // Agregar a blacklist usando el servicio
        const result = await EmailBlacklistService.addToBlacklist(
            businessId,
            event.email,
            bounceType,
            bounceReason,
            customerId,
            client.execution_id,
            client.id,
            provider
        )

        if (result.success) {
            console.log(`✅ Added ${event.email} to blacklist (${bounceType}): ${bounceReason}`)
        } else {
            console.error(`❌ Failed to add ${event.email} to blacklist:`, result.error)
        }
    } catch (error) {
        console.error('Error adding to blacklist from event:', error)
        // No lanzamos el error para no interrumpir el procesamiento del webhook
    }
}
