import { EmailReputationProfile, EmailReputationProfileInsert, EmailReputationProfileUpdate } from '@/lib/models/collection/email-reputation'
import { DailySendingLimit, DailySendingLimitInsert, DailySendingLimitUpdate } from '@/lib/models/collection/daily-sending-limit'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'

/**
 * Servicio para gestionar la reputación de dominios de email
 * Controla warm-up, límites diarios, y métricas de entrega
 */
export class EmailReputationService {
    /**
     * Obtiene o crea un perfil de reputación para un dominio
     */
    static async getOrCreateReputationProfile(
        businessId: string,
        domain: string,
        provider: string = 'brevo',
        sendingIp?: string
    ): Promise<EmailReputationProfile> {
        const supabase = await getSupabaseAdminClient()

        // Buscar perfil existente
        const { data: existing, error: fetchError } = await supabase
            .from('email_reputation_profiles')
            .select('*')
            .eq('business_id', businessId)
            .eq('domain', domain)
            .single()

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows
            throw new Error(`Error fetching reputation profile: ${fetchError.message}`)
        }

        if (existing) {
            return existing as EmailReputationProfile
        }

        // Crear nuevo perfil con estrategia conservadora por defecto
        const insertData: EmailReputationProfileInsert = {
            business_id: businessId,
            domain: domain.toLowerCase().trim(),
            provider: provider.toLowerCase(),
            sending_ip: sendingIp,
            is_warmed_up: false,
            warmup_start_date: new Date().toISOString(),
            current_warmup_day: 1,
            current_strategy: 'ramp_up',
            daily_sending_limit: 50, // Día 1: 50 emails
            max_sending_limit: 200,
            required_open_rate: 20.00,
            required_delivery_rate: 95.00,
        }

        const { data: created, error: createError } = await supabase
            .from('email_reputation_profiles')
            .insert(insertData)
            .select()
            .single()

        if (createError) {
            throw new Error(`Error creating reputation profile: ${createError.message}`)
        }

        // Crear registro de límite diario para hoy
        await this.getOrCreateDailyLimit(created.id, new Date(), 50)

