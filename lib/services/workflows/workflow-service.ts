import {
  listWorkflowsAction,
  getWorkflowAction,
  createWorkflowAction,
  updateWorkflowAction,
  deleteWorkflowAction,
} from '@/lib/actions/workflows/workflow-actions'
import type {
  WorkflowDefinition,
  CreateWorkflowDefinitionRequest,
  UpdateWorkflowDefinitionRequest,
} from '@/lib/models/workflows/workflow'

export class WorkflowsService {
  async listWorkflows(
    params?: Record<string, any>
  ): Promise<WorkflowDefinition[]> {
    return listWorkflowsAction(params)
  }

  async getWorkflow(id: string): Promise<WorkflowDefinition> {
    return getWorkflowAction(id)
  }

  async createWorkflow(
    data: CreateWorkflowDefinitionRequest
  ): Promise<WorkflowDefinition> {
    return createWorkflowAction(data)
  }

  async updateWorkflow(
    id: string,
    data: UpdateWorkflowDefinitionRequest
  ): Promise<WorkflowDefinition> {
    return updateWorkflowAction(id, data)
  }

  async deleteWorkflow(id: string): Promise<void> {
    return deleteWorkflowAction(id)
  }
}
