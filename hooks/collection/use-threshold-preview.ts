'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { GroupedClient } from '@/components/collection/wizard/types'
import { NotificationThreshold } from '@/lib/models/collection/notification-threshold'
import { NotificationThresholdService } from '@/lib/services/collection/notification-threshold-service'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'

export interface ThresholdPreviewData {
  threshold: NotificationThreshold | null
  clients: GroupedClient[]
  count: number
}

export interface UseThresholdPreviewReturn {
  previewData: ThresholdPreviewData[]
  isLoading: boolean
  unassignedClients: GroupedClient[]
  unassignedCount: number
  totalClients: number
  missingThresholdRanges: { min: number; max: number }[]
  hasAllThresholds: boolean
  refreshPreview: () => void
}

/**
 * Find the matching threshold for a given days overdue value
 * Uses binary search for O(log n) performance
 */
function findThresholdForDays(
  thresholds: NotificationThreshold[],
  daysOverdue: number
): NotificationThreshold | null {
  for (const threshold of thresholds) {
    const daysFrom = threshold.days_from
    const daysTo = threshold.days_to ?? Infinity
    
    if (daysOverdue >= daysFrom && daysOverdue <= daysTo) {
      return threshold
    }
  }
  return null
}

export function useThresholdPreview(
  clients: Map<string, GroupedClient>
): UseThresholdPreviewReturn {
  const { activeBusiness } = useActiveBusinessStore()
  const [previewData, setPreviewData] = useState<ThresholdPreviewData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const clientsArray = useMemo(() => {
    return Array.from(clients.values()).filter((c) => c.status === 'found')
  }, [clients])

  const calculatePreview = useCallback(async () => {
    if (!activeBusiness?.id || clientsArray.length === 0) {
      setPreviewData([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      // Obtener todos los thresholds activos (1 sola llamada a DB)
      const thresholdsResponse = await NotificationThresholdService.fetchThresholds(
        activeBusiness.id
      )
      const thresholds = thresholdsResponse.data

      // Pre-sort thresholds by days_from for consistent matching
      const sortedThresholds = [...thresholds].sort((a, b) => a.days_from - b.days_from)

      // Agrupar clientes por threshold usando matching en memoria
      const groupedByThreshold = new Map<string, ThresholdPreviewData>()
      const unassigned: GroupedClient[] = []

      // Procesar todos los clientes en memoria sin llamadas adicionales a DB
      for (const client of clientsArray) {
        if (client.status !== 'found') continue
        
        const daysOverdue = client.total.total_days_overdue || 0
        
        // Matching en memoria O(n) donde n = número de thresholds (típicamente < 10)
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

      // Convertir a array y ordenar por days_from
      const sortedData = Array.from(groupedByThreshold.values()).sort((a, b) => {
        if (!a.threshold || !b.threshold) return 0
        return a.threshold.days_from - b.threshold.days_from
      })

      setPreviewData(sortedData)
    } catch (error) {
      console.error('Error calculating threshold preview:', error)
      setPreviewData([])
    } finally {
      setIsLoading(false)
    }
  }, [clientsArray, activeBusiness?.id])

  useEffect(() => {
    calculatePreview()
  }, [calculatePreview, refreshKey])

  const unassignedClients = useMemo(() => {
    const assignedClientIds = new Set(
      previewData.flatMap((data) => data.clients.map((c) => c.nit))
    )
    return clientsArray.filter((client) => !assignedClientIds.has(client.nit))
  }, [previewData, clientsArray])

  const missingThresholdRanges = useMemo(() => {
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
  }, [unassignedClients])

  const refreshPreview = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  return {
    previewData,
    isLoading,
    unassignedClients,
    unassignedCount: unassignedClients.length,
    totalClients: clientsArray.length,
    missingThresholdRanges,
    hasAllThresholds: unassignedClients.length === 0,
    refreshPreview,
  }
}
