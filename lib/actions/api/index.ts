import { environment as devEnvironment } from '@/environment/development'
import { environment as proEnvironment } from '@/environment/production'
import { environment as staEnvironment } from '@/environment/staging'

const getNodeEnvName = (): string => {
  // NEXT_PUBLIC_ so Next.js inlines the value into the browser bundle: this
  // module also runs client-side (WebSocket URL), and a non-public var would
  // be undefined there, silently diverging from the server-side environment.
  // ENVIRONMENT is kept as fallback for deployments that still define it
  // (server-side only).
  return process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.ENVIRONMENT || 'staging'
}

let cachedEnvironment: typeof proEnvironment | null = null

export const getSelectedEnvironment = () => {
  if (cachedEnvironment) return cachedEnvironment

  const nodeEnvName = getNodeEnvName()
  cachedEnvironment = nodeEnvName === 'staging' ? staEnvironment : nodeEnvName === 'production' ? proEnvironment : devEnvironment
  return cachedEnvironment
}
