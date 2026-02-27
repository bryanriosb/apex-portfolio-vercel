export const USER_ROLES = {
  COMPANY_ADMIN: 'company_admin',
  BUSINESS_ADMIN: 'business_admin',
  PROFESSIONAL: 'professional',
  EMPLOYEE: 'business_monitor',
  CUSTOMER: 'customer',
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
    canViewReports: true,
    canManageCollection: true,
    canViewCustomers: true,
    canManageCustomers: true,
  },
  [USER_ROLES.BUSINESS_ADMIN]: {
    canManageBusinesses: false,
    canManageUsers: false,
    canViewAllBusinesses: false,
    canManageSettings: false,
    canManageOwnBusiness: true,
    canViewOwnBusinessAccount: true,
    canManageBusinessesInAccount: true,
    canCreateBusinessAccount: false,
    canEditBusinessAccount: true,
    canEditAccountContactInfo: true,
    canDeleteBusinessAccount: false,
    canViewReports: true,
    canManageCollection: true,
    canViewCustomers: true,
    canManageCustomers: true,
  },
  [USER_ROLES.PROFESSIONAL]: {
    canManageBusinesses: false,
    canManageUsers: false,
    canViewAllBusinesses: false,
    canManageSettings: false,
    canManageOwnBusiness: false,
    canManageEmployees: false,
    canViewDashboard: true,
    canViewCustomers: true,
    canViewReports: false,
    canManageCollection: true,
  },
  [USER_ROLES.EMPLOYEE]: {
    canManageBusinesses: false,
    canManageUsers: false,
    canViewAllBusinesses: false,
    canManageSettings: false,
    canManageOwnBusiness: false,
    canManageEmployees: false,
    canManageOwnProfile: true,
    canViewCustomers: true,
  },
  [USER_ROLES.CUSTOMER]: {
    canManageBusinesses: false,
    canManageUsers: false,
    canViewAllBusinesses: false,
    canManageSettings: false,
    canManageOwnBusiness: false,
    canManageEmployees: false,
    canManageOwnProfile: false,
  },
}

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] as Record<string, boolean>
  return permissions[permission] ?? false
}

// Enlaces del sidebar por rol
export const SIDEBAR_ACCESS = {
  dashboard: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN, USER_ROLES.PROFESSIONAL],
  collection: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN, USER_ROLES.PROFESSIONAL],
  businesses: [USER_ROLES.COMPANY_ADMIN],
  businessAccounts: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  customers: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN, USER_ROLES.PROFESSIONAL],
  reports: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  settings: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
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
