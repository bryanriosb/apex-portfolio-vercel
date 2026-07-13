import {
  createSkillAction,
  deleteSkillAction,
  getSkillAction,
  listSkillsAction,
  updateSkillAction,
} from '@/lib/actions/agents/skills-actions'
import type { Skill, SkillListItem } from '@/lib/models/agents/skill'

export class SkillsService {
  async listSkills(): Promise<SkillListItem[]> {
    return listSkillsAction()
  }

  async getSkill(name: string): Promise<Skill> {
    return getSkillAction(name)
  }

  async createSkill(skill: Skill): Promise<void> {
    return createSkillAction(skill)
  }

  async updateSkill(name: string, content: string): Promise<void> {
    return updateSkillAction(name, content)
  }

  async deleteSkill(name: string): Promise<void> {
    return deleteSkillAction(name)
  }
}
