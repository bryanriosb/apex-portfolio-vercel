'use client'

import { useState, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, CheckCheck, Clock, XCircle } from 'lucide-react'
import WhatsAppService from '@/lib/services/whatsapp/whatsapp-service'
import type { WhatsAppMessage } from '@/lib/models/whatsapp/whatsapp-config'
import { cn } from '@/lib/utils'

interface WhatsAppMessageListProps {
  businessId: string
  customerPhone: string
}

export function WhatsAppMessageList({ businessId, customerPhone }: WhatsAppMessageListProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const whatsappService = new WhatsAppService()

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await whatsappService.fetchMessages({
          business_id: businessId,
          to_phone: customerPhone,
          page_size: 50,
        })
        setMessages(response.data)
      } catch (error) {
        console.error('Error loading messages:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMessages()
  }, [businessId, customerPhone])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay mensajes de WhatsApp
      </div>
    )
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3 text-muted-foreground" />
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />
      case 'failed':
        return <XCircle className="h-3 w-3 text-destructive" />
      default:
        return null
    }
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3 p-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex flex-col max-w-[80%] rounded-lg p-3',
              msg.direction === 'outbound'
                ? 'ml-auto bg-green-100 dark:bg-green-900/30'
                : 'mr-auto bg-muted'
            )}
          >
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-xs text-muted-foreground">
                {formatTime(msg.created_at)}
              </span>
              {msg.direction === 'outbound' && getStatusIcon(msg.status)}
            </div>
            {msg.status === 'failed' && msg.error_message && (
              <Badge variant="destructive" className="mt-1 text-xs">
                {msg.error_message}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
