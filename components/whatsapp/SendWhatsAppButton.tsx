'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { MessageSquare, Send, Loader2 } from 'lucide-react'
import WhatsAppService from '@/lib/services/whatsapp/whatsapp-service'
import { ConditionalFeature } from '@/components/plan/FeatureGate'

interface SendWhatsAppButtonProps {
  businessAccountId: string
  businessId: string
  customerPhone: string
  customerName: string
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function SendWhatsAppButton({
  businessAccountId,
  businessId,
  customerPhone,
  customerName,
  variant = 'ghost',
  size = 'icon',
}: SendWhatsAppButtonProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const whatsappService = new WhatsAppService()

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Escribe un mensaje')
      return
    }

    setIsSending(true)
    try {
      const result = await whatsappService.sendTextMessage({
        business_account_id: businessAccountId,
        business_id: businessId,
        to: customerPhone,
        message: message.trim(),
        customer_name: customerName,
      })

      if (result.success) {
        toast.success('Mensaje enviado')
        setMessage('')
        setOpen(false)
      } else {
        toast.error(result.error || 'Error al enviar')
      }
    } catch (error) {
      toast.error('Error al enviar mensaje')
    } finally {
      setIsSending(false)
    }
  }

  if (!customerPhone) return null

  return (
    <ConditionalFeature module="appointments" feature="whatsapp_notifications">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant={variant} size={size} title="Enviar WhatsApp">
            <MessageSquare className="h-4 w-4 text-green-600" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar WhatsApp</DialogTitle>
            <DialogDescription>
              Enviar mensaje a {customerName} ({customerPhone})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Mensaje</Label>
              <Textarea
                placeholder="Escribe tu mensaje..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending || !message.trim()}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{' '}
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ConditionalFeature>
  )
}
