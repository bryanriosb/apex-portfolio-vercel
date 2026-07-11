'use server'

import { create } from './crud'

export interface AuthTicketResponse {
  ticket: string
  expires_in: number
}

export async function getAuthTicket(): Promise<AuthTicketResponse> {
  return create('/auth/handshake', {})
}
