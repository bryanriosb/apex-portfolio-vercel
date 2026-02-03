import { Plan } from '@/lib/models/plan/plan'

export const FEATURES = (plan: Plan) => {
  const {
    max_businesses,
    max_users_per_business,
    max_specialists_per_business,
  } = plan
  const {
    plan_code,
    has_stock,
    has_products,
    max_products,
    max_services,
    has_dashboard,
    has_portfolio,
    max_customers,
    has_api_access,
    has_commissions,
    has_dynamic_price,
    has_charts_reports,
    has_medical_record,
    has_whatsapp_owner,
    has_custom_branding,
    has_ai_assistant_web,
    has_goals_management,
    has_priority_support,
    has_ai_assistant_phone,
    has_personalized_support,
    has_specialist_assignment,
    has_whatsapp_notifications,
    max_appointments_per_month,
    has_all_pro,
  } = plan.features

  return [
    `Hasta ${max_businesses} negocio(s)`,
    `${max_users_per_business} usuarios por negocio`,
    `${max_specialists_per_business} especialistas`,
    max_appointments_per_month
      ? `${max_appointments_per_month} citas/mes`
      : 'Citas ilimitadas',
    max_customers ? `${max_customers} clientes` : 'Clientes ilimitados',
    max_services ? `${max_services} servicios` : 'Servicios ilimitados',
    has_all_pro && 'Todo lo del plan Profesional',
    has_dashboard && 'Tablero de control diario',
    has_specialist_assignment && 'Asignación inteligente de especialistas',
    has_dynamic_price && 'Edición de precios al crear citas',
    has_portfolio && 'Gestión de abonos y reporte de cartera',
    has_whatsapp_notifications && 'Notificaciones por WhatsApp',
    has_commissions && 'Gestión inteligente de comisiones por especialistas',
    has_charts_reports && plan_code === 'pro'
      ? 'Reportes avanzados'
      : plan_code === 'basic' && 'Reportes básicos',
    has_goals_management && 'Gestión de metas',
    has_medical_record &&
      'Gestión de historias clinicas (Según tipo de negocio)',
    has_products && `${max_products} Productos e Insumos`,
    has_stock && 'Gestión inteligente de insumos entre servicios completados',
    has_ai_assistant_web && 'Asistente inteligente web (Próximamente)',
    has_custom_branding && 'Marca personalizada',
    has_priority_support && 'Soporte prioritario',
    has_personalized_support && 'Soporte personalizado',
    has_api_access && 'Acceso API',
    has_whatsapp_owner && 'Configuración de WhatsApp Propietaria',
    has_ai_assistant_phone &&
      'Asistente inteligente de WhatsApp/Llamadas (Próximamente)',
  ].filter(Boolean) as string[]
}
