'use client'

import * as React from 'react'
import Link from 'next/link'
import { LandingHeader } from '../LandingHeader'
import {
  Crosshair,
  AlertTriangle,
  Users,
  DollarSign,
  FileText,
  XCircle,
  Clock,
  BarChart3,
  Mail,
  CheckCircle2,
  ArrowRight,
  Layers,
  MessageSquare,
  RefreshCw,
  Monitor,
  LinkIcon,
  Shield,
  Zap,
  Target,
} from 'lucide-react'

const problems = [
  {
    icon: <Mail className="w-5 h-5" />,
    title: 'Falta de automatización en cobro',
    desc: '200 correos máximo en 6-8 horas para 4,000 clientes. La actividad de cobro no se cumple con consistencia.',
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: 'Sobrecarga operativa en soporte',
    desc: 'Hasta 300 correos diarios entre soportes de egresos, reclamos de facturación y conciliaciones de cartera.',
  },
  {
    icon: <DollarSign className="w-5 h-5" />,
    title: 'Cobros incorrectos o duplicados',
    desc: 'Clientes manifiestan que se les cobra lo que no corresponde o lo que ya pagaron. Genera desconfianza y retrabajo.',
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: 'Registro manual inseguro en ERP',
    desc: 'Recibos de caja creados completamente manual a partir de Excel. Sin investigación previa en ERP.',
  },
  {
    icon: <XCircle className="w-5 h-5" />,
    title: 'Pagos no identificados',
    desc: 'Sin NIT o información suficiente en la transacción. Desincronización de cartera y cobros indebidos.',
  },
  {
    icon: <RefreshCw className="w-5 h-5" />,
    title: 'Pagos desde NITs de grupos',
    desc: 'Cliente paga desde otro NIT del mismo grupo. Cuello de botella para normalizar y conciliar el pago.',
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: 'Ausencia de KPIs y control',
    desc: 'Sin indicadores de efectividad de cobro, aging con responsables, medición de reprocesos ni alertas tempranas.',
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: 'Promesas de pago sin trazabilidad',
    desc: '"Te pago el viernes" se anota en Excel o post-it. El viernes no entra el pago y el analista se olvida.',
  },
]

const solutions = [
  {
    icon: <Layers className="w-4 h-4" />,
    title: 'Motor de Plantillas',
    desc: 'Editor propio de plantillas de email con variables dinámicas por factura: nombre, NIT, número, valor, días mora.',
  },
  {
    icon: <Users className="w-4 h-4" />,
    title: 'Directorio de Clientes',
    desc: 'Carga de cartera de contactos con deduplicación. Base de datos de destinatarios centralizada.',
  },
  {
    icon: <RefreshCw className="w-4 h-4" />,
    title: 'Sincronización de Facturas',
    desc: 'Programación de sincronización de facturas pendientes/vencidas. Persiste datos en la ontología.',
  },
  {
    icon: <Mail className="w-4 h-4" />,
    title: 'Notificación Multicanal',
    desc: 'Detecta facturas pendientes y vencidas. Programa acción de cobro inmediata mediante correo, WhatsApp o SMS.',
  },
  {
    icon: <MessageSquare className="w-4 h-4" />,
    title: 'Agente Resolución',
    desc: 'El cliente responde al correo o whatsapp con comprobante. El agente procesa el documento e invoca HITL para aprobación.',
  },
  {
    icon: <CheckCircle2 className="w-4 h-4" />,
    title: 'Conciliación con HITL',
    desc: 'El humano confirma valores. El sistema actualiza ERP y ontología. Notifica al cliente.',
  },
  {
    icon: <Monitor className="w-4 h-4" />,
    title: 'Panel de Automatización',
    desc: 'Kanban en tiempo real de todas las actividades que ejecutan los agentes en background, por módulo.',
  },
  {
    icon: <LinkIcon className="w-4 h-4" />,
    title: 'Integraciones ERP',
    desc: 'Conectores MCP e integración directa con Odoo v10 a v17 y otros ERPs de la región.',
  },
]

