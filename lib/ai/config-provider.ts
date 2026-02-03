// Configuración del motor de IA
// Cambiar entre 'langgraph' y 'vercel-ai' para probar diferentes implementaciones

export type AIProvider = 'langgraph' | 'vercel-ai'

export interface AIConfig {
  provider: AIProvider
  enabledTools: boolean
}

// Configuración actual - CAMBIA ESTA LÍNEA PARA CAMBIAR DE MOTOR
export const AI_CONFIG: AIConfig = {
  provider: 'vercel-ai', // Cambiado a 'vercel-ai' para usar Vercel AI SDK 6
  enabledTools: true,
}

// Helper functions
export function isLanggraphProvider(provider: AIProvider): boolean {
  return provider === 'langgraph'
}

export function isVercelAIProvider(provider: AIProvider): boolean {
  return provider === 'vercel-ai'
}
