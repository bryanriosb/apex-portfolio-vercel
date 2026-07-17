import {
  createSkillAction,
  deleteSkillAction,
  deleteSkillReferenceAction,
  getSkillAction,
  getSkillReferenceAction,
  listSkillsAction,
  putSkillReferenceAction,
  updateSkillAction,
} from '@/lib/actions/agents/skills-actions'
import type {
  Skill,
  SkillListItem,
  SkillWriteResponse,
} from '@/lib/models/agents/skill'

export class SkillsService {
  async listSkills(): Promise<SkillListItem[]> {
    return listSkillsAction()
  }

  async getSkill(name: string): Promise<Skill> {
    return getSkillAction(name)
  }

  async createSkill(
    skill: Pick<Skill, 'name' | 'content'>
  ): Promise<SkillWriteResponse> {
    return createSkillAction(skill)
  }

  async updateSkill(
    name: string,
    content: string
  ): Promise<SkillWriteResponse> {
    return updateSkillAction(name, content)
  }

  async deleteSkill(name: string): Promise<void> {
    return deleteSkillAction(name)
  }

  async getSkillReference(
    name: string,
    filename: string
  ): Promise<{ filename: string; content: string }> {
    return getSkillReferenceAction(name, filename)
  }

  async putSkillReference(
    name: string,
    filename: string,
    content: string
  ): Promise<void> {
    return putSkillReferenceAction(name, filename, content)
  }

  async deleteSkillReference(name: string, filename: string): Promise<void> {
    return deleteSkillReferenceAction(name, filename)
  }
}
