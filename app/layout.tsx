import type { Metadata, Viewport } from 'next'
import { GoogleTagManager } from '@next/third-parties/google'
import './globals.css'
import 'react-phone-number-input/style.css'
import { Toaster } from '@/components/ui/sonner'
import { ClientProviders } from './providers'
import { Analytics } from '@/components/analytics'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portfolio.borls.com'
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Beluvio | Software de Gestión para Negocios de Belleza',
    template: '%s | Beluvio',
  },
  description:
    'Plataforma todo-en-uno para gestionar tu estética, spa, barbería o centro de belleza. Agenda inteligente, WhatsApp integrado, asistente IA 24/7.',
  applicationName: 'Beluvio',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-screen w-full" suppressHydrationWarning>
      {GTM_ID && <GoogleTagManager gtmId={GTM_ID} />}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="h-full">
        <ClientProviders>{children}</ClientProviders>
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}
