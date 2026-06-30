'use client'

import { ChangeEvent, Fragment, useCallback, useEffect, useState, useRef } from 'react'
import { CopyIcon, RefreshCcwIcon, HistoryIcon, ChevronRightIcon, BotIcon, BrainCog, PanelRightOpen, BrainCircuit, RefreshCw } from 'lucide-react'
import type { ChatStatus } from 'ai'

import { useAgentChat } from '@/lib/services/agent'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useGlobalChatStore } from '@/lib/store/global-chat-store'
import { useWebSocketReconnectionStore } from '@/lib/store/websocket-reconnection-store'
import { PromptInputConnectorMenu } from '@/components/oauth2/PromptInputConnectorMenu'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import { Shimmer } from '@/components/ai-elements/shimmer'
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'
import { Button } from '@/components/ui/button'
import { ChatHistory } from '@/components/ChatHistory'
import { cn } from '@/lib/utils'
import { createImmediateSyncAction } from '@/lib/actions/collection/sync-jobs-actions'
import { toast } from 'sonner'

const MODELS = [
  {
    id: crypto.randomUUID(),
    name: 'Gemma 4 26B A4B-it',
    value: 'google/gemma-4-26B-A4B-it',
    provider: 'deepinfra',
    base_url: 'https://api.deepinfra.com/v1',
  },
  {
    id: crypto.randomUUID(),
    name: 'Gemma 4 31B-it',
    value: 'google/gemma-4-31B-it',
    provider: 'deepinfra',
    base_url: 'https://api.deepinfra.com/v1',
  },
  {
    id: crypto.randomUUID(),
    name: 'Gemma 4 31B-it-turbo',
    value: 'google/gemma-4-31B-it-turbo',
    provider: 'deepinfra',
    base_url: 'https://api.deepinfra.com/v1',
  },
  {
    id: crypto.randomUUID(),
    name: 'Nemotron-3-Super-120B-A12B (OpenRouter)',
    value: 'nvidia/nemotron-3-super-120b-a12b:free',
    provider: 'openrouter',
    provider_options: {
      reasoning_effort: 'low',
    },
  },
  {
    id: crypto.randomUUID(),
    name: 'Trinity Large Thinking',
    value: 'arcee-ai/trinity-large-thinking:free',
    provider: 'openrouter',
    provider_options: {
      reasoning_effort: 'medium',
    },
  },
  {
    id: crypto.randomUUID(),
    name: 'GPT OSS 120B (OpenRouter)',
    value: 'openai/gpt-oss-120b',
    provider: 'openrouter',
  },
  {
    id: crypto.randomUUID(),
    name: 'GPT 5.4 Mini',
    value: 'gpt-5.4-mini',
    base_url: 'https://api.openapi.com/v1',
    provider: 'openai',
  },
  {
    id: crypto.randomUUID(),
    name: 'GPT 5.4',
    value: 'gpt-5.4',
    base_url: 'https://api.openai.com/v1',
    provider: 'openai',
  },
  {
    id: crypto.randomUUID(),
    name: 'Qwen3 30B A3B',
    value: 'Qwen/Qwen3-30B-A3B',
  },
  {
    id: crypto.randomUUID(),
    name: 'Gemini 2.5 Flash',
    value: 'google/gemini-2.5-flash',
  },
  { id: crypto.randomUUID(), name: 'GLM-4.7', value: 'zai-org/GLM-4.7' },
  {
    id: crypto.randomUUID(),
    name: 'Nemotron-3-Ultra',
    value: 'nvidia/nemotron-3-ultra-550b-a55b:free',
  },
]

