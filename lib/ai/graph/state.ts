import { BaseMessage } from '@langchain/core/messages'
import { Annotation } from '@langchain/langgraph'

export interface CustomerAppointment {
  appointmentId: string
  serviceId: string
  serviceName: string
  specialistId: string
  specialistName: string
  startTime: string
  status: string
}

export interface CustomerData {
  id: string
  userProfileId: string
  phone: string
  firstName: string
  lastName: string | null
  email: string | null
  appointments: CustomerAppointment[]
}

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  businessId: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),
  sessionId: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),
  customer: Annotation<CustomerData | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  selectedAppointmentId: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  pendingAction: Annotation<PendingAction | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  lastError: Annotation<ErrorInfo | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  retryCount: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),
})

export type AgentStateType = typeof AgentState.State

export interface PendingAction {
  type: 'create_appointment' | 'reschedule_appointment' | 'cancel_appointment'
  data: Record<string, unknown>
  confirmed: boolean
}

export interface ErrorInfo {
  toolName: string
  errorMessage: string
  errorType: 'temporary' | 'permanent' | 'user_input'
  timestamp: number
  originalArgs?: Record<string, unknown>
  suggestedAction?: string
}
