import { TutorialStep } from '.'

export const ENABLE_BUSSINESS_HOURS_TUTORIALS: TutorialStep[] = [
  {
    target: 'settings-menu',
    content:
      'Antes de crear citas, debemos asegurarnos de configurar el horario de atención de tu negocio. Expandimos el menú de "Configuración".',
    title: 'Panel de Configuración',
    placement: 'right',
    disableBeacon: false,
    showProgress: true,
    showSkipButton: true,
    spotlightClicks: true,
    triggerAction: {
      type: 'click',
      selector: '[data-tutorial="settings-menu"]',
      delay: 300,
      waitForModal: false,
    },
  },
  {
    target: 'business-hours-menu',
    content:
      'Accede a la sección de "Horarios" para definir tus horas de operación.',
    title: 'Horarios de Atención',
    placement: 'right',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    triggerAction: {
      type: 'click',
      selector: '[data-tutorial="business-hours-menu"]',
      delay: 300,
      waitForModal: false,
    },
  },
  {
    target: 'business-hours-apply-all-button',
    content:
      'Para facilitar la configuración, puedes aplicar el mismo horario a todos los días.',
    title: 'Aplicar Horario a Todos los Días',
    placement: 'top',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    spotlightClicks: true,
    triggerAction: {
      type: 'click',
      selector: '[data-tutorial="business-hours-apply-all-button"]',
      delay: 300,
      waitForModal: false,
    },
  },
  {
    target: 'business-hours-save-button',
    content:
      'Guarda los cambios realizados en los horarios de atención haciendo clic en "Guardar".',
    title: 'Guardar Horarios',
    placement: 'right',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    triggerAction: {
      type: 'click',
      selector: '[data-tutorial="business-hours-save-button"]',
      delay: 300,
      waitForModal: false,
    },
  },
  {
    target: 'business-hours-menu',
    content:
      '¡Genial! Ya has configurado los horarios de atención de tu negocio. Ahora vamos a crear un servicio.',
    title: 'Horarios Configurados',
    placement: 'right',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/services',
  },
]
