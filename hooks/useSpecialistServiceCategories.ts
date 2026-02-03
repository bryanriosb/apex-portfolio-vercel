'use client'

import { useState, useCallback, useEffect } from 'react'

/**
 * Hook para manejar las categorías de servicio seleccionadas de un especialista
 * Permite compartir el estado entre diferentes componentes (modal, grid, etc.)
 */
export function useSpecialistServiceCategories(
  specialistId: string | null
) {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Cargar categorías cuando cambia el especialista
  useEffect(() => {
    if (!specialistId) {
      setSelectedCategoryIds([])
      return
    }

    const loadCategories = async () => {
      setIsLoading(true)
      try {
        // Aquí iría la llamada a la API para obtener categorías del especialista
        // Por ahora, simulamos con categorías vacías hasta que se implemente la API
        // const response = await fetchSpecialistServiceCategoriesAction(specialistId)
        const mockCategories: string[] = [] // Reemplazar con la llamada real cuando esté disponible
        setSelectedCategoryIds(mockCategories)
      } catch (error) {
        console.error('Error loading specialist service categories:', error)
        setSelectedCategoryIds([])
      } finally {
        setIsLoading(false)
      }
    }

    loadCategories()
  }, [specialistId])

  const addCategory = useCallback((categoryId: string) => {
    setSelectedCategoryIds(prev => [...prev, categoryId])
  }, [])

  const removeCategory = useCallback((categoryId: string) => {
    setSelectedCategoryIds(prev => prev.filter(id => id !== categoryId))
  }, [])

  const clearCategories = useCallback(() => {
    setSelectedCategoryIds([])
  }, [])

  return {
    selectedCategoryIds,
    setSelectedCategoryIds,
    isLoading,
    addCategory,
    removeCategory,
    clearCategories,
  }
}