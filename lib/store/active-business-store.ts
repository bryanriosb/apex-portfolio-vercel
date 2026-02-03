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
  setActiveBusiness: (business: Business) => void
  setBusinesses: (businesses: Business[]) => void
  initializeFromSession: (businesses: Business[]) => void
  loadBusinesses: (businessAccountId: string) => Promise<void>
  reset: () => void
}

export const useActiveBusinessStore = create<ActiveBusinessState>()(
  persist(
    (set, get) => ({
      activeBusiness: null,
      businesses: [],
      isLoading: false,
      lastFetched: null,
      cacheDuration: 5 * 60 * 1000, // 5 minutes

      setActiveBusiness: (business) => set({ activeBusiness: business }),

      setBusinesses: (businesses) => set({ businesses }),

      initializeFromSession: (businesses) => {
        const current = get().activeBusiness
        const validBusiness = current ? businesses.find((b) => b.id === current.id) : null

        set({
          businesses,
          activeBusiness: validBusiness || businesses[0] || null,
        })
      },

      loadBusinesses: async (businessAccountId: string) => {
        const state = get()
        const now = Date.now()

        // Check if cache is valid
        if (
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

          set({
            businesses: loadedBusinesses,
            lastFetched: now,
            isLoading: false,
          })

          // Initialize active business if needed
          const currentActive = state.activeBusiness
          if (!currentActive || !loadedBusinesses.find(b => b.id === currentActive.id)) {
            set({
              activeBusiness: loadedBusinesses[0] || null,
            })
          }
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
        lastFetched: null 
      }),
    }),
    {
      name: 'active-business-storage',
      partialize: (state) => ({ 
        activeBusiness: state.activeBusiness,
        businesses: state.businesses,
        lastFetched: state.lastFetched 
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
