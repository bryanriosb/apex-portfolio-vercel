import { environment as devEnvironment } from '@/environment/development'
import { environment as proEnvironment } from '@/environment/production'
import { environment as staEnvironment } from '@/environment/staging'

const getNodeEnvName = (): string => {
  return process.env.ENVIRONMENT || 'staging'
}

let cachedEnvironment: typeof proEnvironment | null = null

export const getSelectedEnvironment = () => {
  if (cachedEnvironment) return cachedEnvironment

  const nodeEnvName = getNodeEnvName()
  cachedEnvironment = nodeEnvName === 'staging' ? staEnvironment : nodeEnvName === 'production' ? proEnvironment : devEnvironment
  return cachedEnvironment
}
