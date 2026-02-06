const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://apex.borls.com'

interface ModernJsonLdProps {
  type: 'organization' | 'software'
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'APEX',
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  description:
    'Plataforma de recuperación de cartera serverless y automatizada.',
  foundingDate: '2026',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'sales',
    availableLanguage: ['Spanish', 'English'],
  },
}

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'APEX Collection System',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Cloud',
  url: siteUrl,
  description:
    'Sistema operativo de cobranza con arquitectura serverless, multi-canal y tracking en tiempo real.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Contact sales for pricing',
  },
}

export function ModernJsonLd({ type }: ModernJsonLdProps) {
  const schema = type === 'organization' ? organizationSchema : softwareSchema

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
