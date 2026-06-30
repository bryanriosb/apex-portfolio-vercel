import { create } from 'zustand'

type ReconnectFn = () => void | Promise<void>

interface WebSocketReconnectionState {
  channels: Record<string, ReconnectFn | undefined>
  registerChannel: (channel: string, reconnect: ReconnectFn) => void
  unregisterChannel: (channel: string) => void
  reconnectAll: () => void
  reconnectChannel: (channel: string) => void
}

export const useWebSocketReconnectionStore = create<WebSocketReconnectionState>((set, get) => ({
  channels: {},
  registerChannel: (channel, reconnect) => {
    set((state) => ({
      channels: { ...state.channels, [channel]: reconnect },
    }))
  },
  unregisterChannel: (channel) => {
    set((state) => {
      const { [channel]: _, ...rest } = state.channels
      return { channels: rest }
    })
  },
  reconnectAll: () => {
    const { channels } = get()
    Object.values(channels).forEach((reconnect) => {
      if (reconnect) reconnect()
    })
  },
  reconnectChannel: (channel) => {
    const reconnect = get().channels[channel]
    if (reconnect) reconnect()
  },
}))
