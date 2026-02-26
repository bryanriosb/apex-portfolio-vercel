'use client'

import { useEffect, useCallback } from 'react'
import { useWizardThresholdStore, generateClientsKey } from '@/lib/store/wizard-threshold-store'
import { NotificationThresholdService } from '@/lib/services/collection/notification-threshold-service'
import type { GroupedClient } from '@/components/collection/wizard/types'

/**
 * Find the matching threshold for a given days overdue value
 */
function findThresholdForDays(
  thresholds: any[],
  daysOverdue: number
): any | null {
  for (const threshold of thresholds) {
    const daysFrom = threshold.days_from
    const daysTo = threshold.days_to ?? Infinity
    
    if (daysOverdue >= daysFrom && daysOverdue <= daysTo) {
      return threshold
    }
  }
  return null
}

/**
 * Hook optimizado que usa Zustand store para evitar recálculos
 * entre pasos del wizard
 */
export function useWizardThresholdPreview(
  clients: Map<string, GroupedClient>,
  businessId: string
) {
  const store = useWizardThresholdStore()

  const calculatePreview = useCallback(async () => {
    // Verificar si necesita recalcular
    if (!store.needsRecalculation(businessId, clients)) {
      console.log('[useWizardThresholdPreview] Usando cache existente')
      return
    }

    console.log('[useWizardThresholdPreview] Calculando thresholds...')
    store.setLoading(true)

    try {
      // Obtener todos los thresholds (1 sola llamada a DB)
      const thresholdsResponse = await NotificationThresholdService.fetchThresholds(businessId)
      const thresholds = thresholdsResponse.data

      // Pre-sort thresholds
      const sortedThresholds = [...thresholds].sort((a, b) => a.days_from - b.days_from)

      // Agrupar clientes
      const clientsArray = Array.from(clients.values()).filter((c) => c.status === 'found')
      const groupedByThreshold = new Map<string, any>()
      const unassigned: any[] = []

      for (const client of clientsArray) {
        if (client.status !== 'found') continue
        
        const daysOverdue = client.total.total_days_overdue || 0
        const threshold = findThresholdForDays(sortedThresholds, daysOverdue)

        if (threshold) {
          const existing = groupedByThreshold.get(threshold.id)
          if (existing) {
            existing.clients.push(client)
            existing.count++
          } else {
            groupedByThreshold.set(threshold.id, {
              threshold,
              clients: [client],
              count: 1,
            })
          }
        } else {
          unassigned.push(client)
        }
      }

      // Convertir a array y ordenar
      const previewData = Array.from(groupedByThreshold.values()).sort((a, b) => {
        if (!a.threshold || !b.threshold) return 0
        return a.threshold.days_from - b.threshold.days_from
      })

      // Calcular rangos faltantes
      const missingThresholdRanges = calculateMissingRanges(unassigned)

      // Guardar en store
      store.setThresholdData({
        previewData,
        unassignedClients: unassigned,
        unassignedCount: unassigned.length,
        totalClients: clientsArray.length,
        missingThresholdRanges,
        hasAllThresholds: unassigned.length === 0,
        businessId,
        clientsKey: generateClientsKey(clients),
      })

      console.log('[useWizardThresholdPreview] Calculo completado:', {
        totalClients: clientsArray.length,
        unassignedCount: unassigned.length,
        thresholdsCount: previewData.length,
      })
    } catch (error) {
      console.error('Error calculating threshold preview:', error)
      store.setLoading(false)
    }
  }, [clients, businessId])

  useEffect(() => {
    if (clients.size > 0 && businessId) {
      calculatePreview()
    }
  }, [clients.size, businessId])

  return {
    previewData: store.previewData,
    isLoading: store.isLoading,
    unassignedClients: store.unassignedClients,
    unassignedCount: store.unassignedCount,
    totalClients: store.totalClients,
    missingThresholdRanges: store.missingThresholdRanges,
    hasAllThresholds: store.hasAllThresholds,
    refreshPreview: calculatePreview,
  }
}

function calculateMissingRanges(unassignedClients: any[]): { min: number; max: number }[] {
  if (unassignedClients.length === 0) return []

  const daysSet = new Set(unassignedClients.map((c) => c.total.total_days_overdue))
  const sortedDays = Array.from(daysSet).sort((a, b) => a - b)

  if (sortedDays.length === 0) return []

  const ranges: { min: number; max: number }[] = []
  let currentRange = { min: sortedDays[0], max: sortedDays[0] }

  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] === currentRange.max + 1) {
      currentRange.max = sortedDays[i]
    } else {
      ranges.push({ ...currentRange })
      currentRange = { min: sortedDays[i], max: sortedDays[i] }
    }
  }
  ranges.push(currentRange)

  return ranges
}
