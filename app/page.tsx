import type { Metadata } from 'next'
import {
  Navbar,
  Hero,
  TrustBadges,
  Features,
  About,
  Testimonials,
  Services,
  Pricing,
  FAQ,
  CTA,
  Footer,
} from '@/components/landing'
import { JsonLd } from '@/components/seo/JsonLd'
import { LANDING_IMAGES } from '@/lib/config/supabase-images'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://beluvio.borls.com'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'

export const metadata: Metadata = {
  title:
    'Beluvio | Software de Gestión para Negocios de Belleza, Estéticas y Spas',
  description:
    'Plataforma todo-en-uno para gestionar tu estética, spa, barbería o centro de belleza. Agenda inteligente, WhatsApp integrado, asistente IA 24/7, control de inventario y reportes avanzados. Prueba gratis.',
  keywords: [
    'software estética',
    'software spa',
    'software barbería',
    'software centro de belleza',
    'gestión salón de belleza',
    'agenda citas belleza',
    'software peluquería',
    'programa gestión estética',
    'app para estéticas',
    'sistema citas belleza',
    'software clínica estética',
    'gestión negocios belleza',
    'agenda online belleza',
    'crm estética',
    'facturación estética',
  ],
  authors: [{ name: 'Beluvio', url: siteUrl }],
  creator: 'Beluvio',
  publisher: 'Beluvio',
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
  alternates: {
    canonical: siteUrl,
    languages: {
      'es-ES': siteUrl,
      'es-CO': siteUrl,
      'es-MX': siteUrl,
      'es-AR': siteUrl,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: siteUrl,
    siteName: 'Beluvio',
    title: 'Beluvio | Software de Gestión para Negocios de Belleza',
    description:
      'Plataforma todo-en-uno para gestionar tu estética, spa o centro de belleza. Agenda inteligente, WhatsApp integrado y asistente IA 24/7. Prueba gratis.',
    images: [
      {
        url: `${supabaseUrl}/storage/v1/object/public/landing/salon-de-belleza-moderno-beluvio/salon-de-belleza-moderno-beluvio-desktop.webp`,
        width: 1200,
        height: 900,
        alt: 'Beluvio - Software de Gestión para Negocios de Belleza',
        type: 'image/webp',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Beluvio | Software de Gestión para Negocios de Belleza',
    description:
      'Plataforma todo-en-uno para gestionar tu estética, spa o centro de belleza. Agenda inteligente, WhatsApp integrado y asistente IA 24/7.',
    images: [`${supabaseUrl}/storage/v1/object/public/landing/salon-de-belleza-moderno-beluvio/salon-de-belleza-moderno-beluvio-desktop.webp`],
    creator: '@beluvio',
  },
  category: 'Software',
  verification: {
    google: 'tu-codigo-de-verificacion-google',
  },
}

export default function Home() {
  return (
    <>
      <JsonLd type="all" />
      <main className="min-h-screen">
        <Navbar />
        <Hero />
        <TrustBadges />
        <Features />
        <About />
        <Services />
        <Pricing />
        <FAQ />
        <CTA />
        <Footer />
      </main>
    </>
  )
}
