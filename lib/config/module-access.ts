/**
 * Módulos del sistema
 */
export const MODULES = {
  APPOINTMENTS: 'appointments',
  MEDICAL_RECORDS: 'medical_records',
  INVENTORY: 'inventory',
  REPORTS: 'reports',
  CLIENTS: 'clients',
  SERVICES: 'services',
  SPECIALISTS: 'specialists',
  PRODUCTS: 'products',
  COMMISSIONS: 'commissions',
  WHATSAPP: 'whatsapp',
} as const

export type ModuleName = (typeof MODULES)[keyof typeof MODULES]
