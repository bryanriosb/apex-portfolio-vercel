import type { CustomerStatus } from '@/lib/models/customer/business-customer'

// Mapeo de columnas en español a nombres internos en inglés
// NOTA: Las claves deben estar SIN tildes porque normalizeColumnName() las elimina
// Soporta nombres amigables (con espacios) y nombres técnicos (snake_case)
export const CUSTOMER_COLUMN_MAPPING: Record<string, string> = {
  // Nombres amigables (preferidos para plantillas) - SIN TILDES
  'nombre de empresa': 'company_name',
  'nit': 'nit',
  'nombre completo': 'full_name',
  'emails': 'emails',
  'telefono': 'phone',
  'estado': 'status',
  'categoria': 'category',
  'notas': 'notes',
  'preferencias': 'preferences',
  'etiquetas': 'tags',
  // Nombres técnicos (snake_case - retrocompatibilidad) - SIN TILDES
  'nombre_empresa': 'company_name',
  'nombre_completo': 'full_name',
  // Inglés (legado - para retrocompatibilidad)
  'company_name': 'company_name',
  'full_name': 'full_name',
  'phone': 'phone',
  'status': 'status',
  'category': 'category',
  'notes': 'notes',
  'preferences': 'preferences',
  'tags': 'tags',
}

// Columnas en español para mostrar en la UI
export const CUSTOMER_COLUMN_LABELS: Record<string, string> = {
  'company_name': 'Nombre de Empresa',
  'nit': 'NIT',
  'full_name': 'Nombre Completo',
  'emails': 'Emails',
  'phone': 'Teléfono',
  'status': 'Estado',
  'category': 'Categoría',
  'notes': 'Notas',
  'preferences': 'Preferencias',
  'tags': 'Etiquetas',
}

// Tipo para filas de clientes (usando nombres amigables)
export interface CustomerRow {
  'Nombre de Empresa'?: string
  'NIT': string
  'Nombre Completo'?: string
  'Emails': string
  'Teléfono'?: string
  'Estado'?: CustomerStatus
  'Categoría'?: string
  'Notas'?: string
  'Preferencias'?: string
  'Etiquetas'?: string
}

export const DEFAULT_CUSTOMER_TEMPLATES: CustomerRow[] = [
  {
    'Nombre de Empresa': 'Empresa ABC S.A.',
    'NIT': '900123456',
    'Nombre Completo': 'María González López',
    'Emails': 'maria.gonzalez@empresaabc.com, contabilidad@empresaabc.com',
    'Teléfono': '3001234567',
    'Estado': 'active',
    'Categoría': 'Corporativo',
    'Notas': 'Cliente frecuente, prefiere atención en la mañana',
    'Preferencias': 'Comunicación por email',
    'Etiquetas': 'cliente frecuente,empresa',
  },
  {
    'Nombre de Empresa': 'Innovatech Solutions',
    'NIT': '800987654',
    'Nombre Completo': 'Carlos Ramírez Torres',
    'Emails': 'carlos.ramirez@innovatech.com',
    'Teléfono': '3012345678',
    'Estado': 'active',
    'Categoría': 'Tecnología',
    'Notas': 'Cliente VIP, requiere atención preferencial',
    'Preferencias': 'Comunicación urgente por WhatsApp',
    'Etiquetas': 'vip,tecnología',
  },
  {
    'Nombre de Empresa': 'Servicios Profesionales Ltda.',
    'NIT': '901234567',
    'Nombre Completo': 'Ana Martínez Díaz',
    'Emails': 'ana.martinez@serviciosprof.com, finanzas@serviciosprof.com',
    'Teléfono': '3023456789',
    'Estado': 'active',
    'Categoría': 'Consultoría',
    'Preferencias': 'Videoconferencias para reuniones',
    'Etiquetas': 'servicios,consultoría',
  },
  {
    'Nombre de Empresa': 'Empresa Individual',
    'NIT': '902345678',
    'Nombre Completo': 'Luis Torres Castro',
    'Emails': 'luis.torres@empresaindividual.com',
    'Estado': 'active',
    'Categoría': 'Individual',
    'Notas': 'Cliente individual, sin nombre de empresa',
    'Etiquetas': 'individual',
  },
]
