import type { Metadata } from 'next'
import { CollectionModulePage } from '@/components/landing/modules/CollectionModulePage'

export const metadata: Metadata = {
  title: 'APEX Collection | Gestión de Cobro y Cartera B2B',
  description:
    'Agentes IA que ejecutan el ciclo de cobro y conciliación de forma autónoma. Reduzca su DSO, elimine tareas repetitivas y mejore su flujo de caja desde el primer mes.',
  openGraph: {
    title: 'APEX Collection | Gestión de Cobro y Cartera B2B',
    description:
      'Automatice el ciclo de cobro B2B con agentes IA. Conciliación, notificaciones multicanal y trazabilidad completa.',
    type: 'website',
  },
}

export default function Page() {
  return <CollectionModulePage />
}
