import {
  Building2,
  Calendar,
  LayoutDashboard,
  Settings,
  Users,
  Scissors,
  UserCircle,
  BarChart3,
  FileStack,
  Package,
  Warehouse,
  Percent,
  ClipboardList,
  CreditCard,
  BanknoteArrowDown,
} from 'lucide-react'
import { USER_ROLES, type UserRole } from './roles'

export type ModuleCode =
  | 'dashboard'
  | 'collection'
  | 'customers'
  | 'reports'
  | 'invoices'
  | 'ai_assistant'
  | 'whatsapp'
  | 'settings'

export interface MenuSubItem {
  title: string
  url: string
  allowedRoles?: UserRole[]
  moduleCode?: ModuleCode
  targetTutorialStep?: string
}

export interface MenuItem {
  title: string
  url: string
  icon: any
  allowedRoles: UserRole[]
  items?: MenuSubItem[]
  moduleCode?: ModuleCode // Código del módulo para verificar acceso del plan
  skipPlanCheck?: boolean // Para menús del sistema que no requieren verificación de plan
  targetTutorialStep?: string // Paso del tutorial asociado al ítem del menú
}

export const SIDE_APP_MENU_ITEMS: MenuItem[] = [
  {
    title: 'Tablero',
    url: '/admin/dashboard',
    icon: LayoutDashboard,
    moduleCode: 'dashboard',
    allowedRoles: [
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN,
      USER_ROLES.PROFESSIONAL,
    ],
    items: [
      {
        title: 'Cobros',
        url: '/admin/dashboard',
      },
    ],
  },
  {
    title: 'Cobros',
    url: '/admin/collection',
    icon: BanknoteArrowDown,
    moduleCode: 'collection',
    allowedRoles: [
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN,
      USER_ROLES.PROFESSIONAL,
    ],
    items: [
      {
        title: 'Campaña',
        url: '/admin/collection/campaing',
      },
      {
        title: 'Ejecuciones',
        url: '/admin/collection/executions',
      },
      {
        title: 'Plantillas',
        url: '/admin/collection/templates',
      },
      {
        title: 'Adjuntos',
        url: '/admin/collection/attachments',
      },
      {
        title: 'Torre de Control',
        url: '/admin/collection/control-tower',
      },
    ],
  },
  {
    title: 'Clientes',
    url: '/admin/customers',
    icon: Users,
    moduleCode: 'customers',
    allowedRoles: [
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN,
      USER_ROLES.PROFESSIONAL,
    ],
  },
  {
    title: 'Reportes',
    url: '/admin/reports',
    icon: BarChart3,
    moduleCode: 'reports',
    allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  },
  {
    title: 'Facturas',
    url: '/admin/invoices',
    icon: FileStack,
    moduleCode: 'invoices',
    allowedRoles: [
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN,
      USER_ROLES.PROFESSIONAL,
    ],
  },
]

export const SIDE_SYSTEM_MENU_ITEMS: MenuItem[] = [
  {
    title: 'Suscripción',
    icon: CreditCard,
    url: '/admin/suscription',
    allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  },
  {
    title: 'Planes',
    url: '/admin/plans',
    icon: CreditCard,
    skipPlanCheck: true, // Menú del sistema, no requiere verificación de plan
    allowedRoles: [USER_ROLES.COMPANY_ADMIN],
    items: [
      {
        title: 'Gestión de Planes',
        url: '/admin/plans',
      },
      {
        title: 'Asignación a Cuentas',
        url: '/admin/plans/assignments',
      },
    ],
  },
  {
    title: 'Cuentas',
    url: '/admin/businesses',
    icon: Building2,
    skipPlanCheck: true, // Menú del sistema
    allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
    items: [
      {
        title: 'Gestión de Cuentas',
        url: '/admin/business-accounts',
      },
      {
        title: 'Sucursales',
        url: '/admin/businesses',
      },
    ],
  },
  {
    title: 'Configuración',
    url: '/admin/settings',
    icon: Settings,
    skipPlanCheck: true, // Siempre visible para acceso a suscripción y pagos
    allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
    targetTutorialStep: 'settings-menu',
    items: [
      {
        title: 'Período de Prueba',
        url: '/admin/settings/trial',
        allowedRoles: [USER_ROLES.COMPANY_ADMIN],
      },
      {
        title: 'Asistente IA',
        url: '/admin/settings/ai-agent',
        moduleCode: 'ai_assistant',
      },
      {
        title: 'WhatsApp',
        url: '/admin/settings/whatsapp',
        allowedRoles: [USER_ROLES.COMPANY_ADMIN],
        moduleCode: 'whatsapp',
      },
      {
        title: 'Cobros',
        url: '/admin/settings/collection',
        allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
        moduleCode: 'collection',
      },
    ],
  },
]
