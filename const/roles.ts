export const USER_ROLES = {
  COMPANY_ADMIN: 'company_admin', // Admin de la empresa (crea negocios/salones)
  BUSINESS_ADMIN: 'business_admin', // Admin de un negocio/salón específico
  PROFESSIONAL: 'professional', // Profesional/Especialista con acceso limitado
  EMPLOYEE: 'business_monitor', // Empleado/Especialista
  CUSTOMER: 'customer', // Cliente
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

// Permisos por rol
export const ROLE_PERMISSIONS = {
  [USER_ROLES.COMPANY_ADMIN]: {
    canManageBusinesses: true,
    canManageUsers: true,
    canViewAllBusinesses: true,
    canManageSettings: true,
    canManageBusinessAccounts: true,
    canCreateBusinessAccounts: true,
    canCreateBusinessAccount: true,
    canEditBusinessAccount: true,
    canEditAccountContactInfo: true,
    canDeleteBusinessAccount: true,
    canAddAccountMembers: true,
    canCreateService: true,
    canEditService: true,
    canDeleteService: true,
    canCreateProduct: true,
    canEditProduct: true,
    canDeleteProduct: true,
    canManageInventory: true,
    canViewInventory: true,
    canCreateInventoryMovement: true,
    canAdjustStock: true,
  },
  [USER_ROLES.BUSINESS_ADMIN]: {
    canManageBusinesses: false,
    canManageUsers: false,
    canViewAllBusinesses: false,
    canManageSettings: false,
    canManageOwnBusiness: true,
    canManageEmployees: true,
    canManageServices: true,
    canManageAppointments: true,
    canViewOwnBusinessAccount: true,
    canManageBusinessesInAccount: true,
    canCreateBusinessAccount: false,
    canEditBusinessAccount: false,
    canEditAccountContactInfo: true,
    canDeleteBusinessAccount: false,
    canAddAccountMembers: false,
    canCreateService: true,
    canEditService: true,
    canDeleteService: true,
    canCreateProduct: true,
    canEditProduct: true,
    canDeleteProduct: true,
    canManageInventory: true,
    canViewInventory: true,
    canCreateInventoryMovement: true,
    canAdjustStock: true,
  },
  [USER_ROLES.PROFESSIONAL]: {
    canManageBusinesses: false,
    canManageUsers: false,
    canViewAllBusinesses: false,
    canManageSettings: false,
    canManageOwnBusiness: false,
    canManageEmployees: false,
    canViewDashboard: true,
    canViewAppointments: true,
    canManageAppointments: true,
    canCreateService: true,
    canEditService: true,
    canDeleteService: false,
    canCreateProduct: true,
    canEditProduct: true,
    canDeleteProduct: false,
    canManageInventory: true,
    canViewInventory: true,
    canCreateInventoryMovement: true,
    canAdjustStock: true,
    canViewOwnSpecialistData: true,
    canViewOwnGoals: true,
    canViewCustomers: true,
    canViewInvoices: true,
    canViewReports: false,
    canManageInvoiceSettings: false,
  },
  [USER_ROLES.EMPLOYEE]: {
    canManageBusinesses: false,
    canManageUsers: false,
    canViewAllBusinesses: false,
    canManageSettings: false,
    canManageOwnBusiness: false,
    canManageEmployees: false,
    canManageServices: false,
    canManageAppointments: false,
    canViewOwnAppointments: true,
    canManageOwnProfile: true,
  },
  [USER_ROLES.CUSTOMER]: {
    canManageBusinesses: false,
    canManageUsers: false,
    canViewAllBusinesses: false,
    canManageSettings: false,
    canManageOwnBusiness: false,
    canManageEmployees: false,
    canManageServices: false,
    canManageAppointments: false,
    canViewOwnAppointments: false,
    canManageOwnProfile: false,
    canBookAppointments: true, // Reservar citas
    canViewOwnBookings: true, // Ver sus propias reservas
  },
}

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] as Record<string, boolean>
  return permissions[permission] ?? false
}

// Enlaces del sidebar por rol
export const SIDEBAR_ACCESS = {
  dashboard: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN, USER_ROLES.PROFESSIONAL],
  appointments: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN, USER_ROLES.PROFESSIONAL],
  businesses: [USER_ROLES.COMPANY_ADMIN],
  businessAccounts: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  services: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN, USER_ROLES.PROFESSIONAL],
  products: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN, USER_ROLES.PROFESSIONAL],
  inventory: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN, USER_ROLES.PROFESSIONAL],
  specialists: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN, USER_ROLES.PROFESSIONAL],
  customers: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN, USER_ROLES.PROFESSIONAL],
  invoices: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN, USER_ROLES.PROFESSIONAL],
  reports: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  settings: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  invoiceSettings: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
} as const

export function canAccessRoute(
  role: UserRole,
  route: keyof typeof SIDEBAR_ACCESS
): boolean {
  const allowedRoles = SIDEBAR_ACCESS[route]
  return allowedRoles
    ? (allowedRoles as readonly UserRole[]).includes(role)
    : false
}
