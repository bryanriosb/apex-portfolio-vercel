import { WebSocketService } from '@/lib/services/websocket/WebSocketService'
import type { ConnectionStatus, ReconnectionOptions, WebSocketOutgoingMessage } from '@/lib/services/websocket/WebSocketService'
import type {
  AgentState,
  ChatMessage,
  SendMessageOptions,
  AgentCallbacks,
  WebSocketIncomingMessage,
} from './types'

export interface AgentServiceOptions {
  urlBuilder: () => string | Promise<string>
  reconnection?: Partial<ReconnectionOptions>
}

export class AgentService {
  private wsService: WebSocketService | null = null
  private state: AgentState
  private callbacks: AgentCallbacks
  private options: AgentServiceOptions
  private messageIdCounter = 0
  private isWorkflow = false
  private workflowDefinitionId: string | null = null
  private rawStreamContent = ''
  private accumulatedContent = ''
  private currentNodeId: string | null = null

  constructor(callbacks: AgentCallbacks, options: AgentServiceOptions, isWorkflow: boolean = false) {
    this.callbacks = callbacks
    this.options = options
    this.isWorkflow = isWorkflow
    this.state = {
      messages: [],
      isStreaming: false,
      isConnected: false,
      error: null,
      currentContent: '',
      currentReasoning: '',
      sessionId: null,
      reconnectAttempt: 0,
      reconnectCountdown: 0,
      maxRetries: this.getMaxRetries(),
    }
  }

  getState(): AgentState {
    return { ...this.state }
  }

  getConnectionStatus(): ConnectionStatus {
    return this.wsService?.getStatus() ?? 'disconnected'
  }

  getReconnectAttempt(): number {
    return this.wsService?.getReconnectAttempt() ?? 0
  }

  getReconnectCountdown(): number {
    return this.wsService?.getReconnectCountdown() ?? 0
  }

  getMaxRetries(): number {
    return this.wsService?.getMaxRetries() ?? 0
  }

  async connect(agentId: string, userId: string): Promise<void> {
    if (this.wsService?.isConnected) {
      return
    }

    // Ensure any previous stuck/disconnected service is cleaned up before creating a new one.
    this.disconnect()

    if (this.isWorkflow) {
      this.workflowDefinitionId = agentId
    }

    this.wsService = new WebSocketService({
      urlBuilder: this.options.urlBuilder,
      callbacks: {
        onOpen: () => {
          this.updateState({ isConnected: true, error: null, reconnectAttempt: 0, reconnectCountdown: 0 })
        },
        onClose: () => {
          this.updateState({ isConnected: false, isStreaming: false })
        },
        onMessage: (data) => this.handleMessage(data),
        onError: () => {
          this.updateState({ error: 'Connection error', isConnected: false })
        },
        onStatusChange: (status: ConnectionStatus) => {
          if (status === 'reconnecting' || status === 'connecting') {
            this.updateState({ isConnected: false })
          }
        },
        onReconnectAttempt: (attempt: number, countdown: number) => {
          this.updateState({ reconnectAttempt: attempt, reconnectCountdown: countdown, maxRetries: this.getMaxRetries() })
        },
      },
      heartbeatInterval: 30000,
      reconnection: this.options.reconnection,
    })

    this.wsService.connect()
  }

  disconnect(): void {
    if (this.wsService) {
      this.wsService.disconnect()
      this.wsService = null
      this.updateState({ isConnected: false })
    }
  }

  send(options: SendMessageOptions): boolean {
    if (!this.wsService?.isConnected) {
      return false
    }

    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: options.content,
      createdAt: new Date(),
    }

    this.state.messages.push(userMessage)
    this.updateState({
      messages: [...this.state.messages],
      isStreaming: true,
      currentContent: '',
      currentReasoning: '',
      error: null,
    })
    this.rawStreamContent = ''
    this.accumulatedContent = ''
    this.currentNodeId = this.isWorkflow ? 'conversational-orchestrator' : null