export function GlobalChat({ children }: { children?: React.ReactNode }) {
  const { user, isLoading: userLoading } = useCurrentUser()
  const { activeBusiness, isLoading: businessLoading } = useActiveBusinessStore()
  const { isPanelOpen, togglePanel, openPanel, closePanel } = useGlobalChatStore()
  const reconnectAll = useWebSocketReconnectionStore((s) => s.reconnectAll)

  const apiBaseUrl = 'https://apex-ai.borls.com/api'
  const userId = user?.id || ''
  const businessAccountId = activeBusiness?.business_account_id || ''
  const appName = businessAccountId
  const defaultModel = MODELS[0].value

  const [agentMode, setAgentMode] = useState<'simple' | 'workflow'>('simple')
  const isWorkflow = agentMode === 'workflow'
  const wsUrl = isWorkflow ? 'wss://apex-ai.borls.com/ws/conversational/workflow' : 'wss://apex-ai.borls.com/ws/conversational'
  const agentId = isWorkflow ? '61c93887-136b-42cb-8b43-3c65fbea9ecf' : 'e10c503d-00fc-4282-9d2e-3f8c4be7b0a0'

  const [selectedModel, setSelectedModel] = useState<string>(
    defaultModel || MODELS[0].value
  )
  const [inputValue, setInputValue] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [connectorsOpen, setConnectorsOpen] = useState(false)

  const {
    messages,
    isStreaming,
    isConnected,
    error,
    currentContent,
    currentReasoning,
    sessionId,
    reconnectAttempt,
    reconnectCountdown,
    maxRetries,
    send,
    stop,
    connect,
    disconnect,
    reconnect,
    regenerate,
    setSessionId,
  } = useAgentChat({
    wsBaseUrl: wsUrl,
    agentId,
    userId,
    appName,
    apiBaseUrl,
    model: selectedModel,
    isWorkflow,
  })

  const exhausted = reconnectAttempt >= maxRetries && maxRetries > 0

  const canConnect = !!userId && !!businessAccountId

  useEffect(() => {
    if (!canConnect) return

    connect()

    return () => disconnect()
  }, [canConnect, connect, disconnect])

  const processedMessagesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'assistant' && !isStreaming) {
      if (lastMessage.content.includes('trigger_collection_sync') && !processedMessagesRef.current.has(lastMessage.id)) {
        processedMessagesRef.current.add(lastMessage.id)

        toast.info('Iniciando sincronización de colecciones...')
        createImmediateSyncAction(
          {
            name: 'Sincronización via Asistente',
            category: 'collection',
            operation: 'full_sync',
            batch_size: 100
          },
          '',
          businessAccountId
        ).then(() => {
          toast.success('Sincronización iniciada con éxito')
        }).catch(err => {
          toast.error('Error al iniciar sincronización: ' + err.message)
        })
      }
    }
  }, [messages, isStreaming, businessAccountId])

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (!isConnected || !message.text?.trim()) return

      const selectedModelData = MODELS.find((m) => m.value === selectedModel)
      send(
        message.text.trim(),
        selectedModel,
        selectedModelData?.base_url,
        selectedModelData?.provider,
        selectedModelData?.provider_options
      )
      setInputValue('')
      openPanel() // Open side panel when sending a message
    },
    [send, selectedModel, isConnected, openPanel]
  )

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
  }, [])

  const isLastAssistantMessage = (messageId: string) => {
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant')
    return lastAssistant?.id === messageId
  }

  const getStatus = (): ChatStatus => {
    if (error) return 'error'
    if (isStreaming) return 'streaming'
    return 'ready'
  }

  const handleSelectSession = useCallback(
    (newSessionId: string) => {
      setSessionId(newSessionId)
      setShowHistory(false)
      openPanel()
    },
    [setSessionId, openPanel]
  )

  const handleNewChat = useCallback(() => {
    setSessionId(null)
    setShowHistory(false)
    openPanel()
  }, [setSessionId, openPanel])

  const toggleHistory = useCallback(() => {
    setShowHistory((prev) => !prev)
  }, [])

  if (userLoading || businessLoading) {
    return (
      <div className="flex w-full h-full overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden relative">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {children}
          </div>
          <div className="shrink-0 border-t border-primary/20 py-2 px-4 bg-background w-full z-40 transition-all duration-300 opacity-50 pointer-events-none">
            <div className="max-w-4xl mx-auto flex items-end gap-2 relative">
              <div className="w-full h-[50px] bg-muted animate-pulse rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full h-full overflow-hidden">
      {/* Main Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden relative">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </div>

        {/* Persistent Footer Input */}
        <div className="shrink-0 border-t border-primary/20 py-2 px-4 bg-background w-full z-40 transition-all duration-300">
          <div className="max-w-4xl mx-auto flex items-end gap-2 relative">
            {/* Main Input Area */}
            <PromptInput onSubmit={handleSubmit} className="w-full shadow-lg rounded-xl overflow-hidden border relative">
              <div className="absolute top-3 right-3 z-10 flex items-center justify-center gap-2 pointer-events-auto">
                {exhausted ? (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={reconnectAll}
                    className="h-6 gap-1 text-[10px] rounded-none border-muted-foreground/30 text-muted-foreground hover:text-foreground px-2"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reconectar
                  </Button>
                ) : null}
                {reconnectAttempt > 0 ? (
                  <span className="relative flex items-center justify-center h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-500 opacity-80"></span>
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground"></span>
                  </span>
                ) : (
                  <div
                    className={cn(
                      'h-1.5 w-1.5 rounded-full transition-colors duration-300',
                      isConnected ? 'bg-primary' : 'bg-slate-500'
                    )}
                  />
                )}
              </div>
              <PromptInputBody>
                <PromptInputTextarea
                  placeholder={
                    isConnected
                      ? 'Pregúntale a APEX o da una instrucción...'
                      : reconnectAttempt > 0
                        ? `Reconectando -Intento ${reconnectAttempt} de ${maxRetries}  ${reconnectCountdown} s`
                        : 'Conectando...'
                  }
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setInputValue(e.target.value)
                  }
                  value={inputValue}
                  disabled={!isConnected}
                  className={cn(
                    'bg-background text-foreground !placeholder:text-muted-foreground min-h-[50px] pt-3',
                    !isConnected && 'opacity-50 cursor-not-allowed',
                    '!rounded-none'
                  )}
                  onFocus={() => {
                    if (messages.length > 0 && !isPanelOpen) {
                      openPanel()
                    }
                  }}
                />
              </PromptInputBody>
              <PromptInputFooter className="!bg-background/95 backdrop-blur border-t border-primary/10 py-2">
                <PromptInputTools>
                  <PromptInputSelect
                    value={agentMode}
                    onValueChange={(val) => setAgentMode(val as 'simple' | 'workflow')}
                    disabled={!isConnected}
                  >
                    <PromptInputSelectTrigger
                      className={cn(
                        'h-8 text-xs',
                        !isConnected && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <PromptInputSelectValue />
                    </PromptInputSelectTrigger>
                    <PromptInputSelectContent>
                      <PromptInputSelectItem value="simple">
                        Agente Simple
                      </PromptInputSelectItem>
                      <PromptInputSelectItem value="workflow">
                        Workflow Multiagente
                      </PromptInputSelectItem>
                    </PromptInputSelectContent>
                  </PromptInputSelect>
                  <PromptInputSelect
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                    disabled={!isConnected}
                  >
                    <PromptInputSelectTrigger
                      className={cn(
                        'h-8 text-xs',
                        !isConnected && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <PromptInputSelectValue />
                    </PromptInputSelectTrigger>
                    <PromptInputSelectContent>
                      {MODELS.map((model) => (
                        <PromptInputSelectItem key={model.id} value={model.value}>
                          {model.name}
                        </PromptInputSelectItem>
                      ))}
                    </PromptInputSelectContent>
                  </PromptInputSelect>
                  <div
                    className={cn(
                      !isConnected && 'opacity-50',
                      !isConnected && 'pointer-events-none'
                    )}
                  >
                    <PromptInputConnectorMenu
                      agentId={agentId}
                      userId={userId}
                      businessAccountId={businessAccountId}
                      apiBaseUrl={apiBaseUrl}
                      isOpen={connectorsOpen}
                      handleConnectors={setConnectorsOpen}
                      isConnected={isConnected}
                      reconnectAttempt={reconnectAttempt}
                    />
                  </div>
                </PromptInputTools>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={togglePanel}
                  >
                    <BrainCircuit className="!h-5 !w-5" />
                  </Button>
                  <PromptInputSubmit
                    disabled={!isConnected || (!inputValue.trim() && !isStreaming)}
                    status={getStatus()}
                    onStop={stop}
                    className="h-8 rounded-md"
                  />
                </div>
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </div>

      {/* Side Panel (Relative flow) */}
      <div
        className={cn(
          "shrink-0 flex flex-col bg-white border-l shadow-2xl h-full transition-[width] duration-300 ease-in-out overflow-hidden z-50",
          isPanelOpen
            ? showHistory
              ? "w-[606px] lg:w-[656px]"
              : "w-[350px] lg:w-[400px]"
            : "w-0 border-l-0"
        )}
      >
        <div
          className={cn(
            "flex h-full min-h-full overflow-hidden bg-white transition-[width] duration-300 ease-in-out",
            showHistory ? "w-[606px] lg:w-[656px]" : "w-[350px] lg:w-[400px]"
          )}
        >
          {/* Chat History Sidebar */}
          <ChatHistory
            userId={userId}
            apiBaseUrl={apiBaseUrl}
            appName={appName}
            currentSessionId={sessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            className={cn(
              'shrink-0 transition-all duration-300 ease-in-out border-r',
              showHistory ? 'w-64' : 'w-0 overflow-hidden border-r-0'
            )}
          />

          {/* Main Chat Area */}
          <div className="flex flex-col w-[350px] lg:w-[400px] shrink-0 h-full overflow-hidden dark:bg-muted relative">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-primary/20 px-4 py-3 h-14 shrink-0 bg-background/95 backdrop-blur z-10">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={closePanel} className="-ml-2">
                  <ChevronRightIcon className="size-5" />
                </Button>
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    isConnected ? 'bg-primary' : 'bg-red-500'
                  )}
                />
                <span className="text-sm font-medium">
                  {isConnected
                    ? 'Asistente APEX'
                    : reconnectAttempt > 0
                      ? 'Reconectando...'
                      : 'Desconectado'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={showHistory ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={toggleHistory}
                  className="text-muted-foreground"
                >
                  <HistoryIcon className="size-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <Conversation className="h-full">
                <ConversationContent scrollTrigger={messages.length}>
                  {messages.length === 0 && !isStreaming && (
                    <ConversationEmptyState
                      title="Hola 👋, soy APEX"
                      description="Tu asistente inteligente para Cartera y Cobranza. ¿Qué quieres lograr hoy?"
                    />
                  )}

                  {messages.map((message) => (
                    <Fragment key={message.id}>
                      {message.reasoning && (
                        <Reasoning className="w-full">
                          <ReasoningTrigger />
                          <ReasoningContent>{message.reasoning}</ReasoningContent>
                        </Reasoning>
                      )}

                      <Message from={message.role}>
                        <MessageContent>
                          <MessageResponse>{message.content}</MessageResponse>
                        </MessageContent>

                        {message.role === 'assistant' &&
                          isLastAssistantMessage(message.id) && (
                            <MessageActions>
                              <MessageAction
                                onClick={regenerate}
                                tooltip="Regenerar"
                              >
                                <RefreshCcwIcon className="size-3" />
                              </MessageAction>
                              <MessageAction
                                onClick={() => copyToClipboard(message.content)}
                                tooltip="Copiar"
                              >
                                <CopyIcon className="size-3" />
                              </MessageAction>
                            </MessageActions>
                          )}
                      </Message>
                    </Fragment>
                  ))}

                  {/* Streaming content */}
                  {isStreaming && (
                    <>
                      {currentReasoning && (
                        <Reasoning className="w-full" isStreaming={true}>
                          <ReasoningTrigger />
                          <ReasoningContent>{currentReasoning}</ReasoningContent>
                        </Reasoning>
                      )}

                      {currentContent && (
                        <Message from="assistant">
                          <MessageContent>
                            <MessageResponse>{currentContent}</MessageResponse>
                          </MessageContent>
                        </Message>
                      )}

                      {!currentContent && !currentReasoning && (
                        <Shimmer duration={2} spread={4}>
                          Consultando...
                        </Shimmer>
                      )}
                    </>
                  )}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