        return created as EmailReputationProfile
    }

    /**
     * Obtiene el perfil de reputación por ID
     */
    static async getReputationProfileById(
        profileId: string
    ): Promise<EmailReputationProfile | null> {
        const supabase = await getSupabaseAdminClient()

        const { data, error } = await supabase
            .from('email_reputation_profiles')
            .select('*')
            .eq('id', profileId)
            .single()

        if (error) {
            console.error('Error fetching reputation profile:', error)
            return null
        }

        return data as EmailReputationProfile
    }

    /**
     * Obtiene o crea un registro de límite diario
     */
    static async getOrCreateDailyLimit(
        reputationProfileId: string,
        date: Date,
        dailyLimit: number
    ): Promise<DailySendingLimit> {
        const supabase = await getSupabaseAdminClient()

        const dateString = date.toISOString().split('T')[0] // YYYY-MM-DD

        // Buscar existente
        const { data: existing, error: fetchError } = await supabase
            .from('daily_sending_limits')
            .select('*')
            .eq('reputation_profile_id', reputationProfileId)
            .eq('date', dateString)
            .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw new Error(`Error fetching daily limit: ${fetchError.message}`)
        }

        if (existing) {
            return existing as DailySendingLimit
        }

        // Crear nuevo
        const insertData: DailySendingLimitInsert = {
            reputation_profile_id: reputationProfileId,
            date: dateString,
            daily_limit: dailyLimit,
        }

        const { data: created, error: createError } = await supabase
            .from('daily_sending_limits')
            .insert(insertData)
            .select()
            .single()

        if (createError) {
            throw new Error(`Error creating daily limit: ${createError.message}`)
        }

        return created as DailySendingLimit
    }

    /**
     * Verifica si se pueden enviar emails hoy según los límites
     * Retorna cuántos emails se pueden enviar aún hoy
     */
    static async getRemainingDailyQuota(
        reputationProfileId: string,
        date: Date = new Date()
    ): Promise<{ canSend: boolean; remaining: number; dailyLimit: number; emailsSent: number }> {
        const supabase = await getSupabaseAdminClient()

        const dateString = date.toISOString().split('T')[0]

        const { data: dailyLimit, error } = await supabase
            .from('daily_sending_limits')
            .select('*')
            .eq('reputation_profile_id', reputationProfileId)
            .eq('date', dateString)
            .single()

        if (error) {
            // Si no existe, asumir que no se ha enviado nada
            const profile = await this.getReputationProfileById(reputationProfileId)
            if (!profile) {
                return { canSend: false, remaining: 0, dailyLimit: 0, emailsSent: 0 }
            }
            return {
                canSend: true,
                remaining: profile.daily_sending_limit,
                dailyLimit: profile.daily_sending_limit,
                emailsSent: 0
            }
        }

        const remaining = dailyLimit.daily_limit - dailyLimit.emails_sent
        const canSend = remaining > 0 && !dailyLimit.limit_reached && !dailyLimit.paused_until

        return {
            canSend,
            remaining: Math.max(0, remaining),
            dailyLimit: dailyLimit.daily_limit,
            emailsSent: dailyLimit.emails_sent,
        }
    }

    /**
     * Incrementa el contador de emails enviados para hoy
     */
    static async incrementEmailsSent(
        reputationProfileId: string,
        count: number = 1,
        date: Date = new Date()
    ): Promise<void> {
        const supabase = await getSupabaseAdminClient()

        const dateString = date.toISOString().split('T')[0]

        const { error } = await supabase
            .from('daily_sending_limits')
            .update({
                emails_sent: supabase.rpc('increment', { count }),
            })
            .eq('reputation_profile_id', reputationProfileId)
            .eq('date', dateString)

        if (error) {
            console.error('Error incrementing emails sent:', error)
            throw new Error(`Error updating sent count: ${error.message}`)
        }
    }

    /**
     * Actualiza métricas de entrega (delivery, open, bounce)
     */
    static async updateDeliveryMetrics(
        reputationProfileId: string,
        metrics: {
            delivered?: number
            opened?: number
            bounced?: number
            complaint?: number
        },
        date: Date = new Date()
    ): Promise<void> {
        const supabase = await getSupabaseAdminClient()

        const dateString = date.toISOString().split('T')[0]

        // Actualizar daily limit
        const updateData: DailySendingLimitUpdate = {}
        if (metrics.delivered !== undefined) updateData.emails_delivered = metrics.delivered
        if (metrics.opened !== undefined) updateData.emails_opened = metrics.opened
        if (metrics.bounced !== undefined) updateData.emails_bounced = metrics.bounced

        // Calcular tasas
        const { data: dailyLimit } = await supabase
            .from('daily_sending_limits')
            .select('*')
            .eq('reputation_profile_id', reputationProfileId)
            .eq('date', dateString)
            .single()

        if (dailyLimit) {
            const sent = dailyLimit.emails_sent || 1
            if (metrics.delivered !== undefined) {
                updateData.day_delivery_rate = (dailyLimit.emails_delivered / sent) * 100
            }
            if (metrics.opened !== undefined) {
                updateData.day_open_rate = (dailyLimit.emails_opened / sent) * 100
            }
            if (metrics.bounced !== undefined) {
                updateData.day_bounce_rate = (dailyLimit.emails_bounced / sent) * 100
            }

            await supabase
                .from('daily_sending_limits')
                .update(updateData)
                .eq('id', dailyLimit.id)
        }

        // Actualizar totales en el perfil
        const { data: profile } = await supabase
            .from('email_reputation_profiles')
            .select('*')
            .eq('id', reputationProfileId)
            .single()

        if (profile) {
            const profileUpdate: EmailReputationProfileUpdate = {
                total_emails_delivered: profile.total_emails_delivered + (metrics.delivered || 0),
                total_emails_opened: profile.total_emails_opened + (metrics.opened || 0),
                total_emails_bounced: profile.total_emails_bounced + (metrics.bounced || 0),
                total_complaints: profile.total_complaints + (metrics.complaint || 0),
            }

            // Recalcular tasas
            const totalSent = profile.total_emails_sent || 1
            profileUpdate.delivery_rate = (profileUpdate.total_emails_delivered! / totalSent) * 100
            profileUpdate.open_rate = (profileUpdate.total_emails_opened! / totalSent) * 100
            profileUpdate.bounce_rate = (profileUpdate.total_emails_bounced! / totalSent) * 100
            profileUpdate.complaint_rate = (profileUpdate.total_complaints! / totalSent) * 100

            await supabase
                .from('email_reputation_profiles')
                .update(profileUpdate)
                .eq('id', reputationProfileId)
        }
    }

    /**
     * Evalúa si se puede progresar al siguiente día de warm-up
     * Basado en métricas de engagement
     */
    static async evaluateWarmupProgression(
        reputationProfileId: string,
        date: Date = new Date()
    ): Promise<{
        canProgress: boolean
        currentDay: number
        nextDay: number
        newLimit: number
        reason: string
    }> {
        const supabase = await getSupabaseAdminClient()

        const profile = await this.getReputationProfileById(reputationProfileId)
        if (!profile) {
            return { canProgress: false, currentDay: 1, nextDay: 1, newLimit: 50, reason: 'Profile not found' }
        }

        const dateString = date.toISOString().split('T')[0]
        const { data: dailyLimit } = await supabase
            .from('daily_sending_limits')
            .select('*')
            .eq('reputation_profile_id', reputationProfileId)
            .eq('date', dateString)
            .single()

        if (!dailyLimit) {
            return { canProgress: false, currentDay: profile.current_warmup_day, nextDay: profile.current_warmup_day, newLimit: profile.daily_sending_limit, reason: 'No daily limit record' }
        }

        // Validar métricas mínimas
        const openRate = dailyLimit.day_open_rate || 0
        const deliveryRate = dailyLimit.day_delivery_rate || 0
        const bounceRate = dailyLimit.day_bounce_rate || 0

        const meetsOpenRate = openRate >= profile.required_open_rate
        const meetsDeliveryRate = deliveryRate >= profile.required_delivery_rate
        const meetsBounceRate = bounceRate <= 5.0 // Máximo 5% bounce

        if (!meetsOpenRate) {
            return {
                canProgress: false,
                currentDay: profile.current_warmup_day,
                nextDay: profile.current_warmup_day,
                newLimit: profile.daily_sending_limit,
                reason: `Open rate too low: ${openRate}% (required: ${profile.required_open_rate}%)`,
            }
        }

        if (!meetsDeliveryRate) {
            return {
                canProgress: false,
                currentDay: profile.current_warmup_day,
                nextDay: profile.current_warmup_day,
                newLimit: profile.daily_sending_limit,
                reason: `Delivery rate too low: ${deliveryRate}% (required: ${profile.required_delivery_rate}%)`,
            }
        }

        if (!meetsBounceRate) {
            return {
                canProgress: false,
                currentDay: profile.current_warmup_day,
                nextDay: profile.current_warmup_day,
                newLimit: profile.daily_sending_limit,
                reason: `Bounce rate too high: ${bounceRate}% (max: 5%)`,
            }
        }

        // Calcular nuevo día y límite
        const currentDay = profile.current_warmup_day
        const nextDay = currentDay + 1
        let newLimit = profile.daily_sending_limit

        if (nextDay === 2) newLimit = 100
        else if (nextDay >= 3 && nextDay <= 5) newLimit = 150
        else if (nextDay >= 6) newLimit = Math.min(200, profile.max_sending_limit)

        // Marcar como completado si llegamos al día 6+
        const isWarmedUp = nextDay >= 6 && newLimit >= 200

        // Actualizar perfil
        await supabase
            .from('email_reputation_profiles')
            .update({
                current_warmup_day: nextDay,
                daily_sending_limit: newLimit,
                is_warmed_up: isWarmedUp,
                warmup_completed_date: isWarmedUp ? new Date().toISOString() : null,
            })
            .eq('id', reputationProfileId)

        // Marcar que puede progresar en el daily limit
        await supabase
            .from('daily_sending_limits')
            .update({ can_progress_to_next_day: true })
            .eq('id', dailyLimit.id)

        return {
            canProgress: true,
            currentDay,
            nextDay,
            newLimit,
            reason: `All metrics passed: Open ${openRate}%, Delivery ${deliveryRate}%, Bounce ${bounceRate}%`,
        }
    }

    /**
     * Pausa envíos por un período (bounce alto, complaint, etc.)
     */
    static async pauseSending(
        reputationProfileId: string,
        reason: string,
        pauseMinutes: number = 360, // 6 horas por defecto
        date: Date = new Date()
    ): Promise<void> {
        const supabase = await getSupabaseAdminClient()

        const dateString = date.toISOString().split('T')[0]
        const resumeTime = new Date(date.getTime() + pauseMinutes * 60000)

        await supabase
            .from('daily_sending_limits')
            .update({
                paused_until: resumeTime.toISOString(),
                pause_reason: reason,
            })
            .eq('reputation_profile_id', reputationProfileId)
            .eq('date', dateString)

        // Marcar perfil con issues
        await supabase
            .from('email_reputation_profiles')
            .update({
                has_reputation_issues: true,
                last_issue_date: new Date().toISOString(),
            })
            .eq('id', reputationProfileId)
    }

    /**
     * Resume envíos manualmente
     */
    static async resumeSending(
        reputationProfileId: string,
        date: Date = new Date()
    ): Promise<void> {
        const supabase = await getSupabaseAdminClient()

        const dateString = date.toISOString().split('T')[0]

        await supabase
            .from('daily_sending_limits')
            .update({
                paused_until: null,
                pause_reason: null,
            })
            .eq('reputation_profile_id', reputationProfileId)
            .eq('date', dateString)
    }

    /**
     * Obtiene un resumen de reputación para un negocio
     */
    static async getReputationSummary(
        businessId: string
    ): Promise<EmailReputationProfile[]> {
        const supabase = await getSupabaseAdminClient()

        const { data, error } = await supabase
            .from('email_reputation_profiles')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching reputation summary:', error)
            return []
        }

        return data as EmailReputationProfile[]
    }
}
