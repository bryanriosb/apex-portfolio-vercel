export type AgentStreamEvent =
  | { type: 'chunk'; content: string }
  | { type: 'feedback'; event: { type: 'thinking' | 'progress' | 'waiting'; message: string; toolName?: string; elapsedMs?: number } }
  | { type: 'tool_start'; toolName: string }
  | { type: 'tool_end'; toolName: string; success: boolean }
  | { type: 'intent'; intent: string }
  | { type: 'error'; error: string }
  | { type: 'complete' }
  | { type: 'session_end'; message: string; reason?: string }

export interface AgentProvider {
  streamResponse(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      assistantName?: string
      businessId?: string
      sessionId?: string
    }
  ): AsyncGenerator<AgentStreamEvent>
  
  invokeResponse(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      businessId?: string
      sessionId?: string
    }
  ): Promise<{ content: string; messages?: any[] }>
}

export interface BusinessContext {
  businessName: string
  businessType: string
  phone?: string
  services: Array<{
    id: string
    name: string
    duration: number
    price: number
  }>
  specialists: Array<{
    id: string
    name: string
    specialty: string
  }>
  operatingHours: string
  currentDateTime: string
  assistantName?: string
}