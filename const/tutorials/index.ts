import { APPOINTMENTS_TUTORIALS } from './appointments'
import { ENABLE_BUSSINESS_HOURS_TUTORIALS } from './business-hours'
import { SERVICES_TUTORIALS } from './services'
import { SPECIALIST_TUTORIALS } from './specialists'

export interface TutorialSubStep {
  target: string
  content: string
  title?: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  disableBeacon?: boolean
  spotlightClicks?: boolean
  showProgress?: boolean
  showSkipButton?: boolean
}

export interface TutorialStep {
  target: string
  content: string
  title?: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  disableBeacon?: boolean
  spotlightClicks?: boolean
  hideBackButton?: boolean
  hideCloseButton?: boolean
  hideFooter?: boolean
  showProgress?: boolean
  showSkipButton?: boolean
  page?: string // La página donde debe aparecer este paso
  // Acción que se ejecuta automáticamente al llegar a este paso
  triggerAction?: {
    type: 'click' | 'open-modal' | 'close-modal'
    selector?: string // Selector del elemento a clickear (si aplica)
    delay?: number // Delay antes de ejecutar la acción (ms)
    waitForModal?: boolean // Esperar a que el modal esté visible antes de continuar
  }
  navigation?: {
    // Navegación automática al siguiente paso
    to?: string // URL a navegar
    delay?: number // Delay antes de navegar (ms)
    condition?: () => boolean // Condición para navegar
  }
  // Sub-pasos para modales anidados (ej: crear cliente dentro de crear cita)
  subSteps?: {
    triggerSelector: string // Selector del botón que abre el modal anidado
    modalSelector?: string // Selector del modal anidado (default: [role="dialog"])
    steps: TutorialSubStep[] // Pasos dentro del modal anidado
    onComplete?: 'close-modal' | 'continue' // Qué hacer al completar los sub-pasos
  }
  styles?: {
    options?: Record<string, any>
    tooltip?: Record<string, any>
    button?: Record<string, any>
    buttonNext?: Record<string, any>
    buttonBack?: Record<string, any>
    buttonClose?: Record<string, any>
    buttonSkip?: Record<string, any>
  }
}

export interface Tutorial {
  id: string
  name: string
  description: string
  steps: TutorialStep[]
  runCondition?: () => boolean
  onComplete?: () => void
}

export const TUTORIALS: Record<string, Tutorial> = {
  'appointment-start': {
    id: 'appointment-start',
    name: 'Guía de Inicio: Tu Primera Cita',
    description: 'Aprende a crear tu primer servicio, especialista y cita',
    steps: [
      ...ENABLE_BUSSINESS_HOURS_TUTORIALS,
      ...SERVICES_TUTORIALS,
      ...SPECIALIST_TUTORIALS,
      ...APPOINTMENTS_TUTORIALS,
    ],
  },
  // 'dashboard-overview': {
  //   id: 'dashboard-overview',
  //   name: 'Tour del Dashboard',
  //   description: 'Conoce las principales funcionalidades del dashboard',
  //   steps: [
  //     {
  //       target: 'business-switcher',
  //       content:
  //         'Si tienes múltiples negocios, puedes cambiar entre ellos aquí.',
  //       title: 'Selector de Negocio',
  //       placement: 'bottom',
  //       disableBeacon: false,
  //       showProgress: true,
  //     },
  //     {
  //       target: 'revenue-card',
  //       content: 'Visualiza tus ingresos en tiempo real.',
  //       title: 'Ingresos',
  //       placement: 'top',
  //       disableBeacon: true,
  //       showProgress: true,
  //     },
  //     {
  //       target: 'appointments-card',
  //       content: 'Resumen de tus citas del día.',
  //       title: 'Citas de Hoy',
  //       placement: 'top',
  //       disableBeacon: true,
  //       showProgress: true,
  //     },
  //     {
  //       target: 'customers-card',
  //       content: 'Estadísticas sobre tus clientes.',
  //       title: 'Clientes',
  //       placement: 'top',
  //       disableBeacon: true,
  //       showProgress: true,
  //     },
  //   ],
  // },
  // 'premium-features': {
  //   id: 'premium-features',
  //   name: 'Descubre las Funcionalidades Premium',
  //   description:
  //     'Explora todas las características avanzadas disponibles en planes premium',
  //   steps: [
  //     {
  //       target: 'whatsapp-integration',
  //       content:
  //         'Envía confirmaciones y recordatorios automáticos por WhatsApp.',
  //       title: '📱 Integración con WhatsApp',
  //       placement: 'right',
  //       disableBeacon: false,
  //       showProgress: true,
  //     },
  //     {
  //       target: 'inventory-management',
  //       content: 'Controla tu inventario y recibe alertas de bajo stock.',
  //       title: '📦 Gestión de Inventario',
  //       placement: 'left',
  //       disableBeacon: true,
  //       showProgress: true,
  //     },
  //     {
  //       target: 'commission-system',
  //       content: 'Calcula automáticamente las comisiones de tus especialistas.',
  //       title: '💰 Sistema de Comisiones',
  //       placement: 'left',
  //       disableBeacon: true,
  //       showProgress: true,
  //     },
  //     {
  //       target: 'advanced-reports',
  //       content: 'Genera reportes detallados de tu negocio.',
  //       title: '📊 Reportes Avanzados',
  //       placement: 'left',
  //       disableBeacon: true,
  //       showProgress: true,
  //     },
  //     {
  //       target: 'online-booking',
  //       content: 'Permite que tus clientes reserven citas online.',
  //       title: '🌐 Reservas Online',
  //       placement: 'left',
  //       disableBeacon: true,
  //       showProgress: true,
  //     },
  //   ],
  // },
}
