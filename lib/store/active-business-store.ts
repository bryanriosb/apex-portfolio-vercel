import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'
import BusinessService from '@/lib/services/business/business-service'

export interface Business {
  id: string
  name: string
  business_account_id: string
}

interface ActiveBusinessState {
  activeBusiness: Business | null
  businesses: Business[]
  isLoading: boolean
  lastFetched: number | null
  cacheDuration: number
  userId: string | null // Track which user owns this data
  setActiveBusiness: (business: Business) => void
  setBusinesses: (businesses: Business[]) => void
  initializeFromSession: (businesses: Business[], userId: string) => void
  loadBusinesses: (businessAccountId: string, userId: string) => Promise<void>
  reset: () => void
  validateUserSession: (currentUserId: string) => boolean
}

export const useActiveBusinessStore = create<ActiveBusinessState>()(
  persist(
    (set, get) => ({
      activeBusiness: null,
      businesses: [],
      isLoading: false,
      lastFetched: null,
      cacheDuration: 5 * 60 * 1000, // 5 minutes
      userId: null,

      setActiveBusiness: (business) => set({ activeBusiness: business }),

      setBusinesses: (businesses) => set({ businesses }),

      validateUserSession: (currentUserId: string) => {
        const state = get()
        // If no userId stored or different user, data is stale
        if (!state.userId || state.userId !== currentUserId) {
          console.log('[ActiveBusinessStore] Usuario diferente detectado, limpiando datos...')
          set({ 
            activeBusiness: null, 
            businesses: [], 
            lastFetched: null,
            userId: currentUserId 
          })
          return false
        }
        return true
      },

      initializeFromSession: (businesses, userId) => {
        const state = get()
        
        // Validate user session first
        if (state.userId && state.userId !== userId) {
          console.log('[ActiveBusinessStore] Cambio de usuario detectado, reseteando...')
          set({
            businesses,
            activeBusiness: businesses[0] || null,
            userId,
          })
          return
        }

        const current = state.activeBusiness
        const validBusiness = current ? businesses.find((b) => b.id === current.id) : null

        set({
          businesses,
          activeBusiness: validBusiness || businesses[0] || null,
          userId,
        })
      },

      loadBusinesses: async (businessAccountId: string, userId: string) => {
        const state = get()
        const now = Date.now()

        // Validate user session
        if (state.userId && state.userId !== userId) {
          console.log('[ActiveBusinessStore] Usuario diferente, invalidando caché...')
          set({ 
            activeBusiness: null, 
            businesses: [], 
            lastFetched: null,
            userId 
          })
        }

        // Check if cache is valid (only for same user)
        if (
          state.userId === userId &&
          state.businesses.length > 0 &&
          state.lastFetched &&
          now - state.lastFetched < state.cacheDuration
        ) {
          return
        }

        set({ isLoading: true })

        try {
          const service = new BusinessService()
          const result = await service.fetchItems({
            business_account_id: businessAccountId,
            page_size: 50,
          })
          
          const loadedBusinesses = result.data.map((b) => ({
            id: b.id,
            name: b.name,
            business_account_id: b.business_account_id,
          }))

          const currentActive = state.activeBusiness
          const isValidActive = currentActive && loadedBusinesses.find(b => b.id === currentActive.id)

          set({
            businesses: loadedBusinesses,
            lastFetched: now,
            isLoading: false,
            userId,
            activeBusiness: isValidActive ? currentActive : loadedBusinesses[0] || null,
          })
        } catch (error) {
          console.error('Error loading businesses:', error)
          set({ isLoading: false })
          throw error
        }
      },

      reset: () => set({ 
        activeBusiness: null, 
        businesses: [], 
        isLoading: false, 
        lastFetched: null,
        userId: null 
      }),
    }),
    {
      name: 'active-business-storage',
      partialize: (state) => ({ 
        activeBusiness: state.activeBusiness,
        businesses: state.businesses,
        lastFetched: state.lastFetched,
        userId: state.userId 
      }),
    }
  )
)

export function useActiveBusinessHydrated() {
  const [hydrated, setHydrated] = useState(false)
  const store = useActiveBusinessStore()

  useEffect(() => {
    setHydrated(true)
  }, [])

  return { ...store, hydrated }
}
