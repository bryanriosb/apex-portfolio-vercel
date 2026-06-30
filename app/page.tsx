import dynamic from 'next/dynamic'

const ScrollyLanding = dynamic(
  () => import('@/components/landing/apex/ScrollyLanding').then((mod) => mod.ScrollyLanding),
  { ssr: false }
)

export default function Home() {
  return (
    <main className="min-h-screen">
      <ScrollyLanding />
    </main>
  )
}
