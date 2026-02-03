'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, MessageSquare, ArrowLeft, Camera } from 'lucide-react'
import ConversationService from '@/lib/services/chat/conversation-service'
import type { ConversationWithDetails } from '@/lib/models/chat/conversation'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import ChatConversation from './ChatConversation'
import Loading from '@/components/ui/loading'
import { WhatsAppConversationList } from './WhatsAppConversationList'

interface ChatSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ChatTab = 'whatsapp' | 'internal'

const SHOW_INTERNAL_CHAT = false

export default function ChatSheet({ open, onOpenChange }: ChatSheetProps) {
  const [activeTab, setActiveTab] = useState<ChatTab>('whatsapp')
  const [conversations, setConversations] = useState<ConversationWithDetails[]>(
    []
  )
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationWithDetails | null>(null)
  const { user, role, businesses, userProfileId, businessAccountId } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const firstBusinessId = activeBusiness?.id || businesses?.[0]?.id
  const userId = user?.id

  useEffect(() => {
    if (!open || !userId || activeTab !== 'internal' || !SHOW_INTERNAL_CHAT)
      return

    const conversationService = new ConversationService()

    const fetchConversations = async () => {
      try {
        setIsLoading(true)
        const params: any = {
          page: 1,
          page_size: 50,
        }

        if (role === 'business_admin' && firstBusinessId) {
          params.business_id = firstBusinessId
        } else if (role === 'customer' && userProfileId) {
          params.users_profile_id = userProfileId
        }

        const response = await conversationService.fetchItems(params)
        setConversations(response.data)
      } catch (error) {
        console.error('Error fetching conversations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversations()
  }, [open, userId, role, firstBusinessId, userProfileId, activeTab])

  const filteredConversations = conversations.filter((conversation) => {
    if (!searchQuery) return true

    const businessName = conversation.business?.name?.toLowerCase() || ''
    const odUserId = conversation.user_profile?.user_id?.toLowerCase() || ''
    const query = searchQuery.toLowerCase()

    return businessName.includes(query) || odUserId.includes(query)
  })

  const handleConversationClick = (conversation: ConversationWithDetails) => {
    setSelectedConversation(conversation)
  }

  const handleBackToList = () => {
    setSelectedConversation(null)
  }

  const formatLastMessageTime = (dateString: string | null) => {
    if (!dateString) return ''

    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } else if (days === 1) {
      return 'Ayer'
    } else if (days < 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
      })
    }
  }

  const isImageMessage = (content: string) => {
    return (
      content.includes('chat-media') ||
      /\.(jpg|jpeg|png|gif|webp)$/i.test(content)
    )
  }

  const renderInternalConversationDetail = () => (
    <>
      <SheetHeader className="p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            {role === 'business_admin' ? (
              <>
                {selectedConversation?.user_profile?.profile_picture_url ? (
                  <img
                    src={selectedConversation.user_profile.profile_picture_url}
                    alt="Usuario"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    U
                  </div>
                )}
                <div>
                  <SheetTitle className="text-base">
                    {selectedConversation?.user_profile?.name || 'Usuario'}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation?.user_profile?.email ||
                      `ID: ${selectedConversation?.user_profile?.user_id?.slice(
                        0,
                        8
                      )}...`}
                  </p>
                </div>
              </>
            ) : (
              <>
                {selectedConversation?.business?.logo_url ? (
                  <img
                    src={selectedConversation.business.logo_url}
                    alt="Negocio"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {selectedConversation?.business?.name?.[0] || 'N'}
                  </div>
                )}
                <div>
                  <SheetTitle className="text-base">
                    {selectedConversation?.business?.name || 'Negocio'}
                  </SheetTitle>
                </div>
              </>
            )}
          </div>
        </div>
      </SheetHeader>
      {selectedConversation && (
        <ChatConversation
          conversation={selectedConversation}
          currentUserRole={
            role === 'business_admin' ? 'business_admin' : 'user'
          }
        />
      )}
    </>
  )

  const renderInternalConversationList = () => (
    <>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loading className="w-8 h-8" />
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground opacity-50 mb-3" />
          <p className="text-muted-foreground">
            {searchQuery
              ? 'No se encontraron conversaciones'
              : 'No tienes conversaciones aún'}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {filteredConversations.map((conversation) => {
              const isCustomer = role === 'customer'
              const displayName = isCustomer
                ? conversation.business?.name || 'Negocio'
                : conversation.user_profile?.name || 'Usuario'
              const displayImage = isCustomer
                ? conversation.business?.logo_url
                : conversation.user_profile?.profile_picture_url
              const displayInitial = displayName[0] || '?'

              return (
                <button
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                  className="w-full p-4 hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt={displayName || ''}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                        {displayInitial}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">
                          {displayName || 'Sin nombre'}
                        </h3>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatLastMessageTime(conversation.last_message_at)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {conversation.last_message?.content ? (
                          isImageMessage(conversation.last_message.content) ? (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Camera className="h-4 w-4" />
                              <span>Foto</span>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.last_message.content}
                            </p>
                          )
                        ) : (
                          <p className="text-sm text-muted-foreground truncate">
                            Sin mensajes
                          </p>
                        )}
                        {conversation.unread_count &&
                          conversation.unread_count > 0 && (
                            <Badge
                              variant="default"
                              className="h-5 min-w-[20px] px-1.5 text-xs flex-shrink-0"
                            >
                              {conversation.unread_count}
                            </Badge>
                          )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[540px] sm:max-w-[540px] p-0 flex flex-col overflow-hidden"
      >
        {selectedConversation && activeTab === 'internal' ? (
          renderInternalConversationDetail()
        ) : (
          <>
            <SheetHeader className="p-4 border-b flex-shrink-0">
              <SheetTitle>Mensajes</SheetTitle>
              {SHOW_INTERNAL_CHAT ? (
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as ChatTab)}
                  className="mt-3"
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="whatsapp" className="flex-1 gap-2">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      WhatsApp
                    </TabsTrigger>
                    <TabsTrigger value="internal" className="flex-1 gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Interno
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              ) : (
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-green-600">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </div>
              )}
            </SheetHeader>

            {SHOW_INTERNAL_CHAT ? (
              <Tabs value={activeTab} className="flex-1 flex flex-col">
                <TabsContent
                  value="whatsapp"
                  className="flex-1 flex flex-col m-0"
                >
                  <WhatsAppConversationList
                    businessAccountId={businessAccountId || null}
                    businessId={firstBusinessId || null}
                  />
                </TabsContent>
                <TabsContent
                  value="internal"
                  className="flex-1 flex flex-col m-0"
                >
                  <div className="relative px-4 py-3">
                    <Search className="absolute left-7 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Buscar conversaciones..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {renderInternalConversationList()}
                </TabsContent>
              </Tabs>
            ) : (
              <WhatsAppConversationList
                businessAccountId={businessAccountId || null}
                businessId={firstBusinessId || null}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