const cycleSteps = [
  {
    num: '1',
    title: 'Observación y Detección',
    desc: 'El sistema monitorea continuamente facturas por vencer. Al detectar una pendiente, programa automáticamente la comunicación basándose en el comportamiento histórico del cliente.',
  },
  {
    num: '2',
    title: 'Comunicación Inteligente',
    desc: 'El agente envía notificación por correo electrónico con plantilla personalizada. El cliente puede responder directamente al correo con su posición sobre el pago.',
  },
  {
    num: '3',
    title: 'Conciliación con HITL',
    desc: 'Si el cliente adjunta comprobante de pago, el agente procesa el documento, identifica la transacción y escala al humano para aprobación.',
  },
  {
    num: '4',
    title: 'Sincronización ERP y Notificación',
    desc: 'El recibo de caja se registra en el ERP sin intervención humana adicional. El sistema notifica al cliente del estado.',
  },
]

const archCards = [
  {
    title: 'Arquitectura Multi-Empresa',
    desc: 'Aislamiento completo de datos entre clientes. Cada empresa opera en su propio entorno seguro con acceso basado en roles.',
    tags: ['SSO', 'RBAC', 'Audit Logs'],
  },
  {
    title: 'Expertis Humana, Ejecución IA',
    desc: 'Su equipo establece las reglas y prioridades. Los agentes IA ejecutan: seguimientos, conciliaciones, alertas.',
    tags: ['Aprobaciones', 'Escalamientos', 'Espacios de Trabajo'],
  },
  {
    title: 'Integraciones Enterprise',
    desc: 'Opera sobre su ERP actual sin reemplazarlo. Conexión directa con Odoo v10 a v17, sincronización con Excel y APIs REST.',
    tags: ['Odoo v10-17', 'Excel', 'REST API'],
  },
  {
    title: 'Compliance Local',
    desc: 'Diseñado para cumplir normativas colombianas y latinoamericanas. Trazabilidad completa y datos inmutables para auditorías.',
    tags: ['Ley 1581', 'DIAN', 'SFC'],
  },
]

