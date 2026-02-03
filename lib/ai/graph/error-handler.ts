import type { ErrorInfo } from './state'

const TEMPORARY_ERROR_PATTERNS = [
  /timeout/i,
  /network/i,
  /connection/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /rate limit/i,
  /too many requests/i,
  /503/i,
  /502/i,
  /504/i,
]

const USER_INPUT_ERROR_PATTERNS = [
  /not found/i,
  /no encontr/i,
  /invalid.*id/i,
  /no hay.*disponible/i,
  /no existe/i,
  /horario.*no.*disponible/i,
]

const PERMANENT_ERROR_PATTERNS = [
  /constraint/i,
  /violation/i,
  /permission denied/i,
  /unauthorized/i,
  /forbidden/i,
]

export function classifyError(
  errorMessage: string,
  toolName: string
): ErrorInfo['errorType'] {
  if (TEMPORARY_ERROR_PATTERNS.some((pattern) => pattern.test(errorMessage))) {
    return 'temporary'
  }

  if (USER_INPUT_ERROR_PATTERNS.some((pattern) => pattern.test(errorMessage))) {
    return 'user_input'
  }

  if (PERMANENT_ERROR_PATTERNS.some((pattern) => pattern.test(errorMessage))) {
    return 'permanent'
  }

  return 'temporary'
}

export function getSuggestedAction(errorInfo: ErrorInfo): string {
  switch (errorInfo.errorType) {
    case 'temporary':
      return 'retry'
    case 'user_input':
      return getInputSuggestion(errorInfo)
    case 'permanent':
      return 'notify_user'
    default:
      return 'notify_user'
  }
}

function getInputSuggestion(errorInfo: ErrorInfo): string {
  const msg = errorInfo.errorMessage.toLowerCase()

  if (msg.includes('no encontr') || msg.includes('not found')) {
    if (errorInfo.toolName === 'get_appointments_by_phone') {
      return 'ask_create_new'
    }
    if (errorInfo.toolName === 'get_available_slots') {
      return 'ask_different_date'
    }
    if (errorInfo.toolName === 'get_specialists') {
      return 'show_all_specialists'
    }
  }

  if (msg.includes('no hay') && msg.includes('disponible')) {
    return 'ask_different_option'
  }

  return 'ask_clarification'
}

export function createErrorInfo(
  toolName: string,
  errorMessage: string,
  originalArgs?: Record<string, unknown>
): ErrorInfo {
  const errorType = classifyError(errorMessage, toolName)
  const errorInfo: ErrorInfo = {
    toolName,
    errorMessage,
    errorType,
    timestamp: Date.now(),
    originalArgs,
  }
  errorInfo.suggestedAction = getSuggestedAction(errorInfo)
  return errorInfo
}

export function shouldRetry(
  errorInfo: ErrorInfo,
  currentRetryCount: number
): boolean {
  const MAX_RETRIES = 2

  if (currentRetryCount >= MAX_RETRIES) {
    return false
  }

  return errorInfo.errorType === 'temporary'
}

export function formatErrorForAgent(errorInfo: ErrorInfo): string {
  const baseMessage = `[ERROR] La herramienta "${errorInfo.toolName}" falló: ${errorInfo.errorMessage}`

  switch (errorInfo.suggestedAction) {
    case 'retry':
      return `${baseMessage}\n[ACCIÓN] Reintentando automáticamente...`
    case 'ask_create_new':
      return `${baseMessage}\n[ACCIÓN] Informa al usuario que no se encontró y pregunta si desea crear uno nuevo.`
    case 'ask_different_date':
      return `${baseMessage}\n[ACCIÓN] Informa al usuario que no hay disponibilidad y pregunta por otra fecha.`
    case 'ask_different_option':
      return `${baseMessage}\n[ACCIÓN] Informa al usuario que no está disponible y ofrece alternativas.`
    case 'ask_clarification':
      return `${baseMessage}\n[ACCIÓN] Pide al usuario que verifique la información proporcionada.`
    case 'notify_user':
      return `${baseMessage}\n[ACCIÓN] Informa al usuario que hubo un problema técnico y que intente más tarde.`
    default:
      return baseMessage
  }
}

export function getRecoveryPrompt(errorInfo: ErrorInfo): string {
  switch (errorInfo.errorType) {
    case 'temporary':
      return 'Hubo un problema de conexión. Intentando de nuevo...'
    case 'user_input':
      return getUserInputRecoveryMessage(errorInfo)
    case 'permanent':
      return 'Lo siento, hubo un problema técnico. Por favor, intenta más tarde o contacta al negocio directamente.'
    default:
      return 'Hubo un problema. ¿Podrías intentar de nuevo?'
  }
}

function getUserInputRecoveryMessage(errorInfo: ErrorInfo): string {
  const msg = errorInfo.errorMessage.toLowerCase()

  if (
    msg.includes('no encontr') &&
    errorInfo.toolName === 'get_appointments_by_phone'
  ) {
    return 'No encontré citas con ese número. ¿Deseas agendar una Crear Cita?'
  }

  if (msg.includes('no hay') && msg.includes('disponible')) {
    return 'Ese horario no está disponible. ¿Te gustaría ver otros horarios?'
  }

  return 'No pude encontrar esa información. ¿Podrías verificar los datos?'
}
