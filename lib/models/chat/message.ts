export type MessageSenderType = 'USER' | 'BUSINESS'

export interface Message {
  id: string
  conversation_id: string
  content: string
  sender_type: MessageSenderType
  sender_id: string
  created_at: string
}

export interface MessageWithSender extends Message {
  sender?: {
    id: string
    name: string | null
    profile_picture_url: string | null
  }
}

export interface MessageInsert {
  conversation_id: string
  content: string
  sender_type: MessageSenderType
  sender_id: string
}

export class Message implements Message {
  id: string
  conversation_id: string
  content: string
  sender_type: MessageSenderType
  sender_id: string
  created_at: string

  constructor(data: Message) {
    this.id = data.id
    this.conversation_id = data.conversation_id
    this.content = data.content
    this.sender_type = data.sender_type
    this.sender_id = data.sender_id
    this.created_at = data.created_at
  }
}
