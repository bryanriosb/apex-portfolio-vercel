'use server'

import { getSupabaseAdminClient } from '../supabase'
import { CollectionConfig, CollectionConfigUpdate } from '@/lib/models/collection/config'

/**
 * Accion para obtener la configuración de collection para un negocio
 */
export async function getCollectionConfigAction(
    businessId: string
): Promise<{ success: boolean; data?: CollectionConfig; error?: string }> {
    try {
        const supabase = await getSupabaseAdminClient()

        const { data, error } = await supabase
            .from('collection_config')
            .select('*')
            .eq('business_id', businessId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                // No config found, return null as success without data
                return { success: true }
            }
            return { success: false, error: error.message }
        }

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching collection config:', error)
        return { success: false, error: 'Ocurrió un error inesperado al listar la configuración de cobros.' }
    }
}

/**
 * Accion para actualizar o crear la configuración de collection para un negocio
 */
export async function updateCollectionConfigAction(
    businessId: string,
    configData: CollectionConfigUpdate
): Promise<{ success: boolean; data?: CollectionConfig; error?: string }> {
    try {
        const supabase = await getSupabaseAdminClient()

        // fetch existing to preserve values
        const { data: existingData } = await supabase
            .from('collection_config')
            .select('*')
            .eq('business_id', businessId)
            .single()

        const dataToUpsert = {
            business_id: businessId,
            email_from_address: existingData?.email_from_address || 'cobros@ejemplo.com',
            email_from_name: existingData?.email_from_name || 'Departamento de Cobros',
            ses_region: existingData?.ses_region || 'us-east-1',
            input_date_format: existingData?.input_date_format || 'DD-MM-AAAA',
            fallback_enabled: existingData?.fallback_enabled ?? false,
            fallback_default_days: existingData?.fallback_default_days ?? 3,
            whatsapp_enabled: existingData?.whatsapp_enabled ?? false,
            alert_on_high_bounce: existingData?.alert_on_high_bounce ?? false,
            bounce_threshold_percent: existingData?.bounce_threshold_percent ?? 5,
            alert_recipients: existingData?.alert_recipients || [],
            max_emails_per_execution: existingData?.max_emails_per_execution ?? 500,
            ...(existingData || {}),
            ...configData,
            updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
            .from('collection_config')
            .upsert(dataToUpsert, { onConflict: 'business_id' })
            .select()
            .single()

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true, data }
    } catch (error: any) {
        console.error('Error updating collection config:', error)
        return { success: false, error: 'Ocurrió un error inesperado al actualizar la configuración de cobros.' }
    }
}
