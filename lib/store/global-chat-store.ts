import { create } from 'zustand'

interface GlobalChatState {
  isPanelOpen: boolean
  togglePanel: () => void
  openPanel: () => void
  closePanel: () => void
}

export const useGlobalChatStore = create<GlobalChatState>((set) => ({
  isPanelOpen: false,
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
}))
