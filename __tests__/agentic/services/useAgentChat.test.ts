import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAgentChat } from '@/lib/services/agent/useAgentChat'
import type { AgentState } from '@/lib/services/agent/types'

// Store for mock instances
let mockAgentServiceInstance: {
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  send: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  clear: ReturnType<typeof vi.fn>
  setMessages: ReturnType<typeof vi.fn>
  setConversation: ReturnType<typeof vi.fn>
  getState: ReturnType<typeof vi.fn>
  callbacks: { onStateChange: (state: AgentState) => void; onSessionCreated?: (sessionId: string) => void }
} | null = null

let mockSessionServiceInstance: {
  getSession: ReturnType<typeof vi.fn>
  listSessions: ReturnType<typeof vi.fn>
  deleteSession: ReturnType<typeof vi.fn>
} | null = null

// Mock AgentService - must use function keyword for constructor
vi.mock('@/lib/services/agent/AgentService', () => ({
  AgentService: function(callbacks: unknown) {
    mockAgentServiceInstance = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      send: vi.fn().mockReturnValue(true),
      stop: vi.fn(),
      clear: vi.fn(),
      setMessages: vi.fn(),
      setConversation: vi.fn(),
      getState: vi.fn(),
      callbacks: callbacks as { onStateChange: (state: AgentState) => void; onSessionCreated?: (sessionId: string) => void },
    }
    return mockAgentServiceInstance
  },
}))

// Mock SessionService - must use function keyword for constructor
vi.mock('@/lib/services/session/SessionService', () => ({
  SessionService: function() {
    mockSessionServiceInstance = {
      getSession: vi.fn(),
      listSessions: vi.fn(),
      deleteSession: vi.fn(),
    }
    return mockSessionServiceInstance
  },
}))

// Helper to get the mock instance
function getMockAgentService() {
  return mockAgentServiceInstance
}

// Helper to get the mock session service
function getMockSessionService() {
  return mockSessionServiceInstance
}

