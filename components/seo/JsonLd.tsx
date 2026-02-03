const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://beluvio.com'

interface JsonLdProps {
  type: 'organization' | 'software' | 'faq' | 'webpage' | 'all'
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Beluvio',
  url: siteUrl,
  logo: `${siteUrl}/beluvio.svg`,
  description:
    'Plataforma de gestión todo-en-uno para negocios de belleza, estéticas, spas y centros de bienestar.',
  foundingDate: '2024',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+57-321-727-8684',
    contactType: 'customer service',
    availableLanguage: ['Spanish'],
    areaServed: ['CO', 'MX', 'ES', 'AR', 'CL', 'PE', 'EC'],
  },
  sameAs: [
    'https://www.instagram.com/beluvio',
    'https://www.facebook.com/beluvio',
    'https://twitter.com/beluvio',
  ],
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'CO',
  },
}

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Beluvio',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web Browser',
  url: siteUrl,
  description:
    'Software de gestión para estéticas, spas, barberías y centros de belleza. Incluye agenda inteligente, WhatsApp integrado, asistente IA y control de inventario.',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '0',
    highPrice: '99',
    offerCount: '3',
    offers: [
      {
        '@type': 'Offer',
        name: 'Plan Básico',
        price: '0',
        priceCurrency: 'USD',
        description: 'Perfecto para empezar - Funcionalidades básicas gratis',
      },
      {
        '@type': 'Offer',
        name: 'Plan Profesional',
        price: '29',
        priceCurrency: 'USD',
        description: 'Para negocios en crecimiento - Todas las funcionalidades',
      },
      {
        '@type': 'Offer',
        name: 'Plan Enterprise',
        price: '99',
        priceCurrency: 'USD',
        description:
          'Para grandes negocios - Soporte premium y personalización',
      },
    ],
  },
  featureList: [
    'Agenda inteligente con calendario visual',
    'Recordatorios automáticos por WhatsApp',
    'Asistente IA 24/7',
    'Control de inventario en tiempo real',
    'Gestión de clientes y fidelización',
    'Reportes avanzados y métricas',
    'Facturación electrónica',
    'Gestión de comisiones',
  ],
  screenshot: `${siteUrl}/og-image.jpg`,
  softwareVersion: '1.0',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '500',
    bestRating: '5',
    worstRating: '1',
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Cuánto tiempo toma configurar Beluvio?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'La configuración inicial toma menos de 15 minutos. Nuestro asistente de configuración te guía paso a paso para agregar tus servicios, profesionales y horarios. Además, ofrecemos onboarding personalizado para planes Business.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Puedo importar mis clientes existentes?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí, puedes importar tu base de datos de clientes desde Excel, CSV o directamente desde otras plataformas. Te ayudamos en el proceso para que no pierdas ninguna información.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cómo funciona la integración con WhatsApp?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Conectamos tu cuenta de WhatsApp Business para enviar recordatorios automáticos de citas, confirmaciones y mensajes de seguimiento. Todo configurado en minutos sin conocimientos técnicos.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Puedo usar Beluvio en múltiples dispositivos?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí, Beluvio funciona en cualquier dispositivo con navegador web: computadora, tablet o celular. Tu equipo puede acceder simultáneamente desde diferentes ubicaciones.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Qué pasa si necesito cancelar mi suscripción?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Puedes cancelar en cualquier momento sin penalidades. No hay contratos de permanencia. Tus datos se mantienen seguros y puedes exportarlos cuando lo necesites.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Ofrecen soporte en español?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí, nuestro equipo de soporte es 100% en español. Estamos disponibles por chat, email y WhatsApp para ayudarte con cualquier duda o problema.',
      },
    },
  ],
}

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Beluvio - Software de Gestión para Negocios de Belleza',
  description:
    'Plataforma todo-en-uno para gestionar tu estética, spa, barbería o centro de belleza.',
  url: siteUrl,
  isPartOf: {
    '@type': 'WebSite',
    name: 'Beluvio',
    url: siteUrl,
  },
  about: {
    '@type': 'Thing',
    name: 'Software de gestión para negocios de belleza',
  },
  mainContentOfPage: {
    '@type': 'WebPageElement',
    cssSelector: 'main',
  },
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', '.hero-description'],
  },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: siteUrl,
      },
    ],
  },
}

export function JsonLd({ type }: JsonLdProps) {
  const getSchema = () => {
    switch (type) {
      case 'organization':
        return organizationSchema
      case 'software':
        return softwareSchema
      case 'faq':
        return faqSchema
      case 'webpage':
        return webPageSchema
      case 'all':
        return [organizationSchema, softwareSchema, faqSchema, webPageSchema]
      default:
        return null
    }
  }

  const schema = getSchema()
  if (!schema) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
