import type { CustomerStatus } from '@/lib/models/customer/business-customer'

export interface CustomerRow {
  company_name?: string
  nit: string
  full_name: string
  email: string
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
    email: 'maria.gonzalez@empresaabc.com',
    phone: '+57 300 123 4567',
    status: 'active',
    category: 'Corporativo',
    notes: 'Cliente frecuente, prefiere atención en la mañana',
    preferences: 'Comunicación por email',
    tags: 'cliente frecuente,empresa',
  },
  {
    company_name: 'Innovatech Solutions',
    nit: '800987654-3',
    full_name: 'Carlos Ramírez Torres',
    email: 'carlos.ramirez@innovatech.com',
    phone: '+57 301 234 5678',
    status: 'vip',
    category: 'Tecnología',
    notes: 'Cliente VIP, requiere atención preferencial',
    preferences: 'Comunicación urgente por WhatsApp',
    tags: 'vip,tecnología',
  },
  {
    company_name: 'Servicios Profesionales Ltda.',
    nit: '901234567-8',
    full_name: 'Ana Martínez Díaz',
    email: 'ana.martinez@serviciosprof.com',
    phone: '+57 302 345 6789',
    status: 'active',
    category: 'Consultoría',
    preferences: 'Videoconferencias para reuniones',
    tags: 'servicios,consultoría',
  },
  {
    nit: '902345678-9',
    full_name: 'Luis Torres Castro',
    email: 'luis.torres@empresaindividual.com',
    status: 'active',
    category: 'Individual',
    notes: 'Cliente individual, sin nombre de empresa',
    tags: 'individual',
  },
]
