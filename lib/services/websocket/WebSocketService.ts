/**
 * WebSocketService - Manages WebSocket connections for real-time agent communication
 * 
 * Migrated from apex-agent/src/lib/services/websocket/WebSocketService.ts
 * 
 * Requirements: 4.3, 13.1, 13.2, 13.3, 13.4, 13.5
 */

export interface WebSocketCallbacks {
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onMessage?: (data: string) => void;
  onError?: () => void;
}

export interface WebSocketOutgoingMessage {
  type: string;
  payload: Record<string, unknown>;
}

/**
 * WebSocketService handles real-time bidirectional communication with the agent backend.
 * 
 * Features:
 * - Connection lifecycle management (connect, disconnect)
 * - Message serialization logic
 * - Connection state management
 * - WebSocket message types handling (chunk, reasoning_delta, session, done)
 */
export class WebSocketService {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly callbacks: WebSocketCallbacks;

  constructor(url: string, agentId: string, callbacks: WebSocketCallbacks) {
    this.url = `${url}?agent_id=${agentId}`;
    this.callbacks = callbacks;
  }

  /**
   * Check if the WebSocket connection is currently open
   */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get the connection URL (including agent_id query parameter)
   */
  get connectionUrl(): string {
    return this.url;
  }

  /**
   * Establish a WebSocket connection
   * If a connection already exists and is not closed, this is a no-op
   */
  connect(): void {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      return;
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.callbacks.onOpen?.();
    };

    this.ws.onmessage = (event) => {
      this.callbacks.onMessage?.(event.data);
    };

    this.ws.onclose = (event) => {
      this.callbacks.onClose?.(event);
      this.ws = null;
    };

    this.ws.onerror = () => {
      this.callbacks.onError?.();
    };
  }

  /**
   * Close the WebSocket connection
   * @param code - Close code (default: 1000 for normal closure)
   * @param reason - Reason for closing
   */
  disconnect(code: number = 1000, reason: string = "User disconnect"): void {
    if (this.ws) {
      this.ws.close(code, reason);
      this.ws = null;
    }
  }

  /**
   * Send a message through the WebSocket connection
   * The message will be JSON serialized before sending
   * @param message - The message object to send
   * @returns true if the message was sent, false if not connected
   */
  send(message: WebSocketOutgoingMessage): boolean {
    if (!this.isConnected) {
      return false;
    }

    console.log("Message:", message);

    this.ws!.send(JSON.stringify(message));
    return true;
  }

  /**
   * Send a raw string message through the WebSocket connection
   * @param message - The raw string message to send
   * @returns true if the message was sent, false if not connected
   */
  sendRaw(message: string): boolean {
    if (!this.isConnected) {
      return false;
    }

    this.ws!.send(message);
    return true;
  }
}
