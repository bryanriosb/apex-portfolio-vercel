import { WebSocketService } from '@/lib/services/websocket/WebSocketService'
import type { ConnectionStatus, ReconnectionOptions, WebSocketOutgoingMessage } from '@/lib/services/websocket/WebSocketService'
import { normalizeToolType } from '@/lib/utils/tool-type'
import type { Component, UiEvent } from '@zavora-ai/adk-ui-react'
import type {
  AgentState,
  ChatMessage,
  SendMessageOptions,
  AgentCallbacks,
  WebSocketIncomingMessage,
  ToolCallData,
  SkillInfo,
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
  private accumulatedUiComponents: Component[] | null = null
  private accumulatedUiTheme: 'light' | 'dark' | 'system' | undefined = undefined
  private accumulatedUiToolName: string | undefined = undefined
  private currentToolCalls: ToolCallData[] = []
  private currentSkills: SkillInfo[] = []

  constructor(callbacks: AgentCallbacks, options: AgentServiceOptions, isWorkflow: boolean = false) {
    this.callbacks = callbacks
    this.options = options
    this.isWorkflow = isWorkflow
    this.state = {
      messages: [],
      isStreaming: false,
      isConnected: false,
      isLoadingSession: false,
      error: null,
      currentContent: '',
      currentReasoning: '',
      currentToolCalls: [],
      currentSkills: [],
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
    this.accumulatedUiComponents = null
    this.accumulatedUiTheme = undefined
    this.accumulatedUiToolName = undefined
    this.currentToolCalls = []
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

  sendUiEvent(event: UiEvent, sessionId: string, userId: string): boolean {
    if (!this.wsService?.isConnected) {
      return false
    }

    let payload: Record<string, unknown>

    switch (event.action) {
      case 'form_submit':
        payload = {
          action: 'form_submit',
          action_id: event.action_id,
          data: event.data,
          user_id: userId,
          session_id: sessionId,
        }
        break
      case 'button_click':
        payload = {
          action: 'button_click',
          action_id: event.action_id,
          user_id: userId,
          session_id: sessionId,
        }
        break
      case 'input_change':
        payload = {
          action: 'input_change',
          name: event.name,
          value: event.value,
          user_id: userId,
          session_id: sessionId,
        }
        break
      case 'tab_change':
        payload = {
          action: 'tab_change',
          index: event.index,
          user_id: userId,
          session_id: sessionId,
        }
        break
    }

    this.updateState({ isStreaming: true })
    return this.wsService.send({ type: 'ui_event', payload })
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
    this.accumulatedUiComponents = null
    this.accumulatedUiTheme = undefined
    this.accumulatedUiToolName = undefined
    this.currentToolCalls = []
    this.updateState({
      sessionId,
      messages: [...messages],
      isStreaming: false,
      currentContent: '',
      currentReasoning: '',
      currentToolCalls: [],
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

        case 'reasoning_start':
          // Reasoning started - content will accumulate via reasoning_delta
          break

        case 'reasoning_end':
          // Reasoning block complete - content already accumulated
          break

        case 'session':
          this.updateState({ sessionId: message.payload.session_id })
          this.callbacks.onSessionCreated?.(message.payload.session_id)
          break

        case 'session_created':
          this.updateState({ sessionId: message.payload.session_id })
          this.callbacks.onSessionCreated?.(message.payload.session_id)
          break

        case 'ui_response': {
          const uiPayload = message.payload.payload
          if (uiPayload?.components && uiPayload.components.length > 0) {
            this.accumulatedUiComponents = uiPayload.components
            this.accumulatedUiTheme = uiPayload.theme
            this.accumulatedUiToolName = message.payload.tool_name
          }
          if (!this.state.currentContent && !this.state.currentReasoning) {
            this.finalizeMessage()
          }
          break
        }

        case 'tool_call': {
          const parsedInput = (() => {
            try {
              return JSON.parse(message.payload.arguments)
            } catch {
              return message.payload.arguments
            }
          })()

          const existingIndex = this.currentToolCalls.findIndex(
            (tc) => tc.toolName === message.payload.name && JSON.stringify(tc.input) === JSON.stringify(parsedInput)
          )

          if (existingIndex >= 0) {
            this.currentToolCalls[existingIndex] = {
              ...this.currentToolCalls[existingIndex],
              attempts: this.currentToolCalls[existingIndex].attempts + 1,
            }
          } else {
            const toolCall: ToolCallData = {
              type: 'dynamic-tool',
              toolCallId: `tool_${Date.now()}_${this.messageIdCounter}`,
              toolName: message.payload.name,
              state: 'output-available',
              input: parsedInput,
              attempts: 1,
              toolType: normalizeToolType(message.payload.tool_type ?? ''),
            }
            this.currentToolCalls.push(toolCall)
          }
          this.updateState({ currentToolCalls: [...this.currentToolCalls] })
          break
        }

        case 'skills_resolved': {
          this.currentSkills = message.payload.skills ?? []
          this.updateState({ currentSkills: [...this.currentSkills] })
          break
        }

        case 'done':
          this.updateState({ sessionId: message.payload.session_id })
          this.finalizeMessage()
          break

        case 'error':
          this.handleError(message.payload.message)
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
      uiComponents: this.accumulatedUiComponents || undefined,
      uiTheme: this.accumulatedUiTheme,
      uiToolName: this.accumulatedUiToolName,
      toolCalls: this.currentToolCalls.length > 0 ? [...this.currentToolCalls] : undefined,
      skills: this.currentSkills.length > 0 ? [...this.currentSkills] : undefined,
      createdAt: new Date(),
    }

    this.state.messages.push(assistantMessage)
    this.accumulatedUiComponents = null
    this.accumulatedUiTheme = undefined
    this.accumulatedUiToolName = undefined
    this.currentToolCalls = []
    this.currentSkills = []
    this.updateState({
      messages: [...this.state.messages],
      isStreaming: false,
      currentContent: '',
      currentReasoning: '',
      currentToolCalls: [],
      currentSkills: [],
    })
  }

  private handleError(errorMessage: string): void {
    const hasPartialContent = this.state.currentContent.length > 0

    if (hasPartialContent) {
      const partialMessage: ChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: this.state.currentContent,
        reasoning: this.state.currentReasoning || undefined,
        createdAt: new Date(),
      }
      this.state.messages.push(partialMessage)
    }

    this.accumulatedUiComponents = null
    this.accumulatedUiTheme = undefined
    this.accumulatedUiToolName = undefined
    this.rawStreamContent = ''
    this.accumulatedContent = ''
    this.currentNodeId = null

    this.updateState({
      messages: [...this.state.messages],
      isStreaming: false,
      currentContent: '',
      currentReasoning: '',
      error: errorMessage,
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
