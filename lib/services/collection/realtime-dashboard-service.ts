'use client'

import { createAuthenticatedSupabaseClient } from '@/lib/supabase/client'
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

export class RealtimeDashboardService {
    private supabase: SupabaseClient
    private channel: RealtimeChannel | null = null

    constructor() {
        this.supabase = createAuthenticatedSupabaseClient()
    }

    async authenticate(token: string) {
        if (!token) return;

        // 1. Inyectar en el servicio de Realtime (esto es lo que abre RLS para los eventos)
        try {
            // @ts-ignore - Acceso directo al cliente de realtime para asegurar el token
            this.supabase.realtime.setAuth(token)
        } catch (err) {
            // Silencioso en producción
        }

        // 2. Intentar setSession para que las queries del mismo cliente funcionen con RLS
        try {
            const { data: { user }, error } = await this.supabase.auth.setSession({
                access_token: token,
                refresh_token: '',
            })

            if (error) {
                // Si falla setSession, al menos intentamos inyectar el header manualmente
                // @ts-ignore
                this.supabase.rest.headers['Authorization'] = `Bearer ${token}`
            }
        } catch (err) {
            // Ignorar errores esperados de sesión sin refresh token
        }
    }

    subscribeToBusinessChanges(
        businessId: string,
        onExecutionChange: (payload: any) => void,
        onClientChange: (payload: any) => void,
        onReputationChange: (payload: any) => void,
        onStatusChange?: (status: string) => void
    ) {
        // Si ya hay un canal para este negocio y está activo, no hacemos nada
        if (this.channel && this.channel.topic === `dashboard-${businessId}`) {
            return this.channel;
        }

        if (this.channel) {
            this.unsubscribe()
        }

        this.channel = this.supabase
            .channel(`dashboard-${businessId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'collection_executions',
                },
                (payload) => onExecutionChange(payload)
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'collection_clients',
                },
                (payload) => onClientChange(payload)
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'email_reputation_profiles',
                },
                (payload) => onReputationChange(payload)
            )
            .subscribe((status) => {
                if (onStatusChange) {
                    onStatusChange(status)
                }
            })

        return this.channel
    }

    unsubscribe() {
        if (this.channel) {
            const channelToRemove = this.channel;
            this.channel = null;

            // Solo intentar remover si el canal existe y el cliente está conectado
            // Para evitar "WebSocket is closed before connection is established"
            // verificamos si el canal está en un estado que permite el cierre limpio
            if (channelToRemove.state === 'joined' || channelToRemove.state === 'joining') {
                this.supabase.removeChannel(channelToRemove).catch(() => { });
            }
        }
    }
}

export const dashboardRealtimeService = new RealtimeDashboardService()