export const CollectionModulePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <LandingHeader />

      {/* Hero */}
      <section className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-none">
            <Crosshair className="w-3 h-3" />
            <span>MÓDULO MVP — COLLECTION</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-gray-900 mb-6 tracking-tighter uppercase leading-[0.85]">
            Gestión de Cobro
            <br />
            <span className="text-primary">y Cartera B2B</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 font-bold max-w-3xl leading-relaxed mb-8">
            El primer módulo de APEX. Automatiza el ciclo de cobro B2B, reduce el DSO y libera a su equipo de
            tareas repetitivas — sin agregar headcount.
          </p>

          <div className="flex gap-4 flex-wrap">
            <a
              href="https://borls.com/contact"
              target="_blank"
              className="inline-flex items-center gap-2 bg-primary hover:text-white font-black text-xs uppercase tracking-widest rounded-none px-6 sm:px-8 py-4 border-2 border-gray-900 shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
            >
              Agendar Demo
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-transparent font-black text-xs uppercase tracking-widest rounded-none px-6 sm:px-8 py-4 border-2 border-gray-900 shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-gray-900 hover:text-primary"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </section>

      {/* Problema */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 md:px-12 bg-white border-y-4 border-gray-900">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-none">
            <AlertTriangle className="w-3 h-3" />
            <span>PROBLEMAS CRÍTICOS</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-8 tracking-tighter uppercase leading-none">
            El origen de APEX Collection
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {problems.map((p) => (
              <div
                key={p.title}
                className="flex items-start gap-3 p-4 bg-gray-50 border-2 border-gray-200 hover:border-red-300 transition-colors duration-300"
              >
                <div className="text-red-500 shrink-0 mt-0.5">{p.icon}</div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">
                    {p.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Soluciones */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-none">
            <CheckCircle2 className="w-3 h-3" />
            <span>FUNCIONALIDADES DEL MVP</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-8 tracking-tighter uppercase leading-none">
            Soluciones que ejecutan
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {solutions.map((s) => (
              <div
                key={s.title}
                className="bg-white/95 backdrop-blur-md border-4 border-gray-900 p-5 shadow-[8px_8px_0px_#000] hover:shadow-[12px_12px_0px_#1dcd9f] hover:-translate-x-1 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-2 text-primary">
                  {s.icon}
                  <span className="text-xs font-black uppercase tracking-widest">{s.title}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-red-50 border-2 border-red-200">
            <p className="text-sm text-gray-600">
              <span className="font-black uppercase tracking-widest text-red-500">Lo que el MVP NO hace:</span>{' '}
              No hace seguimiento telefónico, no genera acuerdos de pago automáticos, no hace predicciones. Es
              una herramienta de notificación inteligente con conciliación asistida por HITL inicialmente.
            </p>
          </div>
        </div>
      </section>

      {/* Ciclo de Cobro */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 md:px-12 bg-white border-y-4 border-gray-900">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-none">
            <Target className="w-3 h-3" />
            <span>CICLO DE RECAUDO AUTOMATIZADO</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-10 tracking-tighter uppercase leading-none">
            Cómo funciona
          </h2>

          <div className="relative pl-12 sm:pl-16">
            <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 bg-gray-300" />

            <div className="space-y-10">
              {cycleSteps.map((step) => (
                <div key={step.num} className="relative">
                  <div className="absolute -left-12 sm:-left-16 w-8 h-8 bg-primary flex items-center justify-center shadow-[3px_3px_0px_#000] border-2 border-gray-900 font-black text-white text-sm">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Arquitectura */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-none">
            <Shield className="w-3 h-3" />
            <span>ARQUITECTURA Y ESCALABILIDAD</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-8 tracking-tighter uppercase leading-none">
            Diseñado para crecer
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {archCards.map((card) => (
              <div
                key={card.title}
                className="bg-white/95 backdrop-blur-md border-4 border-gray-900 p-5 shadow-[8px_8px_0px_#000] hover:shadow-[12px_12px_0px_#1dcd9f] hover:-translate-x-1 hover:-translate-y-1 transition-all duration-300"
                style={{ borderLeft: '4px solid #1dcd9f' }}
              >
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">{card.desc}</p>
                <div className="flex gap-2 flex-wrap">
                  {card.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 border-2 border-gray-200 hover:border-primary transition-colors duration-300">
            <p className="text-sm text-gray-600">
              <span className="font-black uppercase tracking-widest text-primary">Trazabilidad y control total:</span>{' '}
              Cada acción de los agentes queda registrada en la ontología de cartera. Desde el envío de una
              notificación hasta la aprobación de un pago — todo es auditable, consultable y trazable en tiempo
              real.
            </p>
          </div>
        </div>
      </section>

      {/* Métricas */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 md:px-12 bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-10 tracking-tighter uppercase leading-none">
            Resultados que hablan
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 border-2 border-gray-700 hover:border-primary transition-colors duration-300">
              <div className="text-4xl sm:text-5xl font-black text-primary mb-2">30-50%</div>
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                Reducción en costos operativos de cobro
              </p>
            </div>
            <div className="p-6 border-2 border-gray-700 hover:border-primary transition-colors duration-300">
              <div className="text-4xl sm:text-5xl font-black text-primary mb-2">3x</div>
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                Más cuentas gestionadas por persona
              </p>
            </div>
            <div className="p-6 border-2 border-gray-700 hover:border-primary transition-colors duration-300">
              <div className="text-4xl sm:text-5xl font-black text-primary mb-2">&lt;3 meses</div>
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                ROI demostrable
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-none">
            <Zap className="w-3 h-3" />
            <span>COMIENZE HOY</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 tracking-tighter uppercase leading-none">
            Mejore su flujo de caja desde el primer mes
          </h2>

          <p className="text-lg text-gray-600 font-bold mb-10 max-w-2xl mx-auto">
            Agentes IA que ejecutan el ciclo de cobro y conciliación — su equipo se enfoca en estrategia y
            relaciones.
          </p>

          <div className="flex gap-4 flex-wrap justify-center">
            <a
              href="https://borls.com/contact"
              target="_blank"
              className="inline-flex items-center gap-2 bg-primary hover:text-white font-black text-xs uppercase tracking-widest rounded-none px-8 py-5 border-2 border-gray-900 shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
            >
              Agendar Demo
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-transparent font-black text-xs uppercase tracking-widest rounded-none px-8 py-5 border-2 border-gray-900 shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-gray-900 hover:text-primary"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </section>

      {/* Footer mínimo */}
      <footer className="py-8 px-4 sm:px-6 md:px-12 border-t-2 border-gray-200">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary flex items-center justify-center border border-gray-900">
              <Crosshair className="text-white w-3 h-3" />
            </div>
            <span className="text-xs font-black text-gray-900 uppercase tracking-widest">APEX</span>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            © 2026 BORLS. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
