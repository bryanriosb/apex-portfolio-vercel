'use client'

import { useState, useEffect, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, ArrowLeft, Check, CheckCheck, Clock, XCircle, Send, Loader2 } from 'lucide-react'
import Loading from '@/components/ui/loading'
import WhatsAppService from '@/lib/services/whatsapp/whatsapp-service'
import type { WhatsAppMessage } from '@/lib/models/whatsapp/whatsapp-config'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { WhatsAppConversation } from '@/lib/models/whatsapp/whatsapp-config'

interface WhatsAppConversationListProps {
  businessAccountId: string | null
  businessId: string | null
}

interface ConversationGroup {
  phone: string
  customerName: string | null
  messages: WhatsAppMessage[]
  lastMessage: WhatsAppMessage
  unreadCount: number
}

function getInitials(name: string | null, phone: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }
  return phone.slice(-2)
}

export function WhatsAppConversationList({ businessAccountId, businessId }: WhatsAppConversationListProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [conversationsData, setConversationsData] = useState<WhatsAppConversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const whatsappService = useMemo(() => new WhatsAppService(), [])

  useEffect(() => {
    if (!businessId) {
      setIsLoading(false)
      return
    }

    const loadData = async () => {
      try {
        setIsLoading(true)
        const [messagesRes, conversationsRes] = await Promise.all([
          whatsappService.fetchMessages({ business_id: businessId, page_size: 200 }),
          whatsappService.fetchConversations({ business_id: businessId, page_size: 100 }),
        ])
        setMessages(messagesRes.data)
        setConversationsData(conversationsRes.data)
      } catch (error) {
        console.error('Error loading WhatsApp data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [businessId, whatsappService])

  const conversations = useMemo(() => {
    const grouped: Record<string, ConversationGroup> = {}
    const customerNames = new Map(conversationsData.map((c) => [c.phone, c.customer_name]))

    messages.forEach((msg) => {
      const phone = msg.direction === 'outbound' ? msg.to_phone : msg.from_phone || ''
      if (!phone) return

      if (!grouped[phone]) {
        grouped[phone] = {
          phone,
          customerName: customerNames.get(phone) || null,
          messages: [],
          lastMessage: msg,
          unreadCount: 0,
        }
      }

      grouped[phone].messages.push(msg)

      if (new Date(msg.created_at) > new Date(grouped[phone].lastMessage.created_at)) {
        grouped[phone].lastMessage = msg
      }

      if (msg.direction === 'inbound' && msg.status !== 'read') {
        grouped[phone].unreadCount++
      }
    })

    return Object.values(grouped).sort(
      (a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    )
  }, [messages, conversationsData])

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return conv.phone.toLowerCase().includes(query) ||
           (conv.customerName?.toLowerCase().includes(query) ?? false)
  })

  const selectedConversation = selectedPhone
    ? conversations.find((c) => c.phone === selectedPhone)
    : null

  const handleSend = async () => {
    if (!businessAccountId || !businessId || !selectedPhone || !newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      const result = await whatsappService.sendTextMessage({
        business_account_id: businessAccountId,
        business_id: businessId,
        to: selectedPhone,
        message: newMessage.trim(),
      })

      if (result.success && result.data) {
        setMessages((prev) => [result.data!, ...prev])
        setNewMessage('')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Ayer'
    } else if (days < 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
    }
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

  if (!businessId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">Selecciona un negocio</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loading className="w-8 h-8" />
      </div>
    )
  }

  if (selectedConversation) {
    const sortedMessages = [...selectedConversation.messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    return (
      <div className="flex-1 flex flex-col">
        <div className="p-3 border-b flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPhone(null)}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-secondary/20 text-secondary font-medium">
                {getInitials(selectedConversation.customerName, selectedConversation.phone)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">
                {selectedConversation.customerName || selectedPhone}
              </p>
              {selectedConversation.customerName && (
                <p className="text-xs text-muted-foreground">{selectedPhone}</p>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {sortedMessages.map((msg) => (
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
                    {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {msg.direction === 'outbound' && getStatusIcon(msg.status)}
                </div>
                {msg.status === 'failed' && msg.error_message && (
                  <p className="text-xs text-destructive mt-1">{msg.error_message}</p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Escribe un mensaje..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              disabled={isSending}
            />
            <Button size="icon" onClick={handleSend} disabled={!newMessage.trim() || isSending}>
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col w-full overflow-hidden">
      <div className="relative px-4 py-3 flex-shrink-0">
        <Search className="absolute left-7 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por nombre o número..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredConversations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <svg viewBox="0 0 24 24" className="h-12 w-12 fill-muted-foreground opacity-50 mb-3">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <p className="text-muted-foreground">
            {searchQuery ? 'No se encontraron conversaciones' : 'No hay conversaciones de WhatsApp'}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 w-full">
          <div className="divide-y w-full">
            {filteredConversations.map((conv) => (
              <div
                key={conv.phone}
                onClick={() => setSelectedPhone(conv.phone)}
                className="p-4 hover:bg-accent transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarFallback className="bg-secondary/20 text-secondary font-medium">
                      {getInitials(conv.customerName, conv.phone)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm truncate">
                        {conv.customerName || conv.phone}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {formatTime(conv.lastMessage.created_at)}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground truncate pr-2">
                      {conv.lastMessage.direction === 'outbound' && '✓ '}
                      {conv.lastMessage.content.replace(/\n/g, ' ')}
                    </p>
                  </div>

                  {conv.unreadCount > 0 && (
                    <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-xs shrink-0 self-center">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
