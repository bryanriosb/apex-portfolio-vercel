import {
  createSkillAction,
  deleteSkillAction,
  deleteSkillReferenceAction,
  getSkillAction,
  getSkillReferenceAction,
  listSkillsAction,
  putSkillReferenceAction,
  updateSkillAction,
  type SkillActionResult,
} from '@/lib/actions/agents/skills-actions'
import type {
  Skill,
  SkillListItem,
  SkillWriteResponse,
} from '@/lib/models/agents/skill'

/**
 * Desempaqueta el result de la action en el CLIENTE: aquí un throw sí
 * conserva su mensaje (la censura de producción de Next.js solo aplica a
 * excepciones lanzadas dentro de la server action).
 */
function unwrap<T>(result: SkillActionResult<T>): T {
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export class SkillsService {
  async listSkills(): Promise<SkillListItem[]> {
    return unwrap(await listSkillsAction())
  }

  async getSkill(name: string): Promise<Skill> {
    return unwrap(await getSkillAction(name))
  }

  async createSkill(
    skill: Pick<Skill, 'name' | 'content'>
  ): Promise<SkillWriteResponse> {
    return unwrap(await createSkillAction(skill))
  }

  async updateSkill(
    name: string,
    content: string
  ): Promise<SkillWriteResponse> {
    return unwrap(await updateSkillAction(name, content))
  }

  async deleteSkill(name: string): Promise<void> {
    return unwrap(await deleteSkillAction(name))
  }

  async getSkillReference(
    name: string,
    filename: string
  ): Promise<{ filename: string; content: string }> {
    return unwrap(await getSkillReferenceAction(name, filename))
  }

  async putSkillReference(
    name: string,
    filename: string,
    content: string
  ): Promise<void> {
    return unwrap(await putSkillReferenceAction(name, filename, content))
  }

  async deleteSkillReference(name: string, filename: string): Promise<void> {
    return unwrap(await deleteSkillReferenceAction(name, filename))
  }
}
