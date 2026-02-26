import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NotificationThreshold } from '@/lib/models/collection/notification-threshold'
import type { GroupedClient } from '@/components/collection/wizard/types'

export interface ThresholdPreviewData {
  threshold: NotificationThreshold | null
  clients: GroupedClient[]
  count: number
}

interface WizardThresholdState {
  // Estado del cálculo
  previewData: ThresholdPreviewData[]
  unassignedClients: GroupedClient[]
  unassignedCount: number
  totalClients: number
  missingThresholdRanges: { min: number; max: number }[]
  hasAllThresholds: boolean
  isLoading: boolean
  lastCalculated: number | null
  
  // Business ID para invalidar cache
  businessId: string | null
  clientsKey: string | null // Hash de los clientes para detectar cambios
  
  // Acciones
  setThresholdData: (data: {
    previewData: ThresholdPreviewData[]
    unassignedClients: GroupedClient[]
    unassignedCount: number
    totalClients: number
    missingThresholdRanges: { min: number; max: number }[]
    hasAllThresholds: boolean
    businessId: string
    clientsKey: string
  }) => void
  
  setLoading: (loading: boolean) => void
  
  // Verificar si necesita recalcular
  needsRecalculation: (
    businessId: string,
    clients: Map<string, GroupedClient>
  ) => boolean
  
  // Reset
  reset: () => void
}

/**
 * Genera un hash simple de los clientes para detectar cambios
 */
function generateClientsKey(clients: Map<string, GroupedClient>): string {
  const nits = Array.from(clients.keys()).sort()
  const totalAmount = Array.from(clients.values()).reduce(
    (sum, c) => sum + c.total.total_amount_due,
    0
  )
  const totalDays = Array.from(clients.values()).reduce(
    (sum, c) => sum + c.total.total_days_overdue,
    0
  )
  return `${nits.join(',')}_${totalAmount}_${totalDays}_${clients.size}`
}

export const useWizardThresholdStore = create<WizardThresholdState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      previewData: [],
      unassignedClients: [],
      unassignedCount: 0,
      totalClients: 0,
      missingThresholdRanges: [],
      hasAllThresholds: false,
      isLoading: false,
      lastCalculated: null,
      businessId: null,
      clientsKey: null,

      setThresholdData: (data) =>
        set({
          previewData: data.previewData,
          unassignedClients: data.unassignedClients,
          unassignedCount: data.unassignedCount,
          totalClients: data.totalClients,
          missingThresholdRanges: data.missingThresholdRanges,
          hasAllThresholds: data.hasAllThresholds,
          businessId: data.businessId,
          clientsKey: data.clientsKey,
          lastCalculated: Date.now(),
          isLoading: false,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      needsRecalculation: (businessId, clients) => {
        const state = get()
        
        // Si no hay datos previos, necesita calcular
        if (!state.lastCalculated || !state.businessId) {
          return true
        }

        // Si cambió el negocio, necesita recalcular
        if (state.businessId !== businessId) {
          return true
        }

        // Si cambiaron los clientes, necesita recalcular
        const currentKey = generateClientsKey(clients)
        if (state.clientsKey !== currentKey) {
          return true
        }

        // Cache válido por 10 minutos
        const cacheDuration = 10 * 60 * 1000
        if (Date.now() - state.lastCalculated > cacheDuration) {
          return true
        }

        return false
      },

      reset: () =>
        set({
          previewData: [],
          unassignedClients: [],
          unassignedCount: 0,
          totalClients: 0,
          missingThresholdRanges: [],
          hasAllThresholds: false,
          isLoading: false,
          lastCalculated: null,
          businessId: null,
          clientsKey: null,
        }),
    }),
    {
      name: 'wizard-threshold-storage',
      partialize: (state) => ({
        previewData: state.previewData,
        unassignedClients: state.unassignedClients,
        unassignedCount: state.unassignedCount,
        totalClients: state.totalClients,
        missingThresholdRanges: state.missingThresholdRanges,
        hasAllThresholds: state.hasAllThresholds,
        lastCalculated: state.lastCalculated,
        businessId: state.businessId,
        clientsKey: state.clientsKey,
      }),
    }
  )
)

export { generateClientsKey }
