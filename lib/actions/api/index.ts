import { environment as devEnvironment } from '@/environment/dev'
import { environment as proEnvironment } from '@/environment/pro'

const getNodeEnvName = (): string => {
  return process.env.NODE_ENV || 'production'
}

let cachedEnvironment: typeof proEnvironment | null = null

export const getSelectedEnvironment = () => {
  if (cachedEnvironment) return cachedEnvironment

  const nodeEnvName = getNodeEnvName()
  cachedEnvironment = nodeEnvName === 'production' ? proEnvironment : devEnvironment
  return cachedEnvironment
}

// Backward compatibility — lazy getter
export const selectedEnvironment = new Proxy({} as typeof proEnvironment, {
  get(_target, prop) {
    return (getSelectedEnvironment() as any)[prop]
  },
})
