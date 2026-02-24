// Configuración de URLs de Supabase para imágenes optimizadas
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const BUCKET_NAME = 'landing'

export const getImageUrl = (imagePath: string, size: 'mobile' | 'tablet' | 'desktop' | 'hd' = 'desktop') => {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${imagePath}/${imagePath}-${size}.webp`
}

// URLs específicas para las imágenes del landing
export const LANDING_IMAGES = {
  hero: getImageUrl('salon-de-belleza-moderno-APEX', 'desktop'),
  services: {
    treatment: getImageUrl('mujer-recibiendo-tratameinto-facial-en-salon-estetica-APEX', 'desktop'),
    haircare: getImageUrl('tratamiento-capilar-en-peluqieria-APEX', 'desktop'),
  },
  features: getImageUrl('centro-cirugia-plastica-APEX', 'desktop'),
  about: getImageUrl('tratamiento-facial-por-experto-APEX', 'desktop'),
  openGraph: getImageUrl('salon-de-belleza-moderno-APEX', 'desktop'),
}

export default LANDING_IMAGES