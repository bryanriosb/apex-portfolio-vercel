'use client'

import { ChangeEvent, Fragment, useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { CopyIcon, RefreshCcwIcon, HistoryIcon, ChevronRightIcon, BotIcon, BrainCog, PanelRightOpen, BrainCircuit, RefreshCw, AlertTriangleIcon } from 'lucide-react'
import type { ChatStatus } from 'ai'

import { useAgentChat } from '@/lib/services/agent'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useModels } from '@/hooks/use-models'
import {
  buildLlmProviderOptions,
  findLlmProviderOption,
} from '@/lib/models/agents/llm-provider'
import { ModelSelectorLogo } from '@/components/ai-elements/model-selector'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useGlobalChatStore } from '@/lib/store/global-chat-store'
import { useWebSocketReconnectionStore } from '@/lib/store/websocket-reconnection-store'
import { getSelectedEnvironment } from '@/lib/actions/api'
import { PromptInputConnectorMenu } from '@/components/oauth2/PromptInputConnectorMenu'
import { Spinner } from '@/components/ui/spinner'
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
import { Badge } from '@/components/ui/badge'
import { ChatHistory } from '@/components/ChatHistory'
import { ChatUiRenderer } from '@/components/global-chat/ChatUiRenderer'
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool'
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from '@/components/ai-elements/sources'
import type { UiEvent } from '@zavora-ai/adk-ui-react'
import { cn } from '@/lib/utils'
import { t, getUiActionLabel, getToolNameLabel, getToolTypeLabel } from '@/lib/i18n'
import { createImmediateSyncAction } from '@/lib/actions/collection/sync-jobs-actions'
import { toast } from 'sonner'

const DEFAULT_PROVIDER = 'deepinfra'
const DEFAULT_MODEL = 'google/gemma-4-31B-it'

