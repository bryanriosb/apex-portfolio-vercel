'use client'

import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Maria Garcia',
    role: 'Dueña de Salon Elegance',
    content: 'Desde que uso APEX, mis cancelaciones bajaron un 40%. Los recordatorios automáticos por WhatsApp son increíbles.',
    rating: 5,
    highlight: 'Reduce cancelaciones',
  },
  {
    name: 'Carlos Rodriguez',
    role: 'Barberia Urban Style',
    content: 'El control de inventario me ahorra horas cada semana. Ahora sé exactamente cuando necesito pedir productos.',
    rating: 5,
    highlight: 'Ahorra tiempo',
  },
  {
    name: 'Ana Martinez',
    role: 'Spa Zen Beauty',
    content: 'Los reportes me ayudan a tomar mejores decisiones. Vi un aumento del 25% en ingresos en solo 3 meses.',
    rating: 5,
    highlight: '+25% ingresos',
  },
  {
    name: 'Laura Fernandez',
    role: 'Studio Lash & Brow',
    content: 'Mis clientas aman poder agendar online 24/7. La plataforma es súper intuitiva y profesional.',
    rating: 5,
    highlight: 'Agenda 24/7',
  },
  {
    name: 'Roberto Sanchez',
    role: 'Barberia Premium',
    content: 'El soporte es excelente. Siempre responden rápido y me ayudan con cualquier duda.',
    rating: 5,
    highlight: 'Soporte excelente',
  },
  {
    name: 'Patricia Lopez',
    role: 'Nail Art Studio',
    content: 'Finalmente tengo todo en un solo lugar: citas, clientes, inventario y finanzas. Es exactamente lo que necesitaba.',
    rating: 5,
    highlight: 'Todo en uno',
  },
]

export function Testimonials() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/5 to-background" />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-sm font-medium mb-6"
          >
            <Star className="h-4 w-4 text-secondary fill-secondary" />
            Testimonios
          </motion.div>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Lo que dicen nuestros{' '}
            <span className="bg-gradient-to-r from-secondary via-accent to-secondary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              clientes felices
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Más de 500 negocios de belleza confían en nosotros para gestionar su operación
          </p>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} index={index} />
          ))}
        </div>

        {/* Bottom stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16"
        >
          <div className="text-center">
            <p className="text-4xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">4.9/5</p>
            <div className="flex items-center gap-1 justify-center mt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Calificación promedio</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">500+</p>
            <p className="text-sm text-muted-foreground mt-1">Reseñas positivas</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">98%</p>
            <p className="text-sm text-muted-foreground mt-1">Recomendarían APEX</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

interface TestimonialCardProps {
  testimonial: typeof testimonials[0]
  index: number
}

function TestimonialCard({ testimonial, index }: TestimonialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative"
    >
      <div className="relative h-full p-6 rounded-2xl bg-card border border-border/50 hover:border-secondary/30 transition-all duration-300 hover:shadow-xl hover:shadow-secondary/5">
        {/* Quote icon */}
        <div className="absolute -top-3 -left-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg">
            <Quote className="h-5 w-5 text-secondary" />
          </div>
        </div>

        {/* Highlight badge */}
        <div className="absolute top-4 right-4">
          <span className="inline-flex px-2.5 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-semibold">
            {testimonial.highlight}
          </span>
        </div>

        {/* Content */}
        <div className="pt-4">
          {/* Stars */}
          <div className="flex items-center gap-1 mb-4">
            {[...Array(testimonial.rating)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-primary text-primary" />
            ))}
          </div>

          {/* Quote */}
          <p className="text-foreground/90 leading-relaxed mb-6">
            "{testimonial.content}"
          </p>

          {/* Author */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary via-secondary/50 to-secondary flex items-center justify-center text-white font-bold">
              {testimonial.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p className="font-semibold">{testimonial.name}</p>
              <p className="text-sm text-muted-foreground">{testimonial.role}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
