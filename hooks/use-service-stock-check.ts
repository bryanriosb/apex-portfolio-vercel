'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSuppliesForServicesAction } from '@/lib/actions/service-supply'
import type { ServiceSupplyWithProduct } from '@/lib/models/product'

export interface ServiceStockIssue {
  serviceId: string
  productId: string
  productName: string
  currentStock: number
  requiredQuantity: number
  shortage: number
}

export interface ServiceStockStatus {
  serviceId: string
  hasStockIssues: boolean
  issues: ServiceStockIssue[]
}

interface UseServiceStockCheckResult {
  checkService: (serviceId: string) => Promise<ServiceStockStatus>
  checkServices: (serviceIds: string[]) => Promise<Map<string, ServiceStockStatus>>
  getServiceStatus: (serviceId: string) => ServiceStockStatus | undefined
  stockStatusMap: Map<string, ServiceStockStatus>
  isChecking: boolean
  clearCache: () => void
}

export function useServiceStockCheck(): UseServiceStockCheckResult {
  const [stockStatusMap, setStockStatusMap] = useState<Map<string, ServiceStockStatus>>(new Map())
  const [isChecking, setIsChecking] = useState(false)
  const cacheRef = useRef<Map<string, ServiceSupplyWithProduct[]>>(new Map())

  const analyzeStockForService = useCallback(
    (serviceId: string, supplies: ServiceSupplyWithProduct[]): ServiceStockStatus => {
      const serviceSupplies = supplies.filter((s) => s.service_id === serviceId)
      const issues: ServiceStockIssue[] = []

      for (const supply of serviceSupplies) {
        const currentStock = supply.product?.current_stock ?? 0
        const requiredQuantity = supply.default_quantity

        if (currentStock < requiredQuantity) {
          issues.push({
            serviceId,
            productId: supply.product_id,
            productName: supply.product?.name ?? 'Producto desconocido',
            currentStock,
            requiredQuantity,
            shortage: requiredQuantity - currentStock,
          })
        }
      }

      return {
        serviceId,
        hasStockIssues: issues.length > 0,
        issues,
      }
    },
    []
  )

  const checkService = useCallback(
    async (serviceId: string): Promise<ServiceStockStatus> => {
      setIsChecking(true)
      try {
        let supplies = cacheRef.current.get(serviceId)

        if (!supplies) {
          supplies = await getSuppliesForServicesAction([serviceId])
          cacheRef.current.set(serviceId, supplies)
        }

        const status = analyzeStockForService(serviceId, supplies)

        setStockStatusMap((prev) => {
          const newMap = new Map(prev)
          newMap.set(serviceId, status)
          return newMap
        })

        return status
      } finally {
        setIsChecking(false)
      }
    },
    [analyzeStockForService]
  )

  const checkServices = useCallback(
    async (serviceIds: string[]): Promise<Map<string, ServiceStockStatus>> => {
      if (serviceIds.length === 0) {
        return new Map()
      }

      setIsChecking(true)
      try {
        const uncachedIds = serviceIds.filter((id) => !cacheRef.current.has(id))

        if (uncachedIds.length > 0) {
          const supplies = await getSuppliesForServicesAction(uncachedIds)
          for (const id of uncachedIds) {
            const serviceSupplies = supplies.filter((s) => s.service_id === id)
            cacheRef.current.set(id, serviceSupplies)
          }
        }

        const statusMap = new Map<string, ServiceStockStatus>()

        for (const serviceId of serviceIds) {
          const supplies = cacheRef.current.get(serviceId) || []
          const status = analyzeStockForService(serviceId, supplies)
          statusMap.set(serviceId, status)
        }

        setStockStatusMap(statusMap)
        return statusMap
      } finally {
        setIsChecking(false)
      }
    },
    [analyzeStockForService]
  )

  const getServiceStatus = useCallback(
    (serviceId: string): ServiceStockStatus | undefined => {
      return stockStatusMap.get(serviceId)
    },
    [stockStatusMap]
  )

  const clearCache = useCallback(() => {
    cacheRef.current.clear()
    setStockStatusMap(new Map())
  }, [])

  return {
    checkService,
    checkServices,
    getServiceStatus,
    stockStatusMap,
    isChecking,
    clearCache,
  }
}