    const message: WebSocketOutgoingMessage = this.isWorkflow && this.workflowDefinitionId
      ? {
          type: 'workflow_start',
          payload: {
            workflow_definition_id: this.workflowDefinitionId,
            user_id: options.userId,
            input_state: { input: options.content },
            ...(options.sessionId && { thread_id: options.sessionId }),
          },
        }
      : {
          type: 'query_stream',
          payload: {
            content: options.content,
            user_id: options.userId,
            ...(options.sessionId && { session_id: options.sessionId }),
            ...(options.model && { model: options.model }),
            ...(options.baseUrl && { base_url: options.baseUrl }),
            ...(options.provider && { provider: options.provider }),
            ...(options.provider_options && {
              provider_options: options.provider_options,
            }),
          },
        }

    this.wsService.send(message)
    return true
  }

  stop(): void {
    this.updateState({ isStreaming: false })
  }

  clear(): void {
    this.setConversation(null, [])
  }

  setMessages(messages: ChatMessage[]): void {
    this.setConversation(this.state.sessionId, messages)
  }

  setConversation(sessionId: string | null, messages: ChatMessage[]): void {
    this.rawStreamContent = ''
    this.accumulatedContent = ''
    this.updateState({
      sessionId,
      messages: [...messages],
      isStreaming: false,
      currentContent: '',
      currentReasoning: '',
      error: null,
    })
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketIncomingMessage = JSON.parse(data)

      switch (message.type) {
        case 'workflow_node_start':
          // Lock in the previous nodes' output
          this.accumulatedContent = this.state.currentContent
          this.rawStreamContent = ''
          this.currentNodeId = message.payload.node_id
          break

        case 'workflow_node_end':
          // Clear current node when it ends
          if (this.currentNodeId === message.payload.node_id) {
            this.currentNodeId = null
          }
          break

        case 'chunk': {
          if (this.isWorkflow) {
            if (this.currentNodeId === 'conversational-orchestrator') {
              // Ignore the orchestrator's output completely as it's purely for JSON routing
              break
            }

            this.rawStreamContent += message.payload.content
            const extracted = this.rawStreamContent

            // Append the new node's output to any previous accumulated output
            if (this.accumulatedContent) {
              // If we already have accumulated text and the new text is not empty, separate with newlines
              const suffix = extracted.trim() ? '\n\n' + extracted : extracted
              this.state.currentContent = this.accumulatedContent + suffix
            } else {
              this.state.currentContent = extracted
            }
          } else {
            this.state.currentContent += message.payload.content
          }
          this.updateState({ currentContent: this.state.currentContent })
          break
        }

        case 'reasoning_delta':
          this.state.currentReasoning += message.payload.content
          this.updateState({ currentReasoning: this.state.currentReasoning })
          break

        case 'session':
          this.updateState({ sessionId: message.payload.session_id })
          this.callbacks.onSessionCreated?.(message.payload.session_id)
          break

        case 'done':
          this.updateState({ sessionId: message.payload.session_id })
          this.finalizeMessage()
          break

        case 'pong':
          break

        case 'ping':
          break
      }
    } catch (e) {
      console.error('Failed to parse message:', e)
    }
  }

  private finalizeMessage(): void {
    const assistantMessage: ChatMessage = {
      id: this.generateId(),
      role: 'assistant',
      content: this.state.currentContent,
      reasoning: this.state.currentReasoning || undefined,
      createdAt: new Date(),
    }

    this.state.messages.push(assistantMessage)
    this.updateState({
      messages: [...this.state.messages],
      isStreaming: false,
      currentContent: '',
      currentReasoning: '',
    })
  }

  private updateState(partial: Partial<AgentState>): void {
    this.state = { ...this.state, ...partial }
    this.callbacks.onStateChange(this.getState())
  }

  private generateId(): string {
    return `msg_${Date.now()}_${++this.messageIdCounter}`
  }
}
