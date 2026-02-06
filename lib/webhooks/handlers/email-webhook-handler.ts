import { getSupabaseAdminClient } from '@/lib/actions/supabase'
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
        // Buscar el cliente por message_id en custom_data
        const { data: clients, error: searchError } = await supabase
            .from('collection_clients')
            .select('id, status, custom_data, execution_id')
            .contains('custom_data', { message_id: event.messageId })
            .limit(1)

        if (searchError) {
            console.error('Error searching for client:', searchError)
            throw searchError
        }

        if (!clients || clients.length === 0) {
            console.warn(`No client found for message_id: ${event.messageId}`)
            // Aún registramos el evento aunque no encontremos el cliente
        }

        const client = clients?.[0]

        // Registrar evento en collection_events
        const { error: eventError } = await supabase.from('collection_events').insert({
            execution_id: client?.execution_id,
            client_id: client?.id,
            event_type: event.eventType,
            provider: provider,
            message_id: event.messageId,
            event_data: {
                email: event.email,
                timestamp: event.timestamp,
                metadata: event.metadata,
            },
            created_at: new Date().toISOString(),
        })

        if (eventError) {
            console.error('Error inserting event:', eventError)
            throw eventError
        }

        // Actualizar status del cliente según el evento
        if (client) {
            let newStatus = client.status

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
                    // Solo actualizar si aún no está en un estado más avanzado
                    if (client.status === 'sent' || client.status === 'delivered') {
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
                }

                const { error: updateError } = await supabase
                    .from('collection_clients')
                    .update({
                        status: newStatus,
                        custom_data: updatedCustomData,
                    })
                    .eq('id', client.id)

                if (updateError) {
                    console.error('Error updating client status:', updateError)
                    throw updateError
                }

                console.log(
                    `Updated client ${client.id} status: ${client.status} -> ${newStatus}`
                )
            }
        }

        console.log(
            `Processed ${provider} ${event.eventType} event for ${event.email}`
        )
    } catch (error) {
        console.error('Error processing email event:', error)
        throw error
    }
}
