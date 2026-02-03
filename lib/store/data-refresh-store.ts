import { create } from 'zustand'

interface DataRefreshState {
  // Almacenamiento de timestamps para cada tipo de dato
  refreshTriggers: Record<string, number>
  
  // Acciones
  triggerRefresh: (dataType: string) => void
  getLastRefresh: (dataType: string) => number | null
  shouldRefresh: (dataType: string, threshold?: number) => boolean
}

export const useDataRefreshStore = create<DataRefreshState>((set, get) => ({
  refreshTriggers: {},

  triggerRefresh: (dataType: string) => {
    const timestamp = Date.now()
    set((state) => ({
      refreshTriggers: {
        ...state.refreshTriggers,
        [dataType]: timestamp,
      },
    }))
  },

  getLastRefresh: (dataType: string) => {
    const state = get()
    return state.refreshTriggers[dataType] || null
  },

  shouldRefresh: (dataType: string, threshold = 1000) => {
    const state = get()
    const lastRefresh = state.refreshTriggers[dataType]
    if (!lastRefresh) return true
    
    return Date.now() - lastRefresh < threshold
  },
}))