import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { AppointmentPaymentWithCreator } from '@/lib/models/appointment-payment/appointment-payment'
import type { PaymentMethod } from '@/lib/types/enums'

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  AT_VENUE: 'Efectivo',
  CREDIT_CARD: 'Tarjeta de Crédito',
  NEQUI: 'Nequi',
  PAYPAL: 'PayPal',
}

export interface PaymentReceiptData {
  payment: AppointmentPaymentWithCreator
  businessName: string
  businessAddress?: string
  businessPhone?: string
  businessNit?: string
  customerName: string
  appointmentDate: string
  services: Array<{ name: string; price_cents: number }>
  totalPriceCents: number
  totalPaidCents: number
  balanceDueCents: number
}

export function generatePaymentReceiptPDF(data: PaymentReceiptData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200],
  })

  const pageWidth = 80
  const margin = 5
  const contentWidth = pageWidth - margin * 2
  let y = 10

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(data.businessName.toUpperCase(), pageWidth / 2, y, { align: 'center' })
  y += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  if (data.businessAddress) {
    doc.text(data.businessAddress, pageWidth / 2, y, { align: 'center' })
    y += 4
  }
  if (data.businessPhone) {
    doc.text(`Tel: ${data.businessPhone}`, pageWidth / 2, y, { align: 'center' })
    y += 4
  }
  if (data.businessNit) {
    doc.text(`NIT: ${data.businessNit}`, pageWidth / 2, y, { align: 'center' })
    y += 4
  }

  y += 2
  doc.setLineWidth(0.1)
  doc.line(margin, y, pageWidth - margin, y)
  y += 4

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('COMPROBANTE DE ABONO', pageWidth / 2, y, { align: 'center' })
  y += 6

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')

  const paymentDate = format(new Date(data.payment.payment_date), "d 'de' MMMM yyyy, HH:mm", {
    locale: es,
  })
  doc.text(`Fecha: ${paymentDate}`, margin, y)
  y += 4

  doc.text(`No. Recibo: ${data.payment.id.slice(0, 8).toUpperCase()}`, margin, y)
  y += 6

  doc.line(margin, y, pageWidth - margin, y)
  y += 4

  doc.setFont('helvetica', 'bold')
  doc.text('CLIENTE', margin, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.text(data.customerName, margin, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.text('CITA', margin, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  const appointmentDate = format(new Date(data.appointmentDate), "d 'de' MMMM yyyy", {
    locale: es,
  })
  doc.text(appointmentDate, margin, y)
  y += 6

  if (data.services.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text('SERVICIOS', margin, y)
    y += 4
    doc.setFont('helvetica', 'normal')

    data.services.forEach((service) => {
      const serviceText = service.name
      const priceText = `$${(service.price_cents / 100).toLocaleString('es-CO')}`

      const textWidth = doc.getTextWidth(serviceText)
      const maxWidth = contentWidth - doc.getTextWidth(priceText) - 2

      if (textWidth > maxWidth) {
        const truncated = serviceText.substring(0, 20) + '...'
        doc.text(truncated, margin, y)
      } else {
        doc.text(serviceText, margin, y)
      }
      doc.text(priceText, pageWidth - margin, y, { align: 'right' })
      y += 4
    })
    y += 2
  }

  doc.line(margin, y, pageWidth - margin, y)
  y += 4

  doc.text('Total servicios:', margin, y)
  doc.text(`$${(data.totalPriceCents / 100).toLocaleString('es-CO')}`, pageWidth - margin, y, {
    align: 'right',
  })
  y += 4

  doc.text('Total abonado:', margin, y)
  doc.text(`$${(data.totalPaidCents / 100).toLocaleString('es-CO')}`, pageWidth - margin, y, {
    align: 'right',
  })
  y += 4

  doc.setFont('helvetica', 'bold')
  doc.text('Saldo pendiente:', margin, y)
  doc.text(`$${(data.balanceDueCents / 100).toLocaleString('es-CO')}`, pageWidth - margin, y, {
    align: 'right',
  })
  y += 6

  doc.line(margin, y, pageWidth - margin, y)
  y += 4

  doc.setFont('helvetica', 'bold')
  doc.text('DETALLE DEL ABONO', margin, y)
  y += 5

  doc.setFontSize(12)
  doc.text(`$${(data.payment.amount_cents / 100).toLocaleString('es-CO')}`, pageWidth / 2, y, {
    align: 'center',
  })
  y += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Método: ${PAYMENT_METHOD_LABELS[data.payment.payment_method]}`, pageWidth / 2, y, {
    align: 'center',
  })
  y += 4

  if (data.payment.notes) {
    doc.text(`Nota: ${data.payment.notes}`, margin, y, {
      maxWidth: contentWidth,
    })
    y += 6
  }

  y += 4
  doc.line(margin, y, pageWidth - margin, y)
  y += 4

  doc.setFontSize(7)
  doc.text('Este documento es un comprobante de abono.', pageWidth / 2, y, { align: 'center' })
  y += 3
  doc.text('Gracias por su preferencia.', pageWidth / 2, y, { align: 'center' })

  return doc
}

export function downloadPaymentReceiptPDF(data: PaymentReceiptData): void {
  const doc = generatePaymentReceiptPDF(data)
  const filename = `comprobante_${data.payment.id.slice(0, 8)}_${format(
    new Date(data.payment.payment_date),
    'yyyyMMdd'
  )}.pdf`
  doc.save(filename)
}

export function generatePaymentReceiptWhatsAppMessage(data: PaymentReceiptData): string {
  const paymentDate = format(new Date(data.payment.payment_date), "d 'de' MMMM yyyy, HH:mm", {
    locale: es,
  })

  const appointmentDate = format(new Date(data.appointmentDate), "d 'de' MMMM yyyy", {
    locale: es,
  })

  const servicesList = data.services.map((s) => `   • ${s.name}`).join('\n')

  const message = `🧾 *COMPROBANTE DE ABONO*

━━━━━━━━━━━━━━━━━━━━━

📍 *${data.businessName}*${data.businessAddress ? `\n${data.businessAddress}` : ''}${data.businessPhone ? `\nTel: ${data.businessPhone}` : ''}${data.businessNit ? `\nNIT: ${data.businessNit}` : ''}

━━━━━━━━━━━━━━━━━━━━━

👤 *Cliente:* ${data.customerName}
📅 *Cita:* ${appointmentDate}
🕐 *Fecha abono:* ${paymentDate}
🔢 *No. Recibo:* ${data.payment.id.slice(0, 8).toUpperCase()}

━━━━━━━━━━━━━━━━━━━━━

💇 *Servicios:*
${servicesList}

━━━━━━━━━━━━━━━━━━━━━

💰 *RESUMEN DE PAGO*

Total servicios: $${(data.totalPriceCents / 100).toLocaleString('es-CO')}
Total abonado: $${(data.totalPaidCents / 100).toLocaleString('es-CO')}
*Saldo pendiente: $${(data.balanceDueCents / 100).toLocaleString('es-CO')}*

━━━━━━━━━━━━━━━━━━━━━

✅ *ABONO REGISTRADO*

💵 *Monto: $${(data.payment.amount_cents / 100).toLocaleString('es-CO')}*
📝 Método: ${PAYMENT_METHOD_LABELS[data.payment.payment_method]}${data.payment.notes ? `\n📌 Nota: ${data.payment.notes}` : ''}

━━━━━━━━━━━━━━━━━━━━━

_Este mensaje es un comprobante de su abono._
_¡Gracias por su preferencia!_ ✨`

  return message
}