export function GlobalChat({ children }: { children?: React.ReactNode }) {
  const { user, isLoading: userLoading } = useCurrentUser()
  const { activeBusiness, isLoading: businessLoading } = useActiveBusinessStore()
  const { isPanelOpen, togglePanel, openPanel, closePanel } = useGlobalChatStore()
  const reconnectAll = useWebSocketReconnectionStore((s) => s.reconnectAll)

  const env = getSelectedEnvironment()
  const apiBaseUrl = env.API_BASE_URL
  const userId = user?.id || ''
  const businessAccountId = activeBusiness?.business_account_id || ''
  const appName = businessAccountId

  const [agentMode, setAgentMode] = useState<'simple' | 'workflow'>('simple')
  const isWorkflow = agentMode === 'workflow'
  const wsBaseUrl = env.APEX_WS_URL
  const wsUrl = isWorkflow ? `${wsBaseUrl}/conversational/workflow` : `${wsBaseUrl}/conversational`
  const agentId = isWorkflow ? '61c93887-136b-42cb-8b43-3c65fbea9ecf' : 'e10c503d-00fc-4282-9d2e-3f8c4be7b0a0'

  const [selectedProvider, setSelectedProvider] = useState<string>(DEFAULT_PROVIDER)
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL)

  const { allModels, getModelsForProvider } = useModels()

  // Providers soportados por el backend (nativos + OpenAI-compatible) que
  // existen en models.dev con al menos un modelo
  const providerOptions = useMemo(() => {
    const { native, compatible } = buildLlmProviderOptions(allModels)
    return { native, compatible }
  }, [allModels])

  const availableProviders = useMemo(() => {
    return [...providerOptions.native, ...providerOptions.compatible].filter(
      (option) =>
        allModels[option.value] &&
        Object.keys(allModels[option.value].models).length > 0
    )
  }, [providerOptions, allModels])

  const providerModels = useMemo(
    () => getModelsForProvider(selectedProvider),
    [getModelsForProvider, selectedProvider]
  )

  // Si el modelo seleccionado no pertenece al provider actual, elegir el default o el primero
  useEffect(() => {
    if (providerModels.length === 0) return
    if (!providerModels.some((model) => model.id === selectedModel)) {
      const fallback =
        providerModels.find((model) => model.id === DEFAULT_MODEL) ||
        providerModels[0]
      setSelectedModel(fallback.id)
    }
  }, [providerModels, selectedModel])
  const [inputValue, setInputValue] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [connectorsOpen, setConnectorsOpen] = useState(false)

  const {
    messages,
    isStreaming,
    isConnected,
    isLoadingSession,
    error,
    currentContent,
    currentReasoning,
    currentToolCalls,
    currentSkills,
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
    sendUiEvent,
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
  }, [canConnect, connect, disconnect, isWorkflow])

  const processedMessagesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'assistant' && !isStreaming) {
      if (lastMessage.content?.includes('trigger_collection_sync') && !processedMessagesRef.current.has(lastMessage.id)) {
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

      const providerOption = findLlmProviderOption(
        providerOptions,
        selectedProvider
      )
      send(
        message.text.trim(),
        selectedModel,
        providerOption?.requiresBaseUrl ? providerOption.baseUrl : undefined,
        selectedProvider
      )
      setInputValue('')
      openPanel() // Open side panel when sending a message
    },
    [send, selectedModel, selectedProvider, providerOptions, isConnected, openPanel]
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

  const isLastUiMessage = (messageId: string) => {
    const lastUi = [...messages]
      .reverse()
      .find((m) => m.uiComponents && m.uiComponents.length > 0)
    return lastUi?.id === messageId
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
      setIsViewingHistory(true)
    },
    [setSessionId, openPanel]
  )

  const handleNewChat = useCallback(() => {
    setSessionId(null)
    setShowHistory(false)
    openPanel()
    setIsViewingHistory(false)
  }, [setSessionId, openPanel])

  const [isViewingHistory, setIsViewingHistory] = useState(false)

  const toggleHistory = useCallback(() => {
    setShowHistory((prev) => !prev)
  }, [])

  const handleUiAction = useCallback(
    (event: UiEvent) => {
      sendUiEvent(event)
    },
    [sendUiEvent]
  )

  const parseUiEventContent = (content: string) => {
    const uiEventRegex = /\[UI Event:\s*(.*?)\]\s*Action:\s*(\S+)/g
    const parts: ({ type: 'text'; text: string } | { type: 'ui_event'; eventLabel: string; action: string })[] = []
    let lastIndex = 0
    let match

    while ((match = uiEventRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', text: content.slice(lastIndex, match.index) })
      }
      parts.push({ type: 'ui_event', eventLabel: match[1].trim(), action: match[2] })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', text: content.slice(lastIndex) })
    }

    return parts
  }

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
                    value={selectedProvider}
                    onValueChange={setSelectedProvider}
                    disabled={!isConnected || availableProviders.length === 0}
                  >
                    <PromptInputSelectTrigger
                      className={cn(
                        'h-8 text-xs',
                        !isConnected && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <PromptInputSelectValue placeholder="Proveedor" />
                    </PromptInputSelectTrigger>
                    <PromptInputSelectContent>
                      {availableProviders.map((option) => (
                        <PromptInputSelectItem
                          key={option.value}
                          value={option.value}
                        >
                          <span className="flex items-center gap-2">
                            <ModelSelectorLogo provider={option.value} />
                            {option.label}
                          </span>
                        </PromptInputSelectItem>
                      ))}
                    </PromptInputSelectContent>
                  </PromptInputSelect>
                  <PromptInputSelect
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                    disabled={!isConnected || providerModels.length === 0}
                  >
                    <PromptInputSelectTrigger
                      className={cn(
                        'h-8 text-xs max-w-[180px]',
                        !isConnected && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <PromptInputSelectValue placeholder="Modelo" />
                    </PromptInputSelectTrigger>
                    <PromptInputSelectContent>
                      {providerModels.map((model) => (
                        <PromptInputSelectItem key={model.id} value={model.id}>
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
                    variant={isPanelOpen ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={togglePanel}
                  >
                    <BrainCircuit className={cn("!h-5 !w-5", isPanelOpen && "text-white")} />
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
              ? "w-[776px] lg:w-[826px]"
              : "w-[450px] lg:w-[500px]"
            : "w-0 border-l-0"
        )}
      >
        <div
          className={cn(
            "flex h-full min-h-full overflow-hidden bg-white transition-[width] duration-300 ease-in-out",
            showHistory ? "w-[776px] lg:w-[826px]" : "w-[450px] lg:w-[500px]"
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
            isOpen={showHistory}
            className={cn(
              'shrink-0 transition-all duration-300 ease-in-out border-r',
              showHistory ? 'w-80' : 'w-0 overflow-hidden border-r-0'
            )}
          />

          {/* Main Chat Area */}
          <div className="flex flex-col w-[450px] lg:w-[500px] shrink-0 h-full overflow-hidden dark:bg-muted relative">
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
            <div className="relative flex-1 overflow-hidden">
              {error && (
                <div className="mx-4 mt-3 flex items-start gap-2 p-3 border border-border rounded-lg bg-card">
                  <AlertTriangleIcon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground break-words min-w-0">{error}</span>
                </div>
              )}
              <Conversation className="h-full">
                <ConversationContent scrollTrigger={messages.length}>
                  {isLoadingSession && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-3">
                        <Spinner className="size-6" />
                        <span className="text-sm text-muted-foreground">Cargando conversación...</span>
                      </div>
                    </div>
                  )}

                  {!isLoadingSession && messages.length === 0 && !isStreaming && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <ConversationEmptyState
                        title="Hola 👋, soy APEX"
                        description="Tu asistente inteligente para Cartera y Cartera. ¿Qué quieres lograr hoy?"
                      />
                    </div>
                  )}

                  {!isLoadingSession && messages.map((message) => (
                    <Fragment key={message.id}>
                      {message.reasoning && (
                        <Reasoning className="w-full">
                          <ReasoningTrigger />
                          <ReasoningContent>{message.reasoning}</ReasoningContent>
                        </Reasoning>
                      )}

                      {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="w-full space-y-2">
                          {message.toolCalls.map((toolCall) => (
                            <Tool key={toolCall.toolCallId}>
                              <ToolHeader
                                type="dynamic-tool"
                                state={toolCall.state}
                                toolName={getToolNameLabel(toolCall.toolName)}
                              >
                                {toolCall.toolType && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {getToolTypeLabel(toolCall.toolType)}
                                  </Badge>
                                )}
                                {toolCall.attempts > 1 && (
                                  <Badge variant="secondary" className="ml-1 text-xs">
                                    ×{toolCall.attempts}
                                  </Badge>
                                )}
                              </ToolHeader>
                              <ToolContent>
                                <ToolInput input={toolCall.input} />
                              </ToolContent>
                            </Tool>
                          ))}
                        </div>
                      )}

                      {message.skills && message.skills.length > 0 && (
                        <Sources className="w-full">
                          <SourcesTrigger count={message.skills.length} />
                          <SourcesContent>
                            {message.skills.map((skill, index) => (
                              <Source key={index} title={`${skill.name}${skill.version ? ` v${skill.version}` : ''}`} />
                            ))}
                          </SourcesContent>
                        </Sources>
                      )}

                      <Message from={message.role}>
                        <MessageContent>
                          {message.uiComponents && message.uiComponents.length > 0 ? (
                            <>
                              {message.content && (
                                <MessageResponse>{message.content}</MessageResponse>
                              )}
                              <ChatUiRenderer
                                components={message.uiComponents}
                                theme={message.uiTheme}
                                onAction={handleUiAction}
                                isStreaming={isStreaming && isLastUiMessage(message.id)}
                                disabled={isViewingHistory}
                              />
                            </>
                          ) : (() => {
                            const parts = parseUiEventContent(message.content)
                            const hasUiEvents = parts.some(p => p.type === 'ui_event')
                            if (!hasUiEvents) {
                              return <MessageResponse>{message.content}</MessageResponse>
                            }
                            return parts.map((part, idx) =>
                              part.type === 'ui_event' ? (
                                <div key={idx} className="w-full border-l-2 border-primary/40 pl-4 py-1 my-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px]">{t('ui.uiEventLabel')}</Badge>
                                    <span className="text-muted-foreground text-xs">{t('ui.uiEventButtonClicked')}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-muted-foreground text-xs">{t('ui.uiEventAction')}:</span>
                                    <Badge variant="secondary" className="text-[10px]">{getUiActionLabel(part.action)}</Badge>
                                  </div>
                                </div>
                              ) : (
                                <MessageResponse key={idx}>{part.text}</MessageResponse>
                              )
                            )
                          })()}
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

                      {currentToolCalls.length > 0 && (
                        <div className="w-full space-y-2">
                          {currentToolCalls.map((toolCall) => (
                            <Tool key={toolCall.toolCallId}>
                              <ToolHeader
                                type="dynamic-tool"
                                state={toolCall.state}
                                toolName={getToolNameLabel(toolCall.toolName)}
                              >
                                {toolCall.toolType && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {getToolTypeLabel(toolCall.toolType)}
                                  </Badge>
                                )}
                                {toolCall.attempts > 1 && (
                                  <Badge variant="secondary" className="ml-1 text-xs">
                                    ×{toolCall.attempts}
                                  </Badge>
                                )}
                              </ToolHeader>
                              <ToolContent>
                                <ToolInput input={toolCall.input} />
                              </ToolContent>
                            </Tool>
                          ))}
                        </div>
                      )}

                      {currentSkills.length > 0 && (
                        <Sources className="w-full">
                          <SourcesTrigger count={currentSkills.length} />
                          <SourcesContent>
                            {currentSkills.map((skill, index) => (
                              <Source key={index} title={`${skill.name}${skill.version ? ` v${skill.version}` : ''}`} />
                            ))}
                          </SourcesContent>
                        </Sources>
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
