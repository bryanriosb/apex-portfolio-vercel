'use server'

import type { AxiosError } from 'axios'
import apiApexAiAuth from '@/lib/actions/api/apex-ai'
import type {
  Skill,
  SkillListItem,
  SkillWriteResponse,
} from '@/lib/models/agents/skill'

/**
 * Resultado serializable de una server action de skills.
 *
 * Las actions NUNCA lanzan: Next.js censura en producción el mensaje de
 * cualquier excepción lanzada desde una server action (queda solo el
 * digest genérico), así que el error del API viajaría destruido. El
 * servicio cliente desempaqueta el result y re-lanza en el navegador,
 * donde el mensaje sí sobrevive hasta el toast.
 */
export type SkillActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

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
  }
  if (error instanceof Error) return error.message
  return 'Error inesperado en la operación'
}

async function toResult<T>(
  call: () => Promise<T>
): Promise<SkillActionResult<T>> {
  try {
    return { ok: true, data: await call() }
  } catch (error) {
    return { ok: false, error: extractApiError(error) }
  }
}

export async function listSkillsAction(): Promise<
  SkillActionResult<SkillListItem[]>
> {
  return toResult(async () => {
    const response = await apiApexAiAuth.get('/skills')
    return response.data || []
  })
}

export async function getSkillAction(
  name: string
): Promise<SkillActionResult<Skill>> {
  return toResult(async () => {
    const response = await apiApexAiAuth.get(
      `/skills/${encodeURIComponent(name)}`
    )
    return response.data
  })
}

export async function createSkillAction(
  skill: Pick<Skill, 'name' | 'content'>
): Promise<SkillActionResult<SkillWriteResponse>> {
  return toResult(async () => {
    const response = await apiApexAiAuth.post('/skills', skill)
    return response.data
  })
}

export async function updateSkillAction(
  name: string,
  content: string
): Promise<SkillActionResult<SkillWriteResponse>> {
  return toResult(async () => {
    const response = await apiApexAiAuth.put(
      `/skills/${encodeURIComponent(name)}`,
      { content }
    )
    return response.data
  })
}

export async function deleteSkillAction(
  name: string
): Promise<SkillActionResult<void>> {
  return toResult(async () => {
    await apiApexAiAuth.delete(`/skills/${encodeURIComponent(name)}`)
  })
}

export async function getSkillReferenceAction(
  name: string,
  filename: string
): Promise<SkillActionResult<{ filename: string; content: string }>> {
  return toResult(async () => {
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
): Promise<SkillActionResult<void>> {
  return toResult(async () => {
    await apiApexAiAuth.put(
      `/skills/${encodeURIComponent(name)}/references/${encodeURIComponent(filename)}`,
      { content }
    )
  })
}

export async function deleteSkillReferenceAction(
  name: string,
  filename: string
): Promise<SkillActionResult<void>> {
  return toResult(async () => {
    await apiApexAiAuth.delete(
      `/skills/${encodeURIComponent(name)}/references/${encodeURIComponent(filename)}`
    )
  })
}
