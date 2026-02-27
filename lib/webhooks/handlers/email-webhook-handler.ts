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
                .select('id, status, custom_data, execution_id, email_sent_at')
                .eq('custom_data->>message_id', mid)
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
            // We remove the strict 'pending' requirement as the worker might have already marked it as 'sent'
            const { data: emailClients, error: emailSearchError } = await supabase
                .from('collection_clients')
                .select('id, status, custom_data, execution_id, email_sent_at')
                .or(`custom_data->emails.cs.["${event.email}"],custom_data->>email.eq.${event.email}`)
                .in('status', ['pending', 'sent', 'queued'])
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

        // Registrar evento en collection_events
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

        // Actualizar status del cliente según el evento
        if (client) {
            let newStatus = client.status
            let shouldUpdateMetrics = true

            switch (event.eventType) {
                case 'delivered':
                    newStatus = 'delivered'
                    break
                case 'bounced':
                    newStatus = 'bounced'
                    break
                case 'complained':
                    newStatus = 'complained'
                    break
                case 'opened':
                    if (client.status === 'sent' || client.status === 'delivered' || client.status === 'pending') {
                        newStatus = 'opened'
                    } else if (client.status === 'opened') {
                        shouldUpdateMetrics = false
                        console.log(`[DEBUG-v2] Client ${client.id} already opened, skipping duplicate metrics`)
                    }
                    break
                case 'clicked':
                    if (client.status === 'sent' || client.status === 'delivered' || client.status === 'pending') {
                        newStatus = 'opened'
                    }
                    break
                case 'failed':
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

            if (shouldUpdateMetrics) {
                await updateReputationMetrics(supabase, client.execution_id, event.eventType)
            }

            if (event.eventType === 'bounced' || event.eventType === 'complained') {
                await addToBlacklistFromEvent(supabase, client, event, provider)
            }
        }

        console.log(
            `[DEBUG-v2] Processed ${provider} ${event.eventType} event for ${event.email}`
        )
    } catch (error) {
        console.error('[DEBUG-v2] Error processing email event:', error)
        throw error
    }
}

/**
 * Actualiza métricas de reputación en las 4 tablas:
 * 1. execution_batches (granular - por batch)
 * 2. collection_executions (agregado - por campaña)
 * 3. daily_sending_limits (por día)
 * 4. email_reputation_profiles (histórico total)
 */
async function updateReputationMetrics(
    supabase: any,
    executionId: string,
    eventType: string
): Promise<void> {
    try {
        // 1. Obtener información de la ejecución para encontrar el batch y reputation profile
        const { data: execution, error: execError } = await supabase
            .from('collection_executions')
            .select('id, business_id, emails_sent, emails_delivered, emails_opened, emails_bounced, delivery_rate, open_rate, bounce_rate')
            .eq('id', executionId)
            .single()

        if (execError || !execution) {
            console.error('Error fetching execution for metrics update:', execError)
            return
        }

        // Determinar qué campo incrementar
        let batchField: string | null = null
        let dailyField: string | null = null
        let profileField: string | null = null

        switch (eventType) {
            case 'delivered':
                batchField = 'emails_delivered'
                dailyField = 'emails_delivered'
                profileField = 'total_emails_delivered'
                break
            case 'opened':
                batchField = 'emails_opened'
                dailyField = 'emails_opened'
                profileField = 'total_emails_opened'
                break
            case 'bounced':
                batchField = 'emails_bounced'
                dailyField = 'emails_bounced'
                profileField = 'total_emails_bounced'
                break
            case 'complained':
                // Los complaints solo se trackean en el perfil
                profileField = 'total_complaints'
                break
            default:
                // Para otros eventos (clicked, failed), no actualizamos métricas de reputación
                return
        }

        // 2. Actualizar execution_batches (encontrar el batch del cliente actual)
        if (batchField) {
            // Aquí necesitaríamos el batch_id. Por ahora, actualizamos todos los batches de la ejecución
            // En una implementación más robusta, deberíamos almacenar batch_id en collection_clients
            const { data: batches } = await supabase
                .from('execution_batches')
                .select('id, ' + batchField)
                .eq('execution_id', executionId)
                .eq('status', 'processing')

            if (batches && batches.length > 0) {
                // Actualizar el primer batch en processing (asumiendo procesamiento secuencial)
                const batch = batches[0]
                await supabase
                    .from('execution_batches')
                    .update({ [batchField]: (batch[batchField] || 0) + 1 })
                    .eq('id', batch.id)
            }
        }

        // 3. Obtener el reputation profile asociado
        const { data: profiles } = await supabase
            .from('email_reputation_profiles')
            .select('id, total_emails_sent, total_emails_delivered, total_emails_opened, total_emails_bounced, total_complaints')
            .eq('business_id', execution.business_id)
            .limit(1)

        if (profiles && profiles.length > 0) {
            const profile = profiles[0]
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })

            // 4. Actualizar email_reputation_profiles
            if (profileField) {
                const newProfileValue = (profile[profileField] || 0) + 1
                await supabase
                    .from('email_reputation_profiles')
                    .update({ [profileField]: newProfileValue })
                    .eq('id', profile.id)

                // Recalcular tasas del perfil
                await recalculateProfileRates(supabase, profile.id)
            }

            // 5. Actualizar daily_sending_limits
            if (dailyField) {
                const { data: dailyLimit } = await supabase
                    .from('daily_sending_limits')
                    .select('id, ' + dailyField + ', emails_sent')
                    .eq('reputation_profile_id', profile.id)
                    .eq('date', today)
                    .single()

                if (dailyLimit) {
                    const newDailyValue = (dailyLimit[dailyField] || 0) + 1
                    await supabase
                        .from('daily_sending_limits')
                        .update({ [dailyField]: newDailyValue })
                        .eq('id', dailyLimit.id)

                    // Recalcular tasas del día
                    await recalculateDailyRates(supabase, dailyLimit.id)
                }
            }
        }

        console.log(`✅ Reputation metrics updated for ${eventType} event`)
    } catch (error) {
        console.error('Error updating reputation metrics:', error)
        // No lanzamos el error para no interrumpir el procesamiento del webhook
    }
}

