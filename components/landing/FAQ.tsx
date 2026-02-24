'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const faqs = [
  {
    question: '¿Cuánto tiempo toma configurar APEX?',
    answer:
      'La configuración inicial toma menos de 10 minutos. Nuestro asistente de configuración te guía paso a paso para agregar tus servicios, profesionales y horarios. Además, ofrecemos onboarding personalizado para planes Business.',
  },
  {
    question: '¿Puedo importar mis clientes existentes?',
    answer:
      'Sí, puedes importar tu base de datos de clientes desde Excel, CSV o directamente desde otras plataformas. Te ayudamos en el proceso para que no pierdas ninguna información.',
  },
  {
    question: '¿Cómo funciona la integración con WhatsApp?',
    answer:
      'Conectamos tu cuenta de WhatsApp Business para enviar recordatorios automáticos de citas, confirmaciones y mensajes de seguimiento. Todo configurado en minutos sin conocimientos técnicos.',
  },
  {
    question: '¿Puedo usar APEX en multiples dispositivos?',
    answer:
      'Sí, APEX funciona en cualquier dispositivo con navegador web: computadora, tablet o celular. Tu equipo puede acceder simultáneamente desde diferentes ubicaciones.',
  },
  {
    question: '¿Qué pasa si necesito cancelar mi suscripción?',
    answer:
      'Puedes cancelar en cualquier momento sin penalidades. No hay contratos de permanencia. Tus datos se mantienen seguros y puedes exportarlos cuando lo necesites.',
  },
  {
    question: '¿Ofrecen soporte en español?',
    answer:
      'Sí, nuestro equipo de soporte es 100% en español. Estamos disponibles por chat, email y WhatsApp para ayudarte con cualquier duda o problema.',
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />

      <div className="relative max-w-4xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 text-sm font-medium mb-6"
          >
            <HelpCircle className="h-4 w-4 text-secondary" />
            Preguntas frecuentes
          </motion.div>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            ¿Tienes{' '}
            <span className="bg-gradient-to-r from-secondary via-accent to-secondary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              dudas
            </span>
            ?
          </h2>
          <p className="text-lg text-muted-foreground">
            Aquí respondemos las preguntas más comunes sobre APEX
          </p>
        </motion.div>

        {/* FAQ items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              faq={faq}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-card border border-border/50">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
              <MessageCircle className="h-7 w-7 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <p className="font-semibold">¿No encontraste tu respuesta?</p>
              <p className="text-sm text-muted-foreground">
                Nuestro equipo está listo para ayudarte
              </p>
            </div>
            <a
              href="https://wa.me/573217278684?text=Hola%2C%20necesito%20ayuda%20con%20la%20plataforma"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button className="gap-2 rounded-full bg-gradient-to-r from-secondary to-accent text-white border-0">
                Contactar soporte
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

interface FAQItemProps {
  faq: (typeof faqs)[0]
  index: number
  isOpen: boolean
  onToggle: () => void
}

function FAQItem({ faq, index, isOpen, onToggle }: FAQItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <div
        className={`rounded-2xl border transition-all duration-300 ${
          isOpen
            ? 'bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30'
            : 'bg-card border-border/50 hover:border-primary/30'
        }`}
      >
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <span className="font-semibold pr-4">{faq.question}</span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              isOpen ? 'bg-secondary text-white' : 'bg-muted'
            }`}
          >
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="px-6 pb-6 text-muted-foreground leading-relaxed">
                {faq.answer}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
