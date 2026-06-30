'use client'

import { ChangeEvent, Fragment, useCallback, useEffect, useState } from 'react'
import { CopyIcon, RefreshCcwIcon, HistoryIcon } from 'lucide-react'
import type { ChatStatus } from 'ai'

import { useAgentChat } from '@/lib/services/agent'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import Loading from '@/components/ui/loading'
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

export default function AgentChat() {
  const { user, isLoading: userLoading } = useCurrentUser()
  const { activeBusiness, isLoading: businessLoading } = useActiveBusinessStore()

  const wsUrl = 'wss://apex-ai.borls.com/ws/conversational'
  const apiBaseUrl = 'https://apex-ai.borls.com/api'
  const userId = user?.id || ''
  const businessAccountId = activeBusiness?.business_account_id || ''
  const appName = businessAccountId
  const defaultModel = MODELS[0].value
  const agentId = 'e10c503d-00fc-4282-9d2e-3f8c4be7b0a0'

  const [selectedModel, setSelectedModel] = useState<string>(
    defaultModel || MODELS[0].value
  )
  const [inputValue, setInputValue] = useState('')
  const [showHistory, setShowHistory] = useState(true)
  const [connectorsOpen, setConnectorsOpen] = useState(false)

  const [openConnectors, setOpenConnectors] = useState(false)

  const {
    messages,
    isStreaming,
    isConnected,
    error,
    currentContent,
    currentReasoning,
    sessionId,
    reconnectAttempt,
    send,
    stop,
    connect,
    disconnect,
    regenerate,
    setSessionId,
  } = useAgentChat({
    wsBaseUrl: wsUrl,
    agentId,
    userId,
    appName,
    apiBaseUrl,
    model: selectedModel,
  })

  useEffect(() => {
    if (!userId || !businessAccountId) return

    connect()

    return () => disconnect()
  }, [connect, disconnect, userId, businessAccountId])

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
    },
    [send, selectedModel, isConnected]
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
    },
    [setSessionId]
  )

  const handleNewChat = useCallback(() => {
    setSessionId(null)
    setShowHistory(false)
  }, [setSessionId])

  const toggleHistory = useCallback(() => {
    setShowHistory((prev) => !prev)
  }, [])

  if (userLoading || businessLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white dark:bg-muted">
        <div className="flex flex-col items-center gap-4">
          <Loading className="h-8 w-8 text-primary" />
          <span className="text-sm text-muted-foreground">Cargando chat...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full min-h-full overflow-hidden bg-white">
      {/* Chat History Sidebar */}
      <ChatHistory
        userId={userId}
        apiBaseUrl={apiBaseUrl}
        appName={appName}
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        className={cn(
          'shrink-0 transition-all duration-200',
          showHistory ? 'w-72' : 'w-0 overflow-hidden'
        )}
      />

      {/* Main Chat Area - fills remaining space */}
      <div className="flex flex-col w-full h-full overflow-hidden dark:bg-muted">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-primary/20 px-4 py-3 h-14 shrink-0">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'h-2 w-2',
                isConnected ? 'bg-primary' : 'bg-red-500'
              )}
            />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
            {sessionId && (
              <span className="text-xs text-muted-foreground ml-2 px-2 py-0.5 bg-muted">
                Sesión: {sessionId.slice(0, 8)}...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {error && <span className="text-sm text-destructive">{error}</span>}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleHistory}
              className="text-muted-foreground"
            >
              <HistoryIcon className="size-4" />
            </Button>
          </div>
        </div>

        {/* Messages - scroll container */}
        <div className="flex-1 overflow-hidden">
          <Conversation className="h-full">
            <ConversationContent scrollTrigger={messages.length}>
              {messages.length === 0 && !isStreaming && (
                <ConversationEmptyState
                  title="Inicia una conversación"
                  description="Escribe un mensaje para comenzar a chatear con el agente"
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

        {/* Input - fixed at bottom, no scroll */}
        <div className="shrink-0 border-t border-primary/20 py-4 !text-muted-foreground px-4 bg-background">
          <PromptInput onSubmit={handleSubmit} className="w-full">
            <PromptInputBody>
              <PromptInputTextarea
                placeholder={
                  isConnected ? 'Escribe tu mensaje...' : 'Conectando...'
                }
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setInputValue(e.target.value)
                }
                value={inputValue}
                disabled={!isConnected}
                className={cn(
                  'bg-background text-foreground !placeholder:text-muted-foreground',
                  !isConnected && 'opacity-50 cursor-not-allowed'
                )}
              />
            </PromptInputBody>
            <PromptInputFooter className="!bg-background">
              <PromptInputTools>
                <PromptInputSelect
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                  disabled={!isConnected}
                >
                  <PromptInputSelectTrigger
                    className={cn(
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
              <PromptInputSubmit
                disabled={!isConnected || (!inputValue.trim() && !isStreaming)}
                status={getStatus()}
                onStop={stop}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  )
}
