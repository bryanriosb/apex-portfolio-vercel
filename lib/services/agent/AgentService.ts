import { WebSocketService } from "@/lib/services/websocket/WebSocketService";
import type {
  AgentState,
  ChatMessage,
  SendMessageOptions,
  AgentCallbacks,
  WebSocketIncomingMessage,
} from "./types";

export class AgentService {
  private wsService: WebSocketService | null = null;
  private state: AgentState;
  private callbacks: AgentCallbacks;
  private messageIdCounter = 0;

  constructor(callbacks: AgentCallbacks) {
    this.callbacks = callbacks;
    this.state = {
      messages: [],
      isStreaming: false,
      isConnected: false,
      error: null,
      currentContent: "",
      currentReasoning: "",
      sessionId: null,
    };
  }

  getState(): AgentState {
    return { ...this.state };
  }

  connect(url: string, agentId: string): void {
    if (this.wsService?.isConnected) {
      return;
    }

    this.wsService = new WebSocketService(url, agentId, {
      onOpen: () => {
        this.updateState({ isConnected: true, error: null });
      },
      onClose: () => {
        this.updateState({ isConnected: false, isStreaming: false });
      },
      onMessage: (data) => this.handleMessage(data),
      onError: () => {
        this.updateState({ error: "Connection error", isConnected: false });
      },
    });

    this.wsService.connect();
  }

  disconnect(): void {
    if (this.wsService) {
      this.wsService.disconnect();
      this.wsService = null;
      this.updateState({ isConnected: false });
    }
  }

  send(options: SendMessageOptions): boolean {
    if (!this.wsService?.isConnected) {
      return false;
    }

    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: "user",
      content: options.content,
      createdAt: new Date(),
    };

    this.state.messages.push(userMessage);
    this.updateState({
      messages: [...this.state.messages],
      isStreaming: true,
      currentContent: "",
      currentReasoning: "",
      error: null,
    });

    console.log("content:", options.content);

    const message = {
      type: "query_stream",
      payload: {
        content: options.content,
        user_id: options.userId,
        ...(options.sessionId && { session_id: options.sessionId }),
        ...(options.model && { model: options.model }),
        ...(options.baseUrl && { base_url: options.baseUrl }),
        ...(options.provider && { provider: options.provider }),
      },
    };

    this.wsService.send(message);
    return true;
  }

  stop(): void {
    this.updateState({ isStreaming: false });
  }

  clear(): void {
    this.setConversation(null, []);
  }

  setMessages(messages: ChatMessage[]): void {
    this.setConversation(this.state.sessionId, messages);
  }

  setConversation(sessionId: string | null, messages: ChatMessage[]): void {
    this.updateState({
      sessionId,
      messages: [...messages],
      isStreaming: false,
      currentContent: "",
      currentReasoning: "",
      error: null,
    });
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketIncomingMessage = JSON.parse(data);

      switch (message.type) {
        case "chunk":
          this.state.currentContent += message.payload.content;
          this.updateState({ currentContent: this.state.currentContent });
          break;

        case "reasoning_delta":
          this.state.currentReasoning += message.payload.content;
          this.updateState({ currentReasoning: this.state.currentReasoning });
          break;

        case "session":
          this.updateState({ sessionId: message.payload.session_id });
          this.callbacks.onSessionCreated?.(message.payload.session_id);
          break;

        case "done":
          this.updateState({ sessionId: message.payload.session_id });
          this.finalizeMessage();
          break;
      }
    } catch (e) {
      console.error("Failed to parse message:", e);
    }
  }

  private finalizeMessage(): void {
    const assistantMessage: ChatMessage = {
      id: this.generateId(),
      role: "assistant",
      content: this.state.currentContent,
      reasoning: this.state.currentReasoning || undefined,
      createdAt: new Date(),
    };

    this.state.messages.push(assistantMessage);
    this.updateState({
      messages: [...this.state.messages],
      isStreaming: false,
      currentContent: "",
      currentReasoning: "",
    });
  }

  private updateState(partial: Partial<AgentState>): void {
    this.state = { ...this.state, ...partial };
    this.callbacks.onStateChange(this.getState());
  }

  private generateId(): string {
    return `msg_${Date.now()}_${++this.messageIdCounter}`;
  }
}
