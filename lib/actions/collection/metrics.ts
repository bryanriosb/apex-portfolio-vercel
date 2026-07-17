'use server'

import apiApexAiAuth from '@/lib/actions/api/apex-ai'
import { requireUser } from '@/lib/auth/tenant-guard'

/**
 * KPIs de gestión de cartera expuestos por apex-ai bajo /api/v1/collections.
 * El backend resuelve el business desde el JWT de la sesión (Supabase SSO),
 * por lo que estas actions no reciben businessId.
 */

export interface GeneralKpis {
  total_interactions: number
  /** Fracción 0..1 de interacciones resueltas sin intervención humana */
  auto_resolution_rate: number
  /** Fracción 0..1 de interacciones que requirieron aprobación HITL */
  hitl_rate: number
  avg_response_time_ms: number
}

export interface EffectivenessKpis {
  /** Conteo de interacciones por intención detectada */
  intents_distribution: Record<string, number>
  /** Confianza promedio del clasificador de intenciones (0..1) */
  average_confidence: number
}

export interface AgingBucket {
  bucket: string
  amount: number
  amount_with_promise: number
}

export interface AgingKpis {
  total_outstanding: number
  total_with_promise: number
  buckets: AgingBucket[]
}

export interface CashForecastItem {
  week_start: string
  segment: string
  risk_cluster: number | null
  projected_amount: number
  promise_count: number
}

/**
 * Recaudo esperado por vencimientos: facturas con saldo proyectadas a la
 * semana estimada de pago (due_date + grace_days de la sucursal + delay
 * histórico del cliente). Lo ya vencido se proyecta a la semana en curso.
 */
export interface ExpectedForecastItem {
  /** Lunes de la semana proyectada (ISO YYYY-MM-DD) */
  week_start: string
  expected_amount: number
  invoice_count: number
}

export interface CarteraDashboardData {
  general: GeneralKpis | null
  effectiveness: EffectivenessKpis | null
  aging: AgingKpis | null
  forecast: CashForecastItem[]
  expectedForecast: ExpectedForecastItem[]
}

/**
 * GET a un endpoint de collections devolviendo `fallback` ante cualquier
 * error (el tablero degrada a estados vacíos en vez de romperse).
 */
async function fetchCollectionMetric<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await apiApexAiAuth.get(path)
    return (response.data ?? fallback) as T
  } catch (error) {
    console.error(`Error fetching ${path}:`, error)
    return fallback
  }
}

export async function getGeneralKpisAction(): Promise<GeneralKpis | null> {
  await requireUser()

  return fetchCollectionMetric<GeneralKpis | null>('/collections/kpi', null)
}

export async function getEffectivenessKpisAction(): Promise<EffectivenessKpis | null> {
  await requireUser()

  return fetchCollectionMetric<EffectivenessKpis | null>(
    '/collections/kpi/effectiveness',
    null
  )
}

export async function getAgingKpisAction(): Promise<AgingKpis | null> {
  await requireUser()

  return fetchCollectionMetric<AgingKpis | null>('/collections/kpi/aging', null)
}

export async function getCashForecastAction(): Promise<CashForecastItem[]> {
  await requireUser()

  const data = await fetchCollectionMetric<CashForecastItem[]>(
    '/collections/forecast',
    []
  )
  return Array.isArray(data) ? data : []
}

export async function getExpectedForecastAction(): Promise<
  ExpectedForecastItem[]
> {
  await requireUser()

  const data = await fetchCollectionMetric<ExpectedForecastItem[]>(
    '/collections/forecast/expected',
    []
  )
  return Array.isArray(data) ? data : []
}

/**
 * Carga consolidada del tab Indicadores: los 4 endpoints en paralelo dentro
 * de una sola server action (una única ida cliente→servidor).
 */
export async function getCarteraDashboardAction(): Promise<CarteraDashboardData> {
  await requireUser()

  const [general, effectiveness, aging, forecast, expectedForecast] =
    await Promise.all([
      getGeneralKpisAction(),
      getEffectivenessKpisAction(),
      getAgingKpisAction(),
      getCashForecastAction(),
      getExpectedForecastAction(),
    ])
  return { general, effectiveness, aging, forecast, expectedForecast }
}
