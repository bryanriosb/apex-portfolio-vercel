import type { PlanRow, PlanFeatureRow, PlanModuleRow, PlanPermissionRow } from '@/lib/actions/plan-import-export'

export const DEFAULT_PLAN_TEMPLATES = {
  plans: [
    {
      code: 'free',
      name: 'Plan Gratuito',
      description: 'Plan básico para comenzar',
      price_cents: 0,
      billing_period: 'monthly' as const,
      status: 'active' as const,
      max_businesses: 1,
      max_users_per_business: 1,
      max_specialists_per_business: 2,
      sort_order: 1,
      monthly_price_cents: 0,
      yearly_price_cents: 0,
      yearly_discount_percent: 0,
    },
    {
      code: 'basic',
      name: 'Plan Básico',
      description: 'Plan con funcionalidades esenciales',
      price_cents: 25000,
      billing_period: 'monthly' as const,
      status: 'active' as const,
      max_businesses: 1,
      max_users_per_business: 3,
      max_specialists_per_business: 5,
      sort_order: 2,
      monthly_price_cents: 25000,
      yearly_price_cents: 250000,
      yearly_discount_percent: 17,
    },
    {
      code: 'pro',
      name: 'Plan Profesional',
      description: 'Plan completo para negocios en crecimiento',
      price_cents: 50000,
      billing_period: 'monthly' as const,
      status: 'active' as const,
      max_businesses: 3,
      max_users_per_business: 10,
      max_specialists_per_business: 20,
      sort_order: 3,
      monthly_price_cents: 50000,
      yearly_price_cents: 500000,
      yearly_discount_percent: 17,
    },
  ] satisfies PlanRow[],

  features: [
    {
      plan_code: 'free',
      max_appointments_per_month: 50,
      max_products: 10,
      max_services: 5,
      max_customers: 100,
      max_storage_mb: 100,
      has_custom_branding: false,
      has_priority_support: false,
      has_api_access: false,
    },
    {
      plan_code: 'basic',
      max_appointments_per_month: 500,
      max_products: 100,
      max_services: 50,
      max_customers: 1000,
      max_storage_mb: 1000,
      has_custom_branding: false,
      has_priority_support: false,
      has_api_access: false,
    },
    {
      plan_code: 'pro',
      max_appointments_per_month: undefined,
      max_products: undefined,
      max_services: undefined,
      max_customers: undefined,
      max_storage_mb: 10000,
      has_custom_branding: true,
      has_priority_support: true,
      has_api_access: true,
    },
  ] satisfies PlanFeatureRow[],

  modules: [
    // Plan Free
    { plan_code: 'free', module_code: 'appointments', can_read: true, can_write: true, can_delete: false },
    { plan_code: 'free', module_code: 'services', can_read: true, can_write: false, can_delete: false },
    { plan_code: 'free', module_code: 'specialists', can_read: true, can_write: false, can_delete: false },
    { plan_code: 'free', module_code: 'reports', can_read: true, can_write: false, can_delete: false },

    // Plan Basic
    { plan_code: 'basic', module_code: 'appointments', can_read: true, can_write: true, can_delete: true },
    { plan_code: 'basic', module_code: 'services', can_read: true, can_write: true, can_delete: false },
    { plan_code: 'basic', module_code: 'specialists', can_read: true, can_write: true, can_delete: false },
    { plan_code: 'basic', module_code: 'reports', can_read: true, can_write: false, can_delete: false },

    // Plan Pro
    { plan_code: 'pro', module_code: 'appointments', can_read: true, can_write: true, can_delete: true },
    { plan_code: 'pro', module_code: 'services', can_read: true, can_write: true, can_delete: true },
    { plan_code: 'pro', module_code: 'specialists', can_read: true, can_write: true, can_delete: true },
    { plan_code: 'pro', module_code: 'reports', can_read: true, can_write: true, can_delete: true },
  ] satisfies PlanModuleRow[],

  permissions: [
    // Plan Pro - WhatsApp notifications
    { plan_code: 'pro', module_code: 'appointments', permission_key: 'whatsapp_notifications', enabled: true },
    { plan_code: 'pro', module_code: 'appointments', permission_key: 'specialist_assignment', enabled: true },
    { plan_code: 'pro', module_code: 'appointments', permission_key: 'price_editing', enabled: true },

    // Plan Pro - Services permissions
    { plan_code: 'pro', module_code: 'services', permission_key: 'supply_management', enabled: true },
    { plan_code: 'pro', module_code: 'services', permission_key: 'price_editing_in_appointment', enabled: true },

    // Plan Pro - Specialists permissions
    { plan_code: 'pro', module_code: 'specialists', permission_key: 'goals_management', enabled: true },

    // Plan Pro - Reports permissions
    { plan_code: 'pro', module_code: 'reports', permission_key: 'view_charts', enabled: true },
    { plan_code: 'pro', module_code: 'reports', permission_key: 'view_revenue', enabled: true },
    { plan_code: 'pro', module_code: 'reports', permission_key: 'view_appointments', enabled: true },
    { plan_code: 'pro', module_code: 'reports', permission_key: 'view_services', enabled: true },
    { plan_code: 'pro', module_code: 'reports', permission_key: 'view_specialists', enabled: true },
    { plan_code: 'pro', module_code: 'reports', permission_key: 'view_customers', enabled: true },
    { plan_code: 'pro', module_code: 'reports', permission_key: 'view_supplies', enabled: true },
    { plan_code: 'pro', module_code: 'reports', permission_key: 'export_data', enabled: true },
  ] satisfies PlanPermissionRow[],

  featuresMetadata: [
    // Appointments module features
    {
      module_code: 'appointments',
      feature_key: 'whatsapp_notifications',
      name: 'Notificaciones de WhatsApp',
      description: 'Enviar recordatorios y notificaciones por WhatsApp',
      required_plans: 'pro,enterprise',
    },
    {
      module_code: 'appointments',
      feature_key: 'specialist_assignment',
      name: 'Asignación por servicio',
      description: 'Asignar especialistas específicos a cada servicio',
      required_plans: 'pro,enterprise',
    },
    {
      module_code: 'appointments',
      feature_key: 'price_editing',
      name: 'Edición de precios',
      description: 'Modificar precios de servicios durante la creación de citas',
      required_plans: 'pro,enterprise',
    },
    {
      module_code: 'appointments',
      feature_key: 'credit',
      name: 'Abonos',
      description: 'Permite gestionar abonos o pagos parciales en las citas desbloqueando la gestión de cartera en el módulos de reportes',
      required_plans: 'pro,enterprise',
    },

    // Services module features
    {
      module_code: 'services',
      feature_key: 'supply_management',
      name: 'Gestión de insumos',
      description: 'Habilita la capacidad de gestionar productos de tipo insumo con gestión de inventario y descuento automático de cantidades al completar servicios',
      required_plans: 'pro,enterprise',
    },
    {
      module_code: 'services',
      feature_key: 'price_editing_in_appointment',
      name: 'Edición de precios en citas',
      description: 'Editar precios de servicios al crear citas',
      required_plans: 'pro,enterprise',
    },

    // Specialists module features
    {
      module_code: 'specialists',
      feature_key: 'goals_management',
      name: 'Gestión de metas',
      description: 'Definir y hacer seguimiento a metas de especialistas',
      required_plans: 'pro,enterprise',
    },

    // Reports module features
    {
      module_code: 'reports',
      feature_key: 'view_charts',
      name: 'Visualización de gráficos',
      description: 'Ver reportes en formato de gráficos',
      required_plans: 'pro,enterprise',
    },
    {
      module_code: 'reports',
      feature_key: 'view_revenue',
      name: 'Ver ingresos',
      description: 'Acceso a datos de ingresos',
      required_plans: 'free,basic,pro,enterprise',
    },
    {
      module_code: 'reports',
      feature_key: 'view_appointments',
      name: 'Ver citas',
      description: 'Acceso a estadísticas de citas',
      required_plans: 'free,basic,pro,enterprise',
    },
    {
      module_code: 'reports',
      feature_key: 'view_services',
      name: 'Ver servicios',
      description: 'Acceso a estadísticas de servicios',
      required_plans: 'free,basic,pro,enterprise',
    },
    {
      module_code: 'reports',
      feature_key: 'view_specialists',
      name: 'Ver especialistas',
      description: 'Acceso a estadísticas de especialistas',
      required_plans: 'free,basic,pro,enterprise',
    },
    {
      module_code: 'reports',
      feature_key: 'view_customers',
      name: 'Ver clientes',
      description: 'Acceso a estadísticas de clientes',
      required_plans: 'pro,enterprise',
    },
    {
      module_code: 'reports',
      feature_key: 'view_supplies',
      name: 'Ver insumos',
      description: 'Acceso a estadísticas de insumos',
      required_plans: 'pro,enterprise',
    },
    {
      module_code: 'reports',
      feature_key: 'view_portfolio',
      name: 'Ver cartera',
      description: 'Acceso a datos de cartera',
      required_plans: 'enterprise',
    },
    {
      module_code: 'reports',
      feature_key: 'export_data',
      name: 'Exportar datos',
      description: 'Exportar reportes a archivos',
      required_plans: 'pro,enterprise',
    },
  ] satisfies FeaturesMetadataRow[],
} as const

export interface FeaturesMetadataRow {
  module_code?: string
  feature_key?: string
  name: string
  description: string
  required_plans: string
}

export type DefaultPlanTemplates = typeof DEFAULT_PLAN_TEMPLATES