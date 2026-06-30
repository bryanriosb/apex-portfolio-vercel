'use server'

import { AutomationService } from '@/lib/services/automation/automation-service'
import {
  AutomationMetricsResponse,
  AgentJob,
  AgentWorkflowJob,
  ResumeWorkflowRequest,
  AutomationLogEntry
} from '@/lib/services/automation/automation-types'

export async function getMetricsAction(business_id: string): Promise<AutomationMetricsResponse> {
  return await AutomationService.getMetrics(business_id)
}

export async function getApexJobsAction(module: string, business_id: string): Promise<any[]> {
  return await AutomationService.getApexJobs(module, business_id)
}

export async function getAgentJobsAction(module: string, business_id: string): Promise<AgentJob[]> {
  return await AutomationService.getAgentJobs(module, business_id)
}

export async function getWorkflowJobsAction(module: string, business_id: string): Promise<AgentWorkflowJob[]> {
  return await AutomationService.getWorkflowJobs(module, business_id)
}

export async function getWorkflowJobAction(id: string): Promise<AgentWorkflowJob> {
  return await AutomationService.getWorkflowJob(id)
}

export async function resumeWorkflowAction(id: string, updates: ResumeWorkflowRequest): Promise<void> {
  return await AutomationService.resumeWorkflow(id, updates)
}

export async function getAutomationLogAction(module: string, business_id: string): Promise<AutomationLogEntry[]> {
  return await AutomationService.getAutomationLog(module, business_id)
}

export async function observeJobAction(params: { job_id?: string; session_id?: string }): Promise<any> {
  return await AutomationService.observeJob(params)
}

export async function getWorkflowMermaidAction(id: string): Promise<string> {
  return await AutomationService.getWorkflowMermaid(id)
}

import { S3AttachmentsService } from '@/lib/services/automation/s3-attachments'

export async function getPresignedAttachmentsAction(paths: string[]): Promise<Record<string, string>> {
  return await S3AttachmentsService.getPresignedUrls(paths)
}
