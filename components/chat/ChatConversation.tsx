'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Image as ImageIcon, X } from 'lucide-react'
import MessageService from '@/lib/services/chat/message-service'
import ConversationService from '@/lib/services/chat/conversation-service'
import ChatStorageService from '@/lib/services/chat/chat-storage-service'
import type { ConversationWithDetails } from '@/lib/models/chat/conversation'
import type { Message, MessageInsert } from '@/lib/models/chat/message'
import ChatMessage from './ChatMessage'
import Loading from '@/components/ui/loading'
import { useCurrentUser } from '@/hooks/use-current-user'
import { createBrowserClient } from '@supabase/ssr'

interface ChatConversationProps {
  conversation: ConversationWithDetails
  currentUserRole: 'user' | 'business_admin'
}

export default function ChatConversation({
  conversation,
  currentUserRole,
}: ChatConversationProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user, businesses, businessId } = useCurrentUser()

  const messageServiceRef = useRef(new MessageService())
  const conversationServiceRef = useRef(new ConversationService())
  const storageServiceRef = useRef(new ChatStorageService())

  const senderId = useMemo(
    () =>
      currentUserRole === 'business_admin'
        ? businessId || businesses?.[0]?.id || ''
        : conversation.users_profile_id,
    [currentUserRole, businessId, businesses, conversation.users_profile_id]
  )

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!conversation.id) return

    const fetchMessages = async () => {
      try {
        setIsLoading(true)
        const response = await messageServiceRef.current.fetchItems({
          conversation_id: conversation.id,
          page_size: 100,
        })
        setMessages(response.data.reverse())
      } catch (error) {
        console.error('Error fetching messages:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessages()

    const markAsRead = async () => {
      await conversationServiceRef.current.markAsRead(
        conversation.id,
        currentUserRole === 'business_admin' ? 'BUSINESS' : 'USER'
      )
    }

    markAsRead()
  }, [conversation.id, currentUserRole])

  useEffect(() => {
    if (!conversation.id) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const subscription = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => [...prev, newMsg])

          conversationServiceRef.current.markAsRead(
            conversation.id,
            currentUserRole === 'business_admin' ? 'BUSINESS' : 'USER'
          )
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [conversation.id, currentUserRole])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      setUploadError('El archivo debe ser una imagen')
      return
    }

    // Validar tamaño
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setUploadError('La imagen no debe superar los 5MB')
      return
    }

    setSelectedImage(file)

    // Crear preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if ((!newMessage.trim() && !selectedImage) || isSending || !senderId) return

    try {
      setIsSending(true)
      setUploadError(null)

      let messageContent = newMessage.trim()

      // Si hay imagen seleccionada, subirla primero
      if (selectedImage) {
        const uploadResult = await storageServiceRef.current.uploadChatImage(
          selectedImage,
          conversation.id
        )

        if (!uploadResult.success) {
          setUploadError(uploadResult.error || 'Error al subir la imagen')
          console.error('Upload error:', uploadResult.error)
          return
        }

        // Usar la URL de la imagen como contenido del mensaje
        messageContent = uploadResult.url || ''
      }

      if (!messageContent) return

      const messageData: MessageInsert = {
        conversation_id: conversation.id,
        content: messageContent,
        sender_type: currentUserRole === 'business_admin' ? 'BUSINESS' : 'USER',
        sender_id: senderId,
      }

      const result = await messageServiceRef.current.createItem(messageData)

      if (result.success) {
        setNewMessage('')
        handleRemoveImage()
      } else {
        console.error('Error sending message:', result.error)
        setUploadError('Error al enviar el mensaje')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setUploadError('Error al enviar el mensaje')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e as any)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loading className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No hay mensajes aún</p>
              <p className="text-sm mt-1">Envía un mensaje para iniciar la conversación</p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isOwn={
                  currentUserRole === 'business_admin'
                    ? message.sender_type === 'BUSINESS'
                    : message.sender_type === 'USER'
                }
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="border-t flex-shrink-0">
        {uploadError && (
          <div className="p-3 bg-destructive/10 border-b">
            <p className="text-sm text-destructive">{uploadError}</p>
          </div>
        )}
        {imagePreview && (
          <div className="p-3 bg-muted/50 border-b">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Vista previa"
                className="rounded-lg max-h-32 object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={handleRemoveImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        <form
          onSubmit={handleSendMessage}
          className="p-4 flex items-center gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || !!selectedImage}
            title="Adjuntar imagen"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Input
            type="text"
            placeholder={selectedImage ? 'Imagen seleccionada' : 'Escribe un mensaje...'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending || !!selectedImage}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={(!newMessage.trim() && !selectedImage) || isSending}
          >
            {isSending ? (
              <Loading className="w-4 h-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
