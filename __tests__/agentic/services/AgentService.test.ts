import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import type { AgentState, ChatMessage, AgentCallbacks } from '@/lib/services/agent/types'

vi.mock('@/lib/actions/api/auth-ticket', () => ({
  getAuthTicket: vi.fn().mockResolvedValue({ ticket: 'test-ticket-123', expires_in: 30 }),
}))

// Mock WebSocketService module before importing AgentService
const mockCallbacks = {
  onOpen: vi.fn(),
  onClose: vi.fn(),
  onMessage: vi.fn(),
  onError: vi.fn(),
  onStatusChange: vi.fn(),
  onReconnectAttempt: vi.fn(),
}

let mockConnected = false

vi.mock('@/lib/services/websocket/WebSocketService', () => ({
  WebSocketService: vi.fn().mockImplementation(function (this: any, config: any) {
    mockConnected = false
    this._config = config
    this.isConnected = false
    this.connect = vi.fn(() => {
      mockConnected = true
      this.isConnected = true
      config.callbacks.onOpen()
    })
    this.disconnect = vi.fn(() => {
      mockConnected = false
      this.isConnected = false
      config.callbacks.onClose()
    })
    this.send = vi.fn()
    this.startHeartbeat = vi.fn()
    this.stopHeartbeat = vi.fn()
    this.sendPing = vi.fn()
    this.getStatus = vi.fn().mockReturnValue('connected')
    this.getReconnectAttempt = vi.fn().mockReturnValue(0)
    this.getReconnectCountdown = vi.fn().mockReturnValue(0)
    this.getMaxRetries = vi.fn().mockReturnValue(10)
  }),
}))

// Import AgentService after mocking
import { AgentService } from '@/lib/services/agent/AgentService'

/**
 * Property 1: Message ID Generation Uniqueness
 * Validates: Requirements 4.6
 *
 * For any sequence of message generation calls within an AgentService instance,
 * all generated message IDs SHALL be unique.
 */
