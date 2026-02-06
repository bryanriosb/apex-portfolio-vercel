import type { Metadata } from 'next'
import { ScrollyLanding } from '@/components/landing/modern/ScrollyLanding'
import { ModernFeatures } from '@/components/landing/modern/ModernFeatures'
import { ModernFooter } from '@/components/landing/modern/ModernFooter'
import { ModernJsonLd } from '@/components/seo/ModernJsonLd'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://apex.borls.com'

export const metadata: Metadata = {
  title: 'APEX | Sistema Operativo de Cobranza Inteligente',
  description:
    'Plataforma de recuperación de cartera serverless. Procesamiento masivo, orquestación de notificaciones multi-canal y tracking en tiempo real.',
  keywords: [
    'APEX',
    'software cobranza',
    'recuperacion cartera',
    'aws serverless',
    'cobranza automatizada',
    'fintech collection',
    'sistema de cobros',
    'gestion de deuda'
  ],
  authors: [{ name: 'APEX', url: siteUrl }],
  creator: 'APEX',
  publisher: 'APEX',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: siteUrl,
    siteName: 'APEX',
    title: 'APEX | Cobranza Inteligente & Ejecución Implacable',
    description:
      'Infraestructura de cobranza para la era moderna. Escala tus operaciones de recuperación con nuestra arquitectura serverless.',
    images: [
      {
        url: '/og-image.webp',
        width: 1200,
        height: 630,
        alt: 'APEX Collection System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'APEX | Sistema de Cobranza',
    description:
      'Recuperación de cartera automatizada con tracking en tiempo real.',
    creator: '@apex_collection',
  },
}

export default function Home() {
  return (
    <>
      <ModernJsonLd type="organization" /> 
      <main className="min-h-screen bg-black text-white selection:bg-blue-500/30">
        <ScrollyLanding />
        <ModernFeatures />
        <ModernFooter />
      </main>
    </>
  )
}

