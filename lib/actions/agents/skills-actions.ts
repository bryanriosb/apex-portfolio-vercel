'use server'

import type { AxiosError } from 'axios'
import apiApexAiAuth from '@/lib/actions/api/apex-ai'
<<<<<<< HEAD
import type {
  Skill,
  SkillListItem,
  SkillWriteResponse,
} from '@/lib/models/agents/skill'

function extractApiError(error: unknown): string {
  const axiosError = error as AxiosError<
    { error?: string; message?: string } | string
  >
  if (axiosError.response?.data) {
    const data = axiosError.response.data
    // Los 401 del middleware de apex-ai llegan como texto plano
    // ("Authentication failed: ..."), no como JSON.
    if (typeof data === 'string' && data) return data
    if (typeof data === 'object') {
      if (typeof data.error === 'string') return data.error
      if (typeof data.message === 'string') return data.message
    }
=======
import type { Skill, SkillListItem } from '@/lib/models/agents/skill'

function extractApiError(error: unknown): string {
  const axiosError = error as AxiosError<{ error?: string; message?: string }>
  if (axiosError.response?.data) {
    const data = axiosError.response.data
    if (typeof data.error === 'string') return data.error
    if (typeof data.message === 'string') return data.message
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
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

<<<<<<< HEAD
export async function createSkillAction(
  skill: Pick<Skill, 'name' | 'content'>
): Promise<SkillWriteResponse> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.post('/skills', skill)
    return response.data
=======
export async function createSkillAction(skill: Skill): Promise<void> {
  return handleApiCall(async () => {
    await apiApexAiAuth.post('/skills', skill)
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
  })
}

export async function updateSkillAction(
  name: string,
  content: string
<<<<<<< HEAD
): Promise<SkillWriteResponse> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.put(
      `/skills/${encodeURIComponent(name)}`,
      { content }
    )
    return response.data
=======
): Promise<void> {
  return handleApiCall(async () => {
    await apiApexAiAuth.put(`/skills/${encodeURIComponent(name)}`, { content })
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
  })
}

export async function deleteSkillAction(name: string): Promise<void> {
  return handleApiCall(async () => {
    await apiApexAiAuth.delete(`/skills/${encodeURIComponent(name)}`)
  })
}
<<<<<<< HEAD

export async function getSkillReferenceAction(
  name: string,
  filename: string
): Promise<{ filename: string; content: string }> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.get(
      `/skills/${encodeURIComponent(name)}/references/${encodeURIComponent(filename)}`
    )
    return response.data
  })
}

export async function putSkillReferenceAction(
  name: string,
  filename: string,
  content: string
): Promise<void> {
  return handleApiCall(async () => {
    await apiApexAiAuth.put(
      `/skills/${encodeURIComponent(name)}/references/${encodeURIComponent(filename)}`,
      { content }
    )
  })
}

export async function deleteSkillReferenceAction(
  name: string,
  filename: string
): Promise<void> {
  return handleApiCall(async () => {
    await apiApexAiAuth.delete(
      `/skills/${encodeURIComponent(name)}/references/${encodeURIComponent(filename)}`
    )
  })
}
=======
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
