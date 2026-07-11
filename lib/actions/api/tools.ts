'use server'

import { query, create, update, destroy } from './crud'
import type { ToolWithAuthStatus, ToolDefinitionPayload, ToolDefinitionResponse } from '@/lib/types/oauth2-types'

export interface ListToolsParams {
  agentId: string
  userId: string
  businessAccountId: string
  includeInactive?: boolean
  isActive?: boolean
}

export interface OAuthActionParams {
  toolId: string
  ownerType: 'admin' | 'user'
  ownerId: string
}

export interface ToggleToolParams {
  toolId: string
  isActive: boolean
}

export interface DeleteToolParams {
  toolId: string
}

export interface DiscoverToolParams {
  toolId: string
}

export interface CreateToolParams {
  agentId: string
  payload: ToolDefinitionPayload
}

export interface UpdateToolParams {
  toolId: string
  payload: Partial<ToolDefinitionPayload>
}

export interface GetToolParams {
  toolId: string
}

export async function listTools(
  params: ListToolsParams
): Promise<{ tools: ToolWithAuthStatus[] }> {
  const queryParams: Record<string, any> = {
    user_id: params.userId,
    business_account_id: params.businessAccountId,
  }

  if (params.includeInactive !== undefined) {
    queryParams.include_inactive = String(params.includeInactive)
  }

  if (params.isActive !== undefined) {
    queryParams.is_active = String(params.isActive)
  }

  try {
    return await query(`/agents/${params.agentId}/tools`, queryParams)
  } catch (error) {
    console.warn(`[listTools] Failed to fetch tools for agent ${params.agentId}. Returning empty array.`, error)
    return { tools: [] }
  }
}

export async function getTool(
  params: GetToolParams
): Promise<ToolDefinitionResponse> {
  return query(`/agents/tools/${params.toolId}`)
}

export async function createTool(
  params: CreateToolParams
): Promise<ToolDefinitionResponse> {
  return create(`/agents/${params.agentId}/tools`, params.payload)
}

export async function updateTool(
  params: UpdateToolParams
): Promise<ToolDefinitionResponse> {
  return update(`/agents/tools/${params.toolId}`, params.payload, false)
}

export async function toggleToolActive(
  params: ToggleToolParams
): Promise<{ success: boolean }> {
  return update(
    `/agents/tools/${params.toolId}`,
    { is_active: params.isActive },
    true
  )
}

export async function authorizeOAuth2(
  params: OAuthActionParams
): Promise<{ authorization_url: string }> {
  return create(`/agents/tools/${params.toolId}/oauth2/authorize`, {
    owner_type: params.ownerType,
    owner_id: params.ownerId,
  })
}

export async function refreshOAuth2(
  params: OAuthActionParams
): Promise<{ success: boolean }> {
  return create(
    `/agents/tools/${params.toolId}/oauth2/refresh`,
    {},
    {
      params: {
        owner_type: params.ownerType,
        owner_id: params.ownerId,
      },
    }
  )
}

export async function disconnectOAuth2(
  params: OAuthActionParams
): Promise<{ success: boolean }> {
  return destroy(
    `/agents/tools/${params.toolId}/oauth2?owner_type=${params.ownerType}&owner_id=${params.ownerId}`
  )
}

export async function discoverOAuth2(
  params: DiscoverToolParams
): Promise<{
  discovered: boolean
  authorize_url?: string
  token_url?: string
  client_id?: string
  scopes?: string[]
  resource?: string
}> {
  return create(`/agents/tools/${params.toolId}/oauth2/discover`, {})
}

export async function deleteTool(
  params: DeleteToolParams
): Promise<{ success: boolean }> {
  return destroy(`/agents/tools/${params.toolId}`)
}
