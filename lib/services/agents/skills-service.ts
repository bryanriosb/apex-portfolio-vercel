import {
  createSkillAction,
  deleteSkillAction,
<<<<<<< HEAD
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
=======
  getSkillAction,
  listSkillsAction,
  updateSkillAction,
} from '@/lib/actions/agents/skills-actions'
import type { Skill, SkillListItem } from '@/lib/models/agents/skill'
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8

export class SkillsService {
  async listSkills(): Promise<SkillListItem[]> {
    return listSkillsAction()
  }

  async getSkill(name: string): Promise<Skill> {
    return getSkillAction(name)
  }

<<<<<<< HEAD
  async createSkill(
    skill: Pick<Skill, 'name' | 'content'>
  ): Promise<SkillWriteResponse> {
    return createSkillAction(skill)
  }

  async updateSkill(
    name: string,
    content: string
  ): Promise<SkillWriteResponse> {
=======
  async createSkill(skill: Skill): Promise<void> {
    return createSkillAction(skill)
  }

  async updateSkill(name: string, content: string): Promise<void> {
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
    return updateSkillAction(name, content)
  }

  async deleteSkill(name: string): Promise<void> {
    return deleteSkillAction(name)
  }
<<<<<<< HEAD

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
=======
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
}
