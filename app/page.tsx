import type { Metadata } from 'next'
import { ScrollyLanding } from '@/components/landing/apex/ScrollyLanding'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://apex.borls.com'
// ... metadata stays same ...
export default function Home() {
  return (
    <main className="min-h-screen">
      <ScrollyLanding />
    </main>
  )
}
