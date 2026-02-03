import { ChatOpenAI } from '@langchain/openai'

export type ModelProvider = 'openai' | 'deepinfra'

export type OpenAIModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo'
export type DeepInfraModel =
  | 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'
  | 'openai/gpt-oss-120b'
  | 'openai/gpt-oss-20b'
  | 'Qwen/Qwen3-235B-A22B-Instruct-2507'

export type ModelType = OpenAIModel | DeepInfraModel

export interface AIConfig {
  provider: ModelProvider
  model: ModelType
  temperature?: number
  maxTokens?: number
}

const defaultConfig: AIConfig = {
  provider: 'deepinfra',
  model: 'Qwen/Qwen3-235B-A22B-Instruct-2507',
  temperature: 0.3,
  maxTokens: 4096,
}

const PROVIDER_CONFIG: Record<
  ModelProvider,
  { baseURL?: string; apiKeyEnv: string }
> = {
  openai: {
    apiKeyEnv: 'OPENAI_API_KEY',
  },
  deepinfra: {
    baseURL: 'https://api.deepinfra.com/v1/openai',
    apiKeyEnv: 'DEEPINFRA_API_KEY',
  },
}

export function createChatModel(config: Partial<AIConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config }
  const providerConfig = PROVIDER_CONFIG[finalConfig.provider]

  const apiKey = process.env[providerConfig.apiKeyEnv]
  if (!apiKey) {
    throw new Error(
      `${providerConfig.apiKeyEnv} environment variable is not set`
    )
  }

  return new ChatOpenAI({
    model: finalConfig.model,
    temperature: finalConfig.temperature,
    maxTokens: finalConfig.maxTokens,
    openAIApiKey: apiKey,
    configuration: providerConfig.baseURL
      ? { baseURL: providerConfig.baseURL }
      : undefined,
  })
}

export function getDefaultConfig(): AIConfig {
  return { ...defaultConfig }
}
