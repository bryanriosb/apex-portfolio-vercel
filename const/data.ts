import { Box, Circle, ShieldCheck, Star, TriangleAlert } from 'lucide-react'

export const statuses = [
  {
    value: 'Asegurado',
    label: 'Asegurado',
    icon: ShieldCheck,
  },
  {
    value: 'Comprar',
    label: 'Comprar',
    icon: TriangleAlert,
  },
]

export const abcClassifications = [
  {
    label: 'A',
    value: 'A',
    icon: Star,
  },
  {
    label: 'B',
    value: 'B',
    icon: Circle,
  },
  {
    label: 'C',
    value: 'C',
    icon: Box,
  },
]
