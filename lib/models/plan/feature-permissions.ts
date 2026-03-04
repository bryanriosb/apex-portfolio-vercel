export type AppointmentsFeaturePermission =
  | 'whatsapp_notifications'
  | 'specialist_assignment'
  | 'price_editing'
  | 'credit'

export type ServicesFeaturePermission =
  | 'supply_management'
  | 'price_editing_in_appointment'

export type SpecialistsFeaturePermission = 'goals_management'

export type ReportsFeaturePermission =
  | 'view_charts'
  | 'view_revenue'
  | 'view_appointments'
  | 'view_services'
  | 'view_specialists'
  | 'view_customers'
  | 'view_supplies'
  | 'view_portfolio'
  | 'export_data'

export type FeaturePermission =
  | AppointmentsFeaturePermission
  | ServicesFeaturePermission
  | SpecialistsFeaturePermission
  | ReportsFeaturePermission

export interface ModuleFeaturePermissions {
  appointments?: {
    whatsapp_notifications?: boolean
    specialist_assignment?: boolean
    price_editing?: boolean
    credit?: boolean
  }
  services?: {
    supply_management?: boolean
    price_editing_in_appointment?: boolean
  }
  specialists?: {
    goals_management?: boolean
  }
  reports?: {
    view_charts?: boolean
    view_revenue?: boolean
    view_appointments?: boolean
    view_services?: boolean
    view_specialists?: boolean
    view_customers?: boolean
    view_supplies?: boolean
    view_portfolio?: boolean
    export_data?: boolean
  }
  [key: string]: Record<string, boolean> | undefined
}

export type ModuleCode = 'appointments' | 'services' | 'specialists' | 'reports'

export function parseFeaturePermission(featureKey: string): {
  module: ModuleCode
  feature: FeaturePermission
} | null {
  // Valid feature keys based on known features
  const validFeatures: Record<string, { module: ModuleCode }> = {
    'whatsapp_notifications': { module: 'appointments' },
    'specialist_assignment': { module: 'appointments' },
    'price_editing': { module: 'appointments' },
    'credit': { module: 'appointments' },
    'supply_management': { module: 'services' },
    'price_editing_in_appointment': { module: 'services' },
    'goals_management': { module: 'specialists' },
    'view_charts': { module: 'reports' },
    'view_revenue': { module: 'reports' },
    'view_appointments': { module: 'reports' },
    'view_services': { module: 'reports' },
    'view_specialists': { module: 'reports' },
    'view_customers': { module: 'reports' },
    'view_supplies': { module: 'reports' },
    'view_portfolio': { module: 'reports' },
    'export_data': { module: 'reports' },
  }

  const featureInfo = validFeatures[featureKey]
  if (!featureInfo) return null

  return {
    module: featureInfo.module,
    feature: featureKey as FeaturePermission,
  }
}