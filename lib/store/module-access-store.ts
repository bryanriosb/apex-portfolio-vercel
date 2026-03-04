import { create } from 'zustand'

interface ModuleAccessState {
  moduleAccess: Record<string, boolean>
  isLoaded: boolean
  setModuleAccess: (access: Record<string, boolean>) => void
  clearModuleAccess: () => void
}

export const useModuleAccessStore = create<ModuleAccessState>((set) => ({
  moduleAccess: {},
  isLoaded: false,
  setModuleAccess: (access) => set({ moduleAccess: access, isLoaded: true }),
  clearModuleAccess: () => set({ moduleAccess: {}, isLoaded: false }),
}))