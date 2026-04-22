import { useCallback, useEffect, useRef, useState } from "react";
import { AgentService } from "@/lib/services/agent/AgentService";
import { SessionService } from "@/lib/services/session/SessionService";
import type { AgentState, ChatMessage, SendMessageOptions } from "@/lib/services/agent/types";

export interface UseAgentChatOptions {
  wsUrl: string;
  agentId: string;
  userId: string;
  appName: string;
  apiBaseUrl?: string;
  sessionId?: string;
  model?: string;
  baseUrl?: string;
  provider?: string;
  initialMessages?: ChatMessage[];
}

export interface UseAgentChatReturn extends AgentState {
  send: (
    content: string,
    model?: string,
    baseUrl?: string,
    provider?: string,
  ) => boolean;
  stop: () => void;
  clear: () => void;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  regenerate: () => void;
  setSessionId: (sessionId: string | null) => void;
}

export function useAgentChat(options: UseAgentChatOptions): UseAgentChatReturn {
  const {
    wsUrl,
    agentId,
    userId,
    appName,
    apiBaseUrl,
    sessionId: initialSessionId,
    model: defaultModel,
    baseUrl: defaultBaseUrl,
    provider,
    initialMessages = [],
  } = options;

  const [state, setState] = useState<AgentState>({
    messages: initialMessages,
    isStreaming: false,
    isConnected: false,
    error: null,
    currentContent: "",
    currentReasoning: "",
    sessionId: initialSessionId ?? null,
  });

  const serviceRef = useRef<AgentService | null>(null);
  const lastUserMessageRef = useRef<string>("");
  const sessionServiceRef = useRef<SessionService | null>(null);
  const sessionIdRef = useRef<string | null>(initialSessionId ?? null);

  useEffect(() => {
    serviceRef.current = new AgentService({
      onStateChange: (newState) => {
        sessionIdRef.current = newState.sessionId ?? null;
        setState(newState);
      },
      onSessionCreated: (newSessionId) => {
        setState((prev) => ({ ...prev, sessionId: newSessionId }));
      },
    });

    if (apiBaseUrl) {
      sessionServiceRef.current = new SessionService({ baseUrl: apiBaseUrl });
    }

    return () => {
      serviceRef.current?.disconnect();
    };
  }, []);

  const connect = useCallback(() => {
    serviceRef.current?.connect(wsUrl, agentId);
  }, [wsUrl, agentId]);

  const disconnect = useCallback(() => {
    serviceRef.current?.disconnect();
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [connect, disconnect]);

  const setSessionId = useCallback(
    async (newSessionId: string | null) => {
      if (!newSessionId || !sessionServiceRef.current) {
        sessionIdRef.current = newSessionId;
        serviceRef.current?.setConversation(newSessionId, []);

        if (!serviceRef.current) {
          setState((prev) => ({ ...prev, sessionId: newSessionId, messages: [] }));
        }
        return;
      }

      try {
        const session = await sessionServiceRef.current.getSession(
          newSessionId,
          userId,
          appName,
        );
        const loadedMessages: ChatMessage[] = session.events.map((event) => ({
          id: event.id,
          role: event.author === "user" ? "user" : "assistant",
          content: event.content,
          createdAt: new Date(event.timestamp),
        }));
        sessionIdRef.current = newSessionId;
        serviceRef.current?.setConversation(newSessionId, loadedMessages);

        if (!serviceRef.current) {
          setState((prev) => ({
            ...prev,
            sessionId: newSessionId,
            messages: loadedMessages,
          }));
        }
      } catch (error) {
        console.error("Failed to load session messages:", error);
        sessionIdRef.current = newSessionId;
        serviceRef.current?.setConversation(newSessionId, []);

        if (!serviceRef.current) {
          setState((prev) => ({ ...prev, sessionId: newSessionId, messages: [] }));
        }
      }
    },
    [userId, appName],
  );

  const send = useCallback(
    (
      content: string,
      model?: string,
      baseUrl?: string,
      provider?: string,
    ): boolean => {
      if (!serviceRef.current) return false;

      lastUserMessageRef.current = content;
      const sendOptions: SendMessageOptions = {
        content,
        userId,
        sessionId: sessionIdRef.current ?? undefined,
        model: model || defaultModel,
        baseUrl: baseUrl || defaultBaseUrl,
        provider,
      };

      return serviceRef.current.send(sendOptions);
    },
    [defaultModel, defaultBaseUrl, userId],
  );

  const stop = useCallback(() => {
    serviceRef.current?.stop();
  }, []);

  const clear = useCallback(() => {
    serviceRef.current?.clear();
  }, []);

  const regenerate = useCallback(() => {
    if (!lastUserMessageRef.current || state.isStreaming) return;

    setState((prev) => ({
      ...prev,
      messages: prev.messages.slice(0, -1),
    }));

    setTimeout(() => {
      send(lastUserMessageRef.current);
    }, 50);
  }, [send, state.isStreaming]);

  return {
    ...state,
    send,
    stop,
    clear,
    connect,
    disconnect,
    reconnect,
    regenerate,
    setSessionId,
  };
}
