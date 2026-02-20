// Cliente de Supabase autenticado para componentes del cliente
// Usa este helper en lugar de crear el cliente directamente

'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let supabaseBrowserClient: ReturnType<typeof createClient> | null = null

export function getSupabaseBrowserClient() {
    if (supabaseBrowserClient) return supabaseBrowserClient

    supabaseBrowserClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
        realtime: {
            params: {
                eventsPerSecond: 10,
            },
        },
        global: {
            headers: {
                'X-Client-Info': 'supabase-js-web',
            },
        },
    })

    return supabaseBrowserClient
}

/**
 * Hook para obtener un cliente de Supabase autenticado
 * Este cliente mantiene la sesión del usuario y permite que RLS funcione correctamente
 * IMPORTANTE: Inicializa la conexión Realtime automáticamente
 */
export function useAuthenticatedSupabaseClient() {
    const [client] = useState(() => getSupabaseBrowserClient())

    // Log cuando el cliente está listo
    useEffect(() => {

    }, [])

    return client
}

/**
 * Crear un cliente de Supabase para uso en componentes
 * IMPORTANTE: Este cliente debe ser usado donde ya hay una sesión activa
 */
export function createAuthenticatedSupabaseClient() {
    return getSupabaseBrowserClient()
}
