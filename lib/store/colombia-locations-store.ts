import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface State {
  id_state: number
  state_name: string
}

export interface City {
  id_city: number
  city_name: string
  is_active: boolean
}

interface ColombiaLocationsState {
  states: State[]
  cities: City[]
  selectedState: State | null
  selectedCity: City | null
  isLoadingStates: boolean
  isLoadingCities: boolean
  lastFetchedStates: number | null
  lastFetchedCities: { [stateId: number]: number } | null
  cacheDuration: number
  
  // Actions
  loadStates: () => Promise<void>
  loadCities: (stateId: number) => Promise<void>
  setSelectedState: (state: State | null) => void
  setSelectedCity: (city: City | null) => void
  reset: () => void
}

export const useColombiaLocationsStore = create<ColombiaLocationsState>()(
  persist(
    (set, get) => ({
      states: [],
      cities: [],
      selectedState: null,
      selectedCity: null,
      isLoadingStates: false,
      isLoadingCities: false,
      lastFetchedStates: null,
      lastFetchedCities: null,
      cacheDuration: 30 * 60 * 1000, // 30 minutes

      loadStates: async () => {
        const state = get()
        const now = Date.now()

        // Check if cache is valid
        if (
          state.states.length > 0 &&
          state.lastFetchedStates &&
          now - state.lastFetchedStates < state.cacheDuration
        ) {
          return
        }

        set({ isLoadingStates: true })

        try {
          const response = await fetch('/api/colombia-locations?type=states')
          if (!response.ok) throw new Error('Error loading states')
          
          const data = await response.json()
          
          set({
            states: data.data || [],
            lastFetchedStates: now,
            isLoadingStates: false,
          })
        } catch (error) {
          console.error('Error loading states:', error)
          set({ isLoadingStates: false })
          throw error
        }
      },

      loadCities: async (stateId: number) => {
        const state = get()
        const now = Date.now()

        // Check if cache is valid for this state
        const lastFetchedForState = state.lastFetchedCities?.[stateId]
        if (
          state.cities.length > 0 &&
          lastFetchedForState &&
          now - lastFetchedForState < state.cacheDuration
        ) {
          return
        }

        set({ isLoadingCities: true })

        try {
          const response = await fetch(`/api/colombia-locations?type=cities&state_id=${stateId}`)
          if (!response.ok) throw new Error('Error loading cities')
          
          const data = await response.json()
          
          set({
            cities: data.data || [],
            lastFetchedCities: {
              ...state.lastFetchedCities,
              [stateId]: now,
            },
            isLoadingCities: false,
          })
        } catch (error) {
          console.error('Error loading cities:', error)
          set({ isLoadingCities: false })
          throw error
        }
      },

      setSelectedState: (state) => {
        set({ 
          selectedState: state,
          selectedCity: null, // Reset selected city when state changes
          cities: [], // Clear cities when state changes
        })
      },

      setSelectedCity: (city) => set({ selectedCity: city }),

      reset: () => set({
        states: [],
        cities: [],
        selectedState: null,
        selectedCity: null,
        isLoadingStates: false,
        isLoadingCities: false,
        lastFetchedStates: null,
        lastFetchedCities: null,
      }),
    }),
    {
      name: 'colombia-locations-storage',
      partialize: (state) => ({
        states: state.states,
        lastFetchedStates: state.lastFetchedStates,
        lastFetchedCities: state.lastFetchedCities,
      }),
    }
  )
)