/**
 * Recalcula las tasas de una ejecución (delivery_rate, open_rate, bounce_rate)
 */
async function recalculateExecutionRates(supabase: any, executionId: string): Promise<void> {
    const { data: exec } = await supabase
        .from('collection_executions')
        .select('emails_sent, emails_delivered, emails_opened, emails_bounced')
        .eq('id', executionId)
        .single()

    if (exec && exec.emails_sent > 0) {
        const deliveryRate = (exec.emails_delivered / exec.emails_sent) * 100
        const openRate = exec.emails_delivered > 0 ? (exec.emails_opened / exec.emails_delivered) * 100 : 0
        const bounceRate = (exec.emails_bounced / exec.emails_sent) * 100

        await supabase
            .from('collection_executions')
            .update({
                delivery_rate: Number(deliveryRate.toFixed(2)),
                open_rate: Number(openRate.toFixed(2)),
                bounce_rate: Number(bounceRate.toFixed(2)),
            })
            .eq('id', executionId)
    }
}

/**
 * Recalcula las tasas de un perfil de reputación
 */
async function recalculateProfileRates(supabase: any, profileId: string): Promise<void> {
    const { data: profile } = await supabase
        .from('email_reputation_profiles')
        .select('total_emails_sent, total_emails_delivered, total_emails_opened, total_emails_bounced, total_complaints')
        .eq('id', profileId)
        .single()

    if (profile) {
        // Use max(sent, delivered) as denominator to handle desync where delivered > sent
        const baseSent = Math.max(profile.total_emails_sent || 0, profile.total_emails_delivered || 0)
        if (baseSent === 0) return

        const deliveryRate = Math.min(100, ((profile.total_emails_delivered || 0) / baseSent) * 100)
        const openRate = profile.total_emails_delivered > 0
            ? Math.min(100, ((profile.total_emails_opened || 0) / profile.total_emails_delivered) * 100)
            : 0
        const bounceRate = Math.min(100, ((profile.total_emails_bounced || 0) / baseSent) * 100)
        const complaintRate = Math.min(100, ((profile.total_complaints || 0) / baseSent) * 100)

        // Sync total_emails_sent if it's behind delivered (data desync)
        const updatePayload: Record<string, number> = {
            delivery_rate: Number(deliveryRate.toFixed(2)),
            open_rate: Number(openRate.toFixed(2)),
            bounce_rate: Number(bounceRate.toFixed(2)),
            complaint_rate: Number(complaintRate.toFixed(2)),
        }
        if ((profile.total_emails_sent || 0) < (profile.total_emails_delivered || 0)) {
            updatePayload.total_emails_sent = profile.total_emails_delivered
        }

        await supabase
            .from('email_reputation_profiles')
            .update(updatePayload)
            .eq('id', profileId)
    }
}

/**
 * Recalcula las tasas de un día específico
 */
async function recalculateDailyRates(supabase: any, dailyLimitId: string): Promise<void> {
    const { data: daily } = await supabase
        .from('daily_sending_limits')
        .select('emails_sent, emails_delivered, emails_opened, emails_bounced')
        .eq('id', dailyLimitId)
        .single()

    if (daily && daily.emails_sent > 0) {
        const dayDeliveryRate = (daily.emails_delivered / daily.emails_sent) * 100
        const dayOpenRate = daily.emails_delivered > 0 ? (daily.emails_opened / daily.emails_delivered) * 100 : 0
        const dayBounceRate = (daily.emails_bounced / daily.emails_sent) * 100

        await supabase
            .from('daily_sending_limits')
            .update({
                day_delivery_rate: Number(dayDeliveryRate.toFixed(2)),
                day_open_rate: Number(dayOpenRate.toFixed(2)),
                day_bounce_rate: Number(dayBounceRate.toFixed(2)),
            })
            .eq('id', dailyLimitId)
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
        const bounceType = event.eventType === 'bounced'
            ? (event.metadata?.bounceType as 'hard' | 'soft' | 'complaint') || 'hard'
            : 'complaint'

        // Obtener razón del bounce
        const bounceReason = event.metadata?.bounceReason ||
            event.metadata?.reason ||
            (event.eventType === 'complained' ? 'User complaint' : 'Unknown bounce reason')

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
