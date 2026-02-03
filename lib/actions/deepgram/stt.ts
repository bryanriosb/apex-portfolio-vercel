'use server'

export interface DeepgramConfig {
  model: string
  language: string
  encoding: string
  sampleRate: number
  channels: number
  punctuate: boolean
  interimResults: boolean
  utteranceEndMs: number
  vadEvents: boolean
  endpointing: number
}

const defaultConfig: DeepgramConfig = {
  model: 'nova-3',
  language: 'es-419',
  encoding: 'linear16',
  sampleRate: 16000,
  channels: 1,
  punctuate: true,
  interimResults: true,
  utteranceEndMs: 1000,
  vadEvents: true,
  endpointing: 300,
}

export async function getDeepgramApiKey(): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) {
    throw new Error('DEEPGRAM_API_KEY environment variable is not set')
  }
  return apiKey
}

export async function getDeepgramConfig(): Promise<DeepgramConfig> {
  return { ...defaultConfig }
}
