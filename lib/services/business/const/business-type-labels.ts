import { BusinessType } from '@/lib/types/enums'

/**
 * Mapeo centralizado de tipos de negocio a etiquetas en español
 */
export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  FINANCE: 'Finanzas',
  MARKETING: 'Marketing',
  CONSULTORY: 'Consultoría',
  EDUCATION: 'Educación',
  HEALTH: 'Salud',
  SPORT: 'Deportes',
  TECHNOLOGY: 'Tecnología',
  TRAVEL: 'Viajes',
  FOOD: 'Alimentos',
  BEAUTY: 'Belleza',
  LEGAL: 'Legal',
  MUSIC: 'Música',
  INDUSTRY: 'Industria',
  INDEPENDENT: 'Independiente',
  REAL_ESTATE: 'Bienes Raíces',
  AUTOMOTIVE: 'Automotriz',
  PETS: 'Mascotas',
  LOGISTIC: 'Logística',
  OTHER: 'Otro',
}

/**
 * Array de tipos de negocio para uso en formularios
 */
export const BUSINESS_TYPES_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: 'BEAUTY', label: 'Belleza' },
  { value: 'CONSULTORY', label: 'Consultoría' },
  { value: 'HEALTH', label: 'Salud' },
  { value: 'INDEPENDENT', label: 'Independiente' },
  { value: 'OTHER', label: 'Otro' },
  { value: 'FINANCE', label: 'Finanzas' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'EDUCATION', label: 'Educación' },
  { value: 'SPORT', label: 'Deportes' },
  { value: 'TECHNOLOGY', label: 'Tecnología' },
  { value: 'TRAVEL', label: 'Viajes' },
  { value: 'FOOD', label: 'Alimentos' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'MUSIC', label: 'Música' },
  { value: 'INDUSTRY', label: 'Industria' },
  { value: 'REAL_ESTATE', label: 'Bienes Raíces' },
  { value: 'AUTOMOTIVE', label: 'Automotriz' },
  { value: 'PETS', label: 'Mascotas' },
  { value: 'LOGISTIC', label: 'Logística' },
]

/**
 * Obtiene la etiqueta en español para un tipo de negocio
 * @param type - Tipo de negocio
 * @returns Etiqueta en español o el tipo sin formato si no existe
 */
export function getBusinessTypeLabel(type: BusinessType): string {
  return BUSINESS_TYPE_LABELS[type] || type
}