describe('useAgentChat Hook', () => {
  const defaultOptions = {
    wsUrl: 'ws://test.example.com',
    agentId: 'test-agent',
    userId: 'test-user',
    appName: 'test-app',
    apiBaseUrl: 'https://api.example.com',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAgentServiceInstance = null
    mockSessionServiceInstance = null
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAgentChat(defaultOptions))

      expect(result.current.messages).toEqual([])
      expect(result.current.isStreaming).toBe(false)
      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.currentContent).toBe('')
      expect(result.current.currentReasoning).toBe('')
      expect(result.current.sessionId).toBeNull()
    })

    it('should initialize with initial messages', () => {
      const initialMessages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: 'Hello',
          createdAt: new Date(),
        },
      ]

      const { result } = renderHook(() =>
        useAgentChat({ ...defaultOptions, initialMessages })
      )

      expect(result.current.messages).toEqual(initialMessages)
    })

    it('should initialize with initial sessionId', () => {
      const { result } = renderHook(() =>
        useAgentChat({ ...defaultOptions, sessionId: 'session-123' })
      )

      expect(result.current.sessionId).toBe('session-123')
    })

    it('should create AgentService on mount', () => {
      renderHook(() => useAgentChat(defaultOptions))

      expect(getMockAgentService()).not.toBeNull()
    })

    it('should create SessionService when apiBaseUrl is provided', () => {
      renderHook(() => useAgentChat(defaultOptions))

      expect(getMockSessionService()).not.toBeNull()
    })

    it('should not create SessionService when apiBaseUrl is not provided', () => {
      vi.clearAllMocks()

      const optionsWithoutApi = { ...defaultOptions }
      delete optionsWithoutApi.apiBaseUrl

      renderHook(() => useAgentChat(optionsWithoutApi))

      // SessionService should not be created when no apiBaseUrl
      expect(getMockSessionService()).toBeNull()
    })
  })

  describe('connect method', () => {
    it('should call AgentService.connect with correct parameters', () => {
      const { result } = renderHook(() => useAgentChat(defaultOptions))

      act(() => {
        result.current.connect()
      })

      const mockService = getMockAgentService()
      expect(mockService.connect).toHaveBeenCalledWith(
        defaultOptions.wsUrl,
        defaultOptions.agentId
      )
    })
  })

  describe('disconnect method', () => {
    it('should call AgentService.disconnect', () => {
      const { result } = renderHook(() => useAgentChat(defaultOptions))

      act(() => {
        result.current.disconnect()
      })

      const mockService = getMockAgentService()
      expect(mockService.disconnect).toHaveBeenCalled()
    })
  })

  describe('reconnect method', () => {
    it('should call disconnect then connect', () => {
      const { result } = renderHook(() => useAgentChat(defaultOptions))

      act(() => {
        result.current.reconnect()
      })

      const mockService = getMockAgentService()
      expect(mockService.disconnect).toHaveBeenCalled()
      expect(mockService.connect).toHaveBeenCalledWith(
        defaultOptions.wsUrl,
        defaultOptions.agentId
      )
    })
  })

  describe('send method', () => {
    it('should call AgentService.send with correct parameters', () => {
      const { result } = renderHook(() => useAgentChat(defaultOptions))

      act(() => {
        result.current.send('Hello, agent!')
      })

      const mockService = getMockAgentService()
      expect(mockService.send).toHaveBeenCalledWith({
        content: 'Hello, agent!',
        userId: defaultOptions.userId,
        sessionId: undefined,
        model: undefined,
        baseUrl: undefined,
        provider: undefined,
      })
    })

    it('should use default model when provided', () => {
      const { result } = renderHook(() =>
        useAgentChat({ ...defaultOptions, model: 'gpt-4' })
      )

      act(() => {
        result.current.send('Hello')
      })

      const mockService = getMockAgentService()
      expect(mockService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
        })
      )
    })

    it('should override default model when specified in send', () => {
      const { result } = renderHook(() =>
        useAgentChat({ ...defaultOptions, model: 'gpt-4' })
      )

      act(() => {
        result.current.send('Hello', 'claude-3')
      })

      const mockService = getMockAgentService()
      expect(mockService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3',
        })
      )
    })

    it('should use default baseUrl when provided', () => {
      const { result } = renderHook(() =>
        useAgentChat({ ...defaultOptions, baseUrl: 'https://custom.api' })
      )

      act(() => {
        result.current.send('Hello')
      })

      const mockService = getMockAgentService()
      expect(mockService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'https://custom.api',
        })
      )
    })

    it('should return the result from AgentService.send', () => {
      const { result } = renderHook(() => useAgentChat(defaultOptions))

      let sendResult: boolean = false
      act(() => {
        sendResult = result.current.send('Hello')
      })

      expect(sendResult).toBe(true)
    })

    it('should store last user message for regenerate', () => {
      const { result } = renderHook(() => useAgentChat(defaultOptions))

      act(() => {
        result.current.send('First message')
      })

      act(() => {
        result.current.send('Second message')
      })

      // The last message should be stored internally
      // We'll verify this in the regenerate test
      const mockService = getMockAgentService()
      expect(mockService.send).toHaveBeenCalledTimes(2)
    })
  })

  describe('stop method', () => {
    it('should call AgentService.stop', () => {
      const { result } = renderHook(() => useAgentChat(defaultOptions))

      act(() => {
        result.current.stop()
      })

      const mockService = getMockAgentService()
      expect(mockService.stop).toHaveBeenCalled()
    })
  })

  describe('clear method', () => {
    it('should call AgentService.clear', () => {
      const { result } = renderHook(() => useAgentChat(defaultOptions))

      act(() => {
        result.current.clear()
      })

      const mockService = getMockAgentService()
      expect(mockService.clear).toHaveBeenCalled()
    })
  })

  describe('regenerate method', () => {
    it('should not regenerate if no previous message', () => {
      const { result } = renderHook(() => useAgentChat(defaultOptions))

      act(() => {
        result.current.regenerate()
      })

      // Should not call send since there's no last message
      const mockService = getMockAgentService()
      expect(mockService.send).not.toHaveBeenCalled()
    })

    it('should not regenerate if currently streaming', () => {
      const { result } = renderHook(() => useAgentChat(defaultOptions))

      // Send a message first
      act(() => {
        result.current.send('Test message')
      })

      const mockService = getMockAgentService()
      vi.clearAllMocks()

      // Simulate streaming state
      act(() => {
        mockService.callbacks.onStateChange({
          ...result.current,
          isStreaming: true,
        })
      })

      act(() => {
        result.current.regenerate()
      })

      // Should not send again while streaming
      expect(mockService.send).not.toHaveBeenCalled()
    })

    it('should resend last message when not streaming', async () => {
      const { result } = renderHook(() => useAgentChat(defaultOptions))

      // Send initial message
      act(() => {
        result.current.send('Test message')
      })

      const mockService = getMockAgentService()
      vi.clearAllMocks()

      // Regenerate
      act(() => {
        result.current.regenerate()
      })

      // Wait for setTimeout to complete
      await waitFor(() => {
        const mockService = getMockAgentService()
        expect(mockService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'Test message',
          })
        )
      })
    })
  })

  describe('setSessionId method', () => {
    it('should set sessionId to null and clear messages', async () => {
      const { result } = renderHook(() => useAgentChat(defaultOptions))

      await act(async () => {
        await result.current.setSessionId(null)
      })

      const mockService = getMockAgentService()
      expect(mockService.setConversation).toHaveBeenCalledWith(null, [])
    })

    it('should load session messages when sessionId is provided', async () => {
      const mockSession = {
        session_id: 'session-123',
        app_name: 'test-app',
        user_id: 'test-user',
        state: {},
        events: [
          {
            id: 'event-1',
            author: 'user',
            timestamp: '2024-01-01T00:00:00Z',
            content: 'Hello',
          },
          {
            id: 'event-2',
            author: 'assistant',
            timestamp: '2024-01-01T00:00:01Z',
            content: 'Hi there!',
          },
        ],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:01Z',
      }

      const mockSessionService = getMockSessionService()
      mockSessionService.getSession.mockResolvedValue(mockSession)

      const { result } = renderHook(() => useAgentChat(defaultOptions))

      await act(async () => {
        await result.current.setSessionId('session-123')
      })

      expect(mockSessionService.getSession).toHaveBeenCalledWith(
        'session-123',
        defaultOptions.userId,
        defaultOptions.appName
      )

      const mockService = getMockAgentService()
      expect(mockService.setConversation).toHaveBeenCalledWith(
        'session-123',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'event-1',
            role: 'user',
            content: 'Hello',
          }),
          expect.objectContaining({
            id: 'event-2',
            role: 'assistant',
            content: 'Hi there!',
          }),
        ])
      )
    })

    it('should handle session load failure gracefully', async () => {
      const mockSessionService = getMockSessionService()
      mockSessionService.getSession.mockRejectedValue(
        new Error('Failed to load session')
      )

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useAgentChat(defaultOptions))

      await act(async () => {
        await result.current.setSessionId('session-123')
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load session messages:',
        expect.any(Error)
      )

      // Should still set the session ID with empty messages
      const mockService = getMockAgentService()
      expect(mockService.setConversation).toHaveBeenCalledWith('session-123', [])

      consoleErrorSpy.mockRestore()
    })

    it('should not load session if no apiBaseUrl provided', async () => {
      const optionsWithoutApi = { ...defaultOptions }
      delete optionsWithoutApi.apiBaseUrl

      const { result } = renderHook(() => useAgentChat(optionsWithoutApi))

      await act(async () => {
        await result.current.setSessionId('session-123')
      })

      const mockSessionService = getMockSessionService()
      expect(mockSessionService.getSession).not.toHaveBeenCalled()
      const mockService = getMockAgentService()
      expect(mockService.setConversation).toHaveBeenCalledWith('session-123', [])
    })
  })

  describe('state updates from AgentService', () => {
    it('should update state when AgentService calls onStateChange', () => {
      const { result } = renderHook(() => useAgentChat(defaultOptions))

      const newState: AgentState = {
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Hello',
            createdAt: new Date(),
          },
        ],
        isStreaming: true,
        isConnected: true,
        error: null,
        currentContent: 'Thinking...',
        currentReasoning: 'Processing...',
        sessionId: 'session-123',
      }

      act(() => {
        const mockService = getMockAgentService()
        mockService.callbacks.onStateChange(newState)
      })

      expect(result.current.messages).toEqual(newState.messages)
      expect(result.current.isStreaming).toBe(true)
      expect(result.current.isConnected).toBe(true)
      expect(result.current.currentContent).toBe('Thinking...')
      expect(result.current.currentReasoning).toBe('Processing...')
      expect(result.current.sessionId).toBe('session-123')
    })

    it('should update sessionId when AgentService calls onSessionCreated', () => {
      const { result } = renderHook(() => useAgentChat(defaultOptions))

      act(() => {
        const mockService = getMockAgentService()
        mockService.callbacks.onSessionCreated('new-session-123')
      })

      expect(result.current.sessionId).toBe('new-session-123')
    })
  })

  describe('cleanup', () => {
    it('should disconnect on unmount', () => {
      const { unmount } = renderHook(() => useAgentChat(defaultOptions))

      unmount()

      const mockService = getMockAgentService()
      expect(mockService.disconnect).toHaveBeenCalled()
    })
  })

  describe('exposed methods', () => {
    it('should expose all required methods', () => {
      const { result } = renderHook(() => useAgentChat(defaultOptions))

      expect(typeof result.current.send).toBe('function')
      expect(typeof result.current.stop).toBe('function')
      expect(typeof result.current.clear).toBe('function')
      expect(typeof result.current.connect).toBe('function')
      expect(typeof result.current.disconnect).toBe('function')
      expect(typeof result.current.reconnect).toBe('function')
      expect(typeof result.current.regenerate).toBe('function')
      expect(typeof result.current.setSessionId).toBe('function')
    })
  })
})
