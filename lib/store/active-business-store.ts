import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import BusinessService from '@/lib/services/business/business-service'

export interface Business {
  id: string
  name: string
  business_account_id: string
  timezone: string
  logo_url: string | null
}

interface ActiveBusinessState {
  activeBusiness: Business | null
  businesses: Business[]
  isLoading: boolean
  lastFetched: number | null
  cacheDuration: number
  userId: string | null // Track which user owns this data
  hydrated: boolean // Track if store has been rehydrated from storage
  setActiveBusiness: (business: Business) => void
  setBusinesses: (businesses: Business[]) => void
  initializeFromSession: (businesses: Business[], userId: string) => void
  loadBusinesses: (businessAccountId: string, userId: string) => Promise<void>
  reset: () => void
  validateUserSession: (currentUserId: string) => boolean
  setHydrated: (hydrated: boolean) => void
  updateBusinessLogo: (businessId: string, logoUrl: string | null) => void
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
      hydrated: false,

      setActiveBusiness: (business) => set({ activeBusiness: business }),

      setHydrated: (hydrated) => set({ hydrated }),

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
        
        // Siempre validar que los datos corresponden al usuario actual
        if (state.userId && state.userId !== userId) {
          console.log('[ActiveBusinessStore] Cambio de usuario en sesión, reseteando...')
          set({
            businesses,
            activeBusiness: businesses[0] || null,
            userId,
            lastFetched: Date.now(),
          })
          return
        }

        // Mantener el negocio activo si aún existe en la nueva lista
        const current = state.activeBusiness
        const validBusiness = current ? businesses.find((b) => b.id === current.id) : null

        set({
          businesses,
          activeBusiness: validBusiness || businesses[0] || null,
          userId,
          lastFetched: Date.now(),
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
            timezone: b.timezone,
            logo_url: b.logo_url,
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

      updateBusinessLogo: (businessId: string, logoUrl: string | null) => {
        const state = get()
        
        // Actualizar el negocio activo si coincide
        if (state.activeBusiness?.id === businessId) {
          set({
            activeBusiness: {
              ...state.activeBusiness,
              logo_url: logoUrl,
            },
          })
        }
        
        // Actualizar en la lista de negocios
        const updatedBusinesses = state.businesses.map((b) =>
          b.id === businessId ? { ...b, logo_url: logoUrl } : b
        )
        set({ businesses: updatedBusinesses })
      },
    }),
    {
      name: 'active-business-storage',
      partialize: (state) => ({ 
        activeBusiness: state.activeBusiness,
        businesses: state.businesses,
        lastFetched: state.lastFetched,
        userId: state.userId 
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true
        }
      },
    }
  )
)

export function useActiveBusinessHydrated() {
  const store = useActiveBusinessStore()
  
  return store
}
