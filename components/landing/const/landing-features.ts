import type { LandingPlan } from './landing-plans'

/**
 * Genera las características para mostrar en el landing basado en el plan
 * Basado en la estructura de plan_module_access pero simplificado para el landing
 */
export const LANDING_FEATURES = (plan: LandingPlan): string[] => {
  const {
    max_businesses,
    max_users_per_business,
    max_specialists_per_business,
    max_appointments_per_month,
    max_customers,
    max_services,
    max_products,
  } = plan

  const {
    has_dashboard,
    has_portfolio,
    has_specialist_assignment,
    has_dynamic_price,
    has_whatsapp_notifications,
    has_commissions,
    has_charts_reports,
    has_medical_record,
    has_products,
    has_stock,
    has_goals_management,
    has_custom_branding,
    has_priority_support,
    has_api_access,
    has_whatsapp_owner,
    has_ai_assistant_web,
    has_ai_assistant_phone,
    has_personalized_support,
  } = plan.features

  // Características del plan Professional que no se repetirán en Enterprise
  const professionalFeatures = [
    has_dashboard && 'Tablero de control',
    has_specialist_assignment && 'Asignación inteligente de especialistas',
    has_dynamic_price && 'Edición de precios en citas',
    has_whatsapp_notifications && 'Notificaciones por WhatsApp',
    has_portfolio && 'Gestión de abonos y cartera',
    has_commissions && 'Gestión de comisiones por especialista',
    has_charts_reports && 'Reportes avanzados',
    has_medical_record && 'Historias clínicas con firma digital',
    has_products && 'Gestión de productos',
    has_stock && 'Gestión inteligente de inventario',
    has_goals_management && 'Gestión de metas',
    has_custom_branding && 'Marca personalizada',
    has_priority_support && 'Soporte prioritario',
    has_ai_assistant_web && 'Asistente IA web',
  ]

  // Para plan Enterprise: resumen de Profesional al inicio + características exclusivas
  if (plan.code === 'enterprise') {
    const enterpriseFeatures = [
      has_api_access && 'Acceso API',
      has_whatsapp_owner && 'WhatsApp propio',
      has_ai_assistant_phone && 'Asistente IA llamadas',
      has_personalized_support && 'Soporte personalizado 24/7',
    ].filter(Boolean) as string[]

    return [
      // Resumen al inicio
      'Todas las características del plan Profesional',

      // Citas y clientes
      max_appointments_per_month
        ? `Hasta ${max_appointments_per_month} citas/mes`
        : 'Citas ilimitadas',
      max_customers ? `Hasta ${max_customers} clientes` : 'Clientes ilimitados',

      // Servicios y productos
      max_services ? `Hasta ${max_services} servicios` : 'Servicios ilimitados',
      max_products ? `Hasta ${max_products} productos` : 'Productos ilimitados',

      ...enterpriseFeatures,
    ]
  }

  const features = [
    // Límites básicos (solo para Basic y Professional)
    ...(plan.code === 'basic' || plan.code === 'pro'
      ? [
          `Hasta ${max_businesses} negocio(s)`,
          `${max_users_per_business} usuarios por negocio`,
          `${max_specialists_per_business} especialistas`,
        ]
      : []),

    // Citas y clientes
    max_appointments_per_month
      ? `Hasta ${max_appointments_per_month} citas/mes`
      : 'Citas ilimitadas',
    max_customers ? `Hasta ${max_customers} clientes` : 'Clientes ilimitados',

    // Servicios y productos
    max_services ? `Hasta ${max_services} servicios` : 'Servicios ilimitados',
    max_products ? `Hasta ${max_products} productos` : 'Productos ilimitados',

    // Para plan Professional: incluir todas sus características
    ...(plan.code === 'pro' ? professionalFeatures.filter(Boolean) : []),

    // Para plan Basic: características básicas
    ...(plan.code === 'basic'
      ? [
          has_dashboard && 'Tablero de control',
          has_charts_reports && 'Reportes básicos',
        ].filter(Boolean)
      : []),
  ]

  // Filtrar valores falsy y mantener el orden
  return features.filter(Boolean) as string[]
}

/**
 * Determina si un plan es popular (usualmente el plan pro)
 */
export const isPlanPopular = (plan: LandingPlan): boolean => {
  return plan.code === 'pro'
}

/**
 * Formatea precio a moneda Colombiana
 */
export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

/**
 * Obtiene el texto para el botón CTA basado en el plan
 */
export const getCTAText = (plan: LandingPlan): string => {
  if (plan.code === 'basic') {
    return 'Comenzar'
  } else if (plan.code === 'pro') {
    return 'Comenzar prueba gratis'
  } else if (plan.code === 'enterprise') {
    return 'Contactar ventas'
  }
  return 'Comenzar'
}

/**
 * Obtiene el href para el botón CTA basado en el plan
 */
export const getCTAHref = (plan: LandingPlan): string => {
  if (plan.code === 'basic') {
    return '/auth/sign-up'
  } else if (plan.code === 'pro') {
    return '/auth/sign-up'
  } else if (plan.code === 'enterprise') {
    return 'https://wa.me/573217278684?text=Hola%2C%20estoy%20interesado%20en%20el%20Plan%20Empresarial'
  }
  return '/auth/sign-up'
}

/**
 * Determina si el plan debe mostrar precio
 */
export const shouldShowPrice = (plan: LandingPlan): boolean => {
  return plan.code !== 'enterprise'
}
