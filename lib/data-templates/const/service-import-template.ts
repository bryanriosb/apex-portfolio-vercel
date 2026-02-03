export interface ServiceRow {
  name: string
  price: number
  duration_minutes: number
  description?: string
  category_name?: string
  service_type?: 'REGULAR' | 'ASSESSMENT'
  tax_rate?: number
  is_featured?: boolean
}

export const DEFAULT_SERVICE_TEMPLATES: ServiceRow[] = [
  {
    name: 'Corte de Cabello',
    price: 25000,
    duration_minutes: 30,
    description: 'Corte de cabello profesional para dama o caballero',
    category_name: 'Cabello',
    service_type: 'REGULAR',
    tax_rate: 0,
    is_featured: true,
  },
  {
    name: 'Tinte Completo',
    price: 80000,
    duration_minutes: 120,
    description: 'Aplicación de tinte en todo el cabello',
    category_name: 'Cabello',
    service_type: 'REGULAR',
    tax_rate: 0,
    is_featured: false,
  },
  {
    name: 'Manicure y Pedicure',
    price: 35000,
    duration_minutes: 60,
    description: 'Servicio completo de manicure y pedicure',
    category_name: 'Uñas',
    service_type: 'REGULAR',
    tax_rate: 0,
    is_featured: false,
  },
  {
    name: 'Evaluación Inicial',
    price: 50000,
    duration_minutes: 45,
    description: 'Consulta y evaluación del estado del cabello y cuero cabelludo',
    category_name: 'Consultas',
    service_type: 'ASSESSMENT',
    tax_rate: 0,
    is_featured: false,
  },
]
