import type { CustomerStatus } from '@/lib/models/customer/business-customer'

export interface CustomerRow {
  company_name?: string
  nit: string
  full_name: string
  emails: string
  phone?: string
  status?: CustomerStatus
  category?: string
  notes?: string
  preferences?: string
  tags?: string
}

export const DEFAULT_CUSTOMER_TEMPLATES: CustomerRow[] = [
  {
    company_name: 'Empresa ABC S.A.',
    nit: '900123456',
    full_name: 'María González López',
    emails: 'maria.gonzalez@empresaabc.com, contabilidad@empresaabc.com',
    phone: '3001234567',
    status: 'active',
    category: 'Corporativo',
    notes: 'Cliente frecuente, prefiere atención en la mañana',
    preferences: 'Comunicación por email',
    tags: 'cliente frecuente,empresa',
  },
  {
    company_name: 'Innovatech Solutions',
    nit: '800987654',
    full_name: 'Carlos Ramírez Torres',
    emails: 'carlos.ramirez@innovatech.com',
    phone: '3012345678',
    status: 'active',
    category: 'Tecnología',
    notes: 'Cliente VIP, requiere atención preferencial',
    preferences: 'Comunicación urgente por WhatsApp',
    tags: 'vip,tecnología',
  },
  {
    company_name: 'Servicios Profesionales Ltda.',
    nit: '901234567',
    full_name: 'Ana Martínez Díaz',
    emails: 'ana.martinez@serviciosprof.com, finanzas@serviciosprof.com',
    phone: '3023456789',
    status: 'active',
    category: 'Consultoría',
    preferences: 'Videoconferencias para reuniones',
    tags: 'servicios,consultoría',
  },
  {
    company_name: 'Empresa Individual',
    nit: '902345678',
    full_name: 'Luis Torres Castro',
    emails: 'luis.torres@empresaindividual.com',
    status: 'active',
    category: 'Individual',
    notes: 'Cliente individual, sin nombre de empresa',
    tags: 'individual',
  },
]
