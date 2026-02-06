'use client'

import { motion } from 'framer-motion'
import { LayoutTemplate, Share2, ShieldCheck, BarChart3, Smartphone, Zap } from 'lucide-react'

const features = [
  {
    icon: LayoutTemplate,
    title: "Motor de Plantillas Dinámico",
    description: "Editor visual TipTap + Handlebars rendering. Personalización profunda con variables inyectadas en runtime.",
    tech: "TipTap / Handlebars"
  },
  {
    icon: Share2,
    title: "Estrategia Multi-Canal",
    description: "Fallback automático. Si el email rebota, el sistema activa SMS o WhatsApp para garantizar la entrega.",
    tech: "SES / Twilio / Meta API"
  },
  {
    icon: BarChart3,
    title: "Analytics en Tiempo Real",
    description: "Dashboard vivo. Tracking de aperturas, clicks y rebotes mediante webhooks de SNS procesados por Lambda.",
    tech: "AWS SNS / EventBridge"
  },
  {
    icon: ShieldCheck,
    title: "Seguridad Bancaria",
    description: "Adjuntos firmados temporalmente. Los datos sensibles nunca tocan el frontend sin autorización.",
    tech: "RLS / Signed URLs"
  },
  {
    icon: Smartphone,
    title: "Responsive First",
    description: "Emails optimizados para móviles con CSS inline automático para máxima compatibilidad de clientes.",
    tech: "MimeText / Inline CSS"
  },
  {
    icon: Zap,
    title: "Rendimiento Extremo",
    description: "Arquitectura Rust en Lambda para tiempos de arranque en frío mínimos y procesamiento de miles de registros.",
    tech: "Rust / AWS Lambda"
  }
]

export function ModernFeatures() {
  return (
    <section className="py-32 bg-zinc-950 text-white border-t border-white/10">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-1px bg-white/10 border border-white/10">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-zinc-950 p-8 hover:bg-zinc-900 transition-colors group border-b border-r border-white/5"
            >
              <div className="flex items-start justify-between mb-6">
                <feature.icon className="w-8 h-8 text-gray-500 group-hover:text-white transition-colors" />
                <span className="text-[10px] font-mono border border-white/10 px-2 py-1 rounded text-gray-500">
                  {feature.tech}
                </span>
              </div>
              <h3 className="text-xl font-medium mb-3 group-hover:text-blue-200 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
