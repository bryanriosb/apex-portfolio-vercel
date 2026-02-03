'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Send, Loader2, MessageSquare, Check, CheckCheck, Clock, XCircle, RefreshCw } from 'lucide-react'
import WhatsAppService from '@/lib/services/whatsapp/whatsapp-service'
import type { WhatsAppMessage } from '@/lib/models/whatsapp/whatsapp-config'
import { cn } from '@/lib/utils'

interface WhatsAppChatProps {
  businessAccountId: string
  businessId: string
  customerPhone: string
  customerName: string
  className?: string
}

export function WhatsAppChat({
  businessAccountId,
  businessId,
  customerPhone,
  customerName,
  className,
}: WhatsAppChatProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const whatsappService = new WhatsAppService()

  const loadMessages = async (showLoader = true) => {
    if (showLoader) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const response = await whatsappService.fetchMessages({
        business_id: businessId,
        to_phone: customerPhone,
        page_size: 100,
      })
      setMessages(response.data.reverse())
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [businessId, customerPhone])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      const result = await whatsappService.sendTextMessage({
        business_account_id: businessAccountId,
        business_id: businessId,
        to: customerPhone,
        message: newMessage.trim(),
        customer_name: customerName,
      })

      if (result.success && result.data) {
        setMessages((prev) => [...prev, result.data!])
        setNewMessage('')
      } else {
        toast.error(result.error || 'Error al enviar')
      }
    } catch (error) {
      toast.error('Error al enviar mensaje')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
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

  if (!customerPhone) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          El cliente no tiene número de teléfono registrado
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            <CardTitle className="text-base">WhatsApp</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{customerPhone}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => loadMessages(false)}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="flex-1 h-[300px] px-4">
            <div className="space-y-3 py-2">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No hay mensajes. Inicia una conversación.
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex flex-col max-w-[80%] rounded-lg p-3',
                      msg.direction === 'outbound'
                        ? 'ml-auto bg-green-100 dark:bg-green-900/30'
                        : 'mr-auto bg-muted'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(msg.created_at)}
                      </span>
                      {msg.direction === 'outbound' && getStatusIcon(msg.status)}
                    </div>
                    {msg.status === 'failed' && msg.error_message && (
                      <Badge variant="destructive" className="mt-1 text-xs">
                        Error: {msg.error_message}
                      </Badge>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}
        <div className="border-t p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Escribe un mensaje..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!newMessage.trim() || isSending}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
