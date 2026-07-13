'use server'

import type { AxiosError } from 'axios'
import apiApexAiAuth from '@/lib/actions/api/apex-ai'
import type { Skill, SkillListItem } from '@/lib/models/agents/skill'

function extractApiError(error: unknown): string {
  const axiosError = error as AxiosError<{ error?: string; message?: string }>
  if (axiosError.response?.data) {
    const data = axiosError.response.data
    if (typeof data.error === 'string') return data.error
    if (typeof data.message === 'string') return data.message
  }
  if (error instanceof Error) return error.message
  return 'Error inesperado en la operación'
}

async function handleApiCall<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (error) {
    throw new Error(extractApiError(error))
  }
}

export async function listSkillsAction(): Promise<SkillListItem[]> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.get('/skills')
    return response.data || []
  })
}

export async function getSkillAction(name: string): Promise<Skill> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.get(
      `/skills/${encodeURIComponent(name)}`
    )
    return response.data
  })
}

export async function createSkillAction(skill: Skill): Promise<void> {
  return handleApiCall(async () => {
    await apiApexAiAuth.post('/skills', skill)
  })
}

export async function updateSkillAction(
  name: string,
  content: string
): Promise<void> {
  return handleApiCall(async () => {
    await apiApexAiAuth.put(`/skills/${encodeURIComponent(name)}`, { content })
  })
}

export async function deleteSkillAction(name: string): Promise<void> {
  return handleApiCall(async () => {
    await apiApexAiAuth.delete(`/skills/${encodeURIComponent(name)}`)
  })
}