describe('AgentService - Property 1: Message ID Generation Uniqueness', () => {
  let agentService: AgentService
  let stateHistory: AgentState[]

  beforeEach(() => {
    stateHistory = []
    const callbacks: AgentCallbacks = {
      onStateChange: (state) => {
        stateHistory.push(state)
      },
    }
    agentService = new AgentService(callbacks, {
      urlBuilder: async () => 'ws://test',
      reconnection: { maxRetries: 6, countdownSeconds: 6 },
    })
  })

    it('should generate unique IDs for all messages across multiple send operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 50 }),
        async (messages) => {
          stateHistory = []
          const localCallbacks: AgentCallbacks = {
            onStateChange: (state) => {
              stateHistory.push(state)
            },
          }
          const localService = new AgentService(localCallbacks, {
            urlBuilder: async () => 'ws://test',
            reconnection: { maxRetries: 6, countdownSeconds: 6 },
          })
          await localService.connect('test-agent', 'test-user')

          const messageIds: string[] = []

          messages.forEach((content, index) => {
            const result = localService.send({
              content,
              userId: `user-${index}`,
            })

            if (result) {
              const state = localService.getState()
              const lastMessage = state.messages[state.messages.length - 1]
              if (lastMessage) {
                messageIds.push(lastMessage.id)
              }
            }
          })

          const uniqueIds = new Set(messageIds)
          expect(uniqueIds.size).toBe(messageIds.length)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should generate unique IDs when messages are created rapidly in succession', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 100 }),
        async (messageCount) => {
          stateHistory = []
          const localCallbacks: AgentCallbacks = {
            onStateChange: (state) => {
              stateHistory.push(state)
            },
          }
          const localService = new AgentService(localCallbacks, {
            urlBuilder: async () => 'ws://test',
            reconnection: { maxRetries: 6, countdownSeconds: 6 },
          })
          await localService.connect('test-agent', 'test-user')

          const messageIds: string[] = []

          for (let i = 0; i < messageCount; i++) {
            localService.send({
              content: `Message ${i}`,
              userId: 'test-user',
            })
          }

          const state = localService.getState()
          state.messages.forEach((msg) => {
            messageIds.push(msg.id)
          })

          const uniqueIds = new Set(messageIds)
          expect(uniqueIds.size).toBe(messageIds.length)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should generate IDs that follow the expected format pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (content) => {
          stateHistory = []
          const localCallbacks: AgentCallbacks = {
            onStateChange: (state) => {
              stateHistory.push(state)
            },
          }
          const localService = new AgentService(localCallbacks, {
            urlBuilder: async () => 'ws://test',
            reconnection: { maxRetries: 6, countdownSeconds: 6 },
          })
          await localService.connect('test-agent', 'test-user')

          localService.send({
            content,
            userId: 'test-user',
          })

          const state = localService.getState()
          const lastMessage = state.messages[state.messages.length - 1]

          expect(lastMessage.id).toMatch(/^msg_\d+_\d+$/)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Property 3: Message State Consistency
 * Validates: Requirements 6.2
 *
 * For any agent state transition, the messages array SHALL maintain
 * chronological order by createdAt timestamp.
 */
describe('AgentService - Property 3: Message State Consistency', () => {
  let agentService: AgentService
  let stateHistory: AgentState[]

  beforeEach(() => {
    stateHistory = []
    const callbacks: AgentCallbacks = {
      onStateChange: (state) => {
        stateHistory.push(state)
      },
    }
    agentService = new AgentService(callbacks, {
      urlBuilder: async () => 'ws://test',
      reconnection: { maxRetries: 6, countdownSeconds: 6 },
    })
  })

  it('should maintain chronological order of messages after multiple send operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            content: fc.string({ minLength: 1, maxLength: 100 }),
            delay: fc.integer({ min: 0, max: 10 }),
          }),
          { minLength: 2, maxLength: 20 }
        ),
        async (messages) => {
          stateHistory = []
          const localCallbacks: AgentCallbacks = {
            onStateChange: (state) => {
              stateHistory.push(state)
            },
          }
          const localService = new AgentService(localCallbacks, {
            urlBuilder: async () => 'ws://test',
            reconnection: { maxRetries: 6, countdownSeconds: 6 },
          })
          await localService.connect('test-agent', 'test-user')

          messages.forEach((msg, index) => {
            localService.send({
              content: msg.content,
              userId: `user-${index}`,
            })
          })

          const state = localService.getState()
          const timestamps = state.messages.map((m) => m.createdAt.getTime())

          for (let i = 1; i < timestamps.length; i++) {
            expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1])
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should maintain message order after setMessages operation', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            content: fc.string({ minLength: 1, maxLength: 100 }),
            timestamp: fc.date(),
          }),
          { minLength: 2, maxLength: 20 }
        ),
        (messageData) => {
          stateHistory = []
          const localCallbacks: AgentCallbacks = {
            onStateChange: (state) => {
              stateHistory.push(state)
            },
          }
          const localService = new AgentService(localCallbacks, {
            urlBuilder: async () => 'ws://test',
            reconnection: { maxRetries: 6, countdownSeconds: 6 },
          })

          // Create messages with specific timestamps
          const messages: ChatMessage[] = messageData.map((data, index) => ({
            id: data.id,
            role: 'user' as const,
            content: data.content,
            createdAt: data.timestamp,
          }))

          // Sort by timestamp to create expected order
          const sortedMessages = [...messages].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
          )

          localService.setMessages(sortedMessages)

          const state = localService.getState()

          // Verify order is maintained
          expect(state.messages.length).toBe(sortedMessages.length)
          for (let i = 0; i < state.messages.length; i++) {
            expect(state.messages[i].id).toBe(sortedMessages[i].id)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should maintain chronological order after setConversation operation', () => {
    fc.assert(
      fc.property(
        fc.record({
          sessionId: fc.string({ minLength: 1 }),
          messages: fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              content: fc.string({ minLength: 1, maxLength: 100 }),
              role: fc.constantFrom('user', 'assistant') as fc.Arbitrary<'user' | 'assistant'>,
              timestamp: fc.date(),
            }),
            { minLength: 2, maxLength: 20 }
          ),
        }),
        (data) => {
          stateHistory = []
          const localCallbacks: AgentCallbacks = {
            onStateChange: (state) => {
              stateHistory.push(state)
            },
          }
          const localService = new AgentService(localCallbacks, {
            urlBuilder: async () => 'ws://test',
            reconnection: { maxRetries: 6, countdownSeconds: 6 },
          })

          // Create messages with specific timestamps
          const messages: ChatMessage[] = data.messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            createdAt: msg.timestamp,
          }))

          // Sort by timestamp
          const sortedMessages = [...messages].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
          )

          localService.setConversation(data.sessionId, sortedMessages)

          const state = localService.getState()

          // Verify chronological order is maintained
          const timestamps = state.messages.map((m) => m.createdAt.getTime())
          for (let i = 1; i < timestamps.length; i++) {
            expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1])
          }

          // Verify session ID is set
          expect(state.sessionId).toBe(data.sessionId)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve message order when interleaving send and setMessages operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            content: fc.string({ minLength: 1, maxLength: 50 }),
            operation: fc.constantFrom('send', 'setMessages') as fc.Arbitrary<'send' | 'setMessages'>,
          }),
          { minLength: 3, maxLength: 15 }
        ),
        async (operations) => {
          stateHistory = []
          const localCallbacks: AgentCallbacks = {
            onStateChange: (state) => {
              stateHistory.push(state)
            },
          }
          const localService = new AgentService(localCallbacks, {
            urlBuilder: async () => 'ws://test',
            reconnection: { maxRetries: 6, countdownSeconds: 6 },
          })
          await localService.connect('test-agent', 'test-user')

          let messageCounter = 0

          operations.forEach((op) => {
            if (op.operation === 'send') {
              localService.send({
                content: op.content,
                userId: 'test-user',
              })
            } else {
              const newMessage: ChatMessage = {
                id: `set-msg-${messageCounter++}`,
                role: 'user',
                content: op.content,
                createdAt: new Date(),
              }
              const currentMessages = localService.getState().messages
              localService.setMessages([...currentMessages, newMessage])
            }
          })

          const state = localService.getState()

          const timestamps = state.messages.map((m) => m.createdAt.getTime())
          for (let i = 1; i < timestamps.length; i++) {
            expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1])
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should maintain message state consistency after clear operation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
        async (contents) => {
          stateHistory = []
          const localCallbacks: AgentCallbacks = {
            onStateChange: (state) => {
              stateHistory.push(state)
            },
          }
          const localService = new AgentService(localCallbacks, {
            urlBuilder: async () => 'ws://test',
            reconnection: { maxRetries: 6, countdownSeconds: 6 },
          })
          await localService.connect('test-agent', 'test-user')

          contents.forEach((content) => {
            localService.send({
              content,
              userId: 'test-user',
            })
          })

          localService.clear()

          const state = localService.getState()

          expect(state.messages).toHaveLength(0)
          expect(state.sessionId).toBeNull()
          expect(state.isStreaming).toBe(false)
          expect(state.currentContent).toBe('')
          expect(state.currentReasoning).toBe('')
          expect(state.error).toBeNull()

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Additional unit tests for AgentService
 */
describe('AgentService - Unit Tests', () => {
  let agentService: AgentService
  let stateHistory: AgentState[]

  beforeEach(() => {
    stateHistory = []
    const callbacks: AgentCallbacks = {
      onStateChange: (state) => {
        stateHistory.push(state)
      },
    }
    agentService = new AgentService(callbacks, {
      urlBuilder: async () => 'ws://test',
      reconnection: { maxRetries: 6, countdownSeconds: 6 },
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = agentService.getState()

      expect(state.messages).toEqual([])
      expect(state.isStreaming).toBe(false)
      expect(state.isConnected).toBe(false)
      expect(state.error).toBeNull()
      expect(state.currentContent).toBe('')
      expect(state.currentReasoning).toBe('')
      expect(state.sessionId).toBeNull()
    })
  })

  describe('connect', () => {
    it('should update connection state on connect', async () => {
      await agentService.connect('test-agent', 'test-user')

      // The mock WebSocketService immediately sets isConnected to true
      // We need to verify the state reflects this
      const state = agentService.getState()
      // Note: The actual WebSocketService mock calls onOpen which sets isConnected
      expect(state.isConnected).toBe(true)
    })
  })

  describe('disconnect', () => {
    it('should update connection state on disconnect', async () => {
      await agentService.connect('test-agent', 'test-user')
      agentService.disconnect()

      const state = agentService.getState()
      expect(state.isConnected).toBe(false)
    })
  })

  describe('send', () => {
    it('should return false when not connected', () => {
      const result = agentService.send({
        content: 'test message',
        userId: 'test-user',
      })

      expect(result).toBe(false)
    })

    it('should add user message to messages array when connected', async () => {
      await agentService.connect('test-agent', 'test-user')

      const result = agentService.send({
        content: 'test message',
        userId: 'test-user',
      })

      expect(result).toBe(true)

      const state = agentService.getState()
      expect(state.messages).toHaveLength(1)
      expect(state.messages[0].role).toBe('user')
      expect(state.messages[0].content).toBe('test message')
    })

    it('should set isStreaming to true when sending', async () => {
      await agentService.connect('test-agent', 'test-user')

      agentService.send({
        content: 'test message',
        userId: 'test-user',
      })

      const state = agentService.getState()
      expect(state.isStreaming).toBe(true)
    })
  })

  describe('stop', () => {
    it('should set isStreaming to false', async () => {
      await agentService.connect('test-agent', 'test-user')
      agentService.send({
        content: 'test message',
        userId: 'test-user',
      })

      agentService.stop()

      const state = agentService.getState()
      expect(state.isStreaming).toBe(false)
    })
  })

  describe('setMessages', () => {
    it('should replace messages array', () => {
      const newMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          createdAt: new Date(),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          createdAt: new Date(),
        },
      ]

      agentService.setMessages(newMessages)

      const state = agentService.getState()
      expect(state.messages).toHaveLength(2)
      expect(state.messages[0].id).toBe('msg-1')
      expect(state.messages[1].id).toBe('msg-2')
    })
  })

  describe('setConversation', () => {
    it('should set both sessionId and messages', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          createdAt: new Date(),
        },
      ]

      agentService.setConversation('session-123', messages)

      const state = agentService.getState()
      expect(state.sessionId).toBe('session-123')
      expect(state.messages).toHaveLength(1)
    })
  })

  describe('heartbeat message handling', () => {
    it('should handle pong messages without errors', () => {
      const pongMessage = JSON.stringify({ type: 'pong' })

      // Simulate receiving a pong message
      expect(() => {
        // Access private handleMessage via any cast for testing
        (agentService as any).handleMessage(pongMessage)
      }).not.toThrow()

      // State should remain unchanged
      const state = agentService.getState()
      expect(state.messages).toHaveLength(0)
      expect(state.isStreaming).toBe(false)
    })

    it('should handle ping messages without errors', () => {
      const pingMessage = JSON.stringify({ type: 'ping' })

      expect(() => {
        (agentService as any).handleMessage(pingMessage)
      }).not.toThrow()

      const state = agentService.getState()
      expect(state.messages).toHaveLength(0)
    })

    it('should not affect streaming state when receiving pong', async () => {
      await agentService.connect('test-agent', 'test-user')

      agentService.send({
        content: 'test message',
        userId: 'test-user',
      })

      const stateBefore = agentService.getState()
      expect(stateBefore.isStreaming).toEqual(true)

      // Simulate receiving pong during streaming
      ;(agentService as any).handleMessage(JSON.stringify({ type: 'pong' }))

      const stateAfter = agentService.getState()
      expect(stateAfter.isStreaming).toEqual(true)
    })
  })
})
