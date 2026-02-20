import { BusinessType } from '@/lib/types/enums'

/**
 * Mapeo centralizado de tipos de negocio a etiquetas en español
 */
export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  AESTHETICS_CENTER: 'Centro de Estética',
  BARBERSHOP: 'Barbería',
  HAIR_SALON: 'Salón de Peluquería',
  MAKEUP_CENTER: 'Centro de Maquillaje',
  INDEPENDENT: 'Independiente',
  EYEBROWS_EYELASHES_SALON: 'Salón de Cejas y Pestañas',
  SPA: 'Spa',
  MANICURE_PEDICURE_SALON: 'Salón de Manicura y Pedicura',
  BEAUTY_SALON: 'Salón de Belleza',
  PLASTIC_SURGERY_CENTER: 'Centro de Cirugía Plástica',
  SALON: 'Salón',
  BEAUTY_STUDIO: 'Estudio de Belleza',
  CONSULTORY: 'Consultorio',
}

/**
 * Array de tipos de negocio para uso en formularios
 */
export const BUSINESS_TYPES_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: 'BEAUTY_SALON', label: 'Salón de Belleza' },
  { value: 'HAIR_SALON', label: 'Salón de Peluquería' },
  { value: 'BARBERSHOP', label: 'Barbería' },
  { value: 'SPA', label: 'Spa' },
  { value: 'AESTHETICS_CENTER', label: 'Centro de Estética' },
  { value: 'MANICURE_PEDICURE_SALON', label: 'Salón de Manicura y Pedicura' },
  { value: 'EYEBROWS_EYELASHES_SALON', label: 'Salón de Cejas y Pestañas' },
  { value: 'MAKEUP_CENTER', label: 'Centro de Maquillaje' },
  { value: 'PLASTIC_SURGERY_CENTER', label: 'Centro de Cirugía Plástica' },
  { value: 'CONSULTORY', label: 'Consultorio' },
  { value: 'SALON', label: 'Salón' },
  { value: 'BEAUTY_STUDIO', label: 'Estudio de Belleza' },
  { value: 'INDEPENDENT', label: 'Independiente' },
]

/**
 * Obtiene la etiqueta en español para un tipo de negocio
 * @param type - Tipo de negocio
 * @returns Etiqueta en español o el tipo sin formato si no existe
 */
export function getBusinessTypeLabel(type: BusinessType): string {
  return BUSINESS_TYPE_LABELS[type] || type
}
