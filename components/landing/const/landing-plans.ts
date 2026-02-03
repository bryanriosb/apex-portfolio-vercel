// Constantes de planes para el landing basados en datos reales de la DB
// Sin fetching para mantener performance del landing

export interface LandingPlan {
  id: string
  code: string
  name: string
  description: string
  monthly_price_cents: number
  yearly_price_cents: number
  yearly_discount_percent: number
  max_businesses: number
  max_users_per_business: number
  max_specialists_per_business: number
  max_appointments_per_month: number | null
  max_customers: number | null
  max_services: number | null
  max_products: number | null
  features: {
    has_dashboard: boolean
    has_portfolio: boolean
    has_specialist_assignment: boolean
    has_dynamic_price: boolean
    has_whatsapp_notifications: boolean
    has_commissions: boolean
    has_charts_reports: boolean
    has_medical_record: boolean
    has_products: boolean
    has_stock: boolean
    has_goals_management: boolean
    has_custom_branding: boolean
    has_priority_support: boolean
    has_api_access: boolean
    has_whatsapp_owner: boolean
    has_ai_assistant_web: boolean
    has_ai_assistant_phone: boolean
    has_personalized_support: boolean
  }
  sort_order: number
}

export const LANDING_PLANS: LandingPlan[] = [
  {
    id: "b73b253f-620b-47e3-b265-20306d665b08",
    code: "basic",
    name: "Plan Básico",
    description: "Plan básico para comenzar",
    monthly_price_cents: 9990000,
    yearly_price_cents: 99500400,
    yearly_discount_percent: 17,
    max_businesses: 1,
    max_users_per_business: 5,
    max_specialists_per_business: 5,
    max_appointments_per_month: 500,
    max_customers: 200,
    max_services: 50,
    max_products: 100,
    features: {
      has_dashboard: true,
      has_portfolio: false,
      has_specialist_assignment: false,
      has_dynamic_price: false,
      has_whatsapp_notifications: false,
      has_commissions: false,
      has_charts_reports: false,
      has_medical_record: false,
      has_products: false,
      has_stock: false,
      has_goals_management: false,
      has_custom_branding: false,
      has_priority_support: false,
      has_api_access: false,
      has_whatsapp_owner: false,
      has_ai_assistant_web: false,
      has_ai_assistant_phone: false,
      has_personalized_support: false,
    },
    sort_order: 3,
  },
  {
    id: "4002e4a4-304a-4775-8faf-1e1e133b16be",
    code: "pro",
    name: "Plan Profesional",
    description: "Plan completo para negocios en crecimiento",
    monthly_price_cents: 24990000,
    yearly_price_cents: 248900400,
    yearly_discount_percent: 17,
    max_businesses: 3,
    max_users_per_business: 10,
    max_specialists_per_business: 10,
    max_appointments_per_month: null,
    max_customers: 1000,
    max_services: null,
    max_products: null,
    features: {
      has_dashboard: true,
      has_portfolio: true,
      has_specialist_assignment: true,
      has_dynamic_price: true,
      has_whatsapp_notifications: true,
      has_commissions: true,
      has_charts_reports: true,
      has_medical_record: true,
      has_products: true,
      has_stock: true,
      has_goals_management: true,
      has_custom_branding: true,
      has_priority_support: true,
      has_api_access: false,
      has_whatsapp_owner: false,
      has_ai_assistant_web: true,
      has_ai_assistant_phone: false,
      has_personalized_support: false,
    },
    sort_order: 4,
  },
  {
    id: "d48a8d41-f803-420e-9c85-827f1bcc15e0",
    code: "enterprise",
    name: "Plan Empresarial",
    description: "Solución completa para grandes empresas",
    monthly_price_cents: 54990000,
    yearly_price_cents: 547700400,
    yearly_discount_percent: 17,
    max_businesses: 10,
    max_users_per_business: 50,
    max_specialists_per_business: 50,
    max_appointments_per_month: null,
    max_customers: null,
    max_services: null,
    max_products: null,
    features: {
      has_dashboard: true,
      has_portfolio: true,
      has_specialist_assignment: true,
      has_dynamic_price: true,
      has_whatsapp_notifications: true,
      has_commissions: true,
      has_charts_reports: true,
      has_medical_record: true,
      has_products: true,
      has_stock: true,
      has_goals_management: true,
      has_custom_branding: true,
      has_priority_support: true,
      has_api_access: true,
      has_whatsapp_owner: true,
      has_ai_assistant_web: true,
      has_ai_assistant_phone: true,
      has_personalized_support: true,
    },
    sort_order: 5,
  },
]