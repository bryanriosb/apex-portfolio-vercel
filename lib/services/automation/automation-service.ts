import apiApexAiAuth from '@/lib/actions/api/apex-ai'
import {
  AutomationMetricsResponse,
  AgentJob,
  AgentWorkflowJob,
  ResumeWorkflowRequest,
  AutomationLogEntry,
  AuditJobsQueryParams,
  AuditJobsResponse
} from './automation-types'

export const AutomationService = {
  getMetrics: async (business_id: string): Promise<AutomationMetricsResponse> => {
    const { data } = await apiApexAiAuth.get(`/jobs/metrics`)
    return data
  },

  getApexJobs: async (module: string, business_id: string): Promise<any[]> => {
    const { data } = await apiApexAiAuth.get(`/jobs?module=${module}`)
    return data?.jobs || data || []
  },

  getAgentJobs: async (module: string, business_id: string): Promise<AgentJob[]> => {
    const { data } = await apiApexAiAuth.get(`/agents/jobs?module=${module}`)
    return data || []
  },

  getWorkflowJobs: async (module: string, business_id: string): Promise<AgentWorkflowJob[]> => {
    const { data } = await apiApexAiAuth.get(`/agents/workflows/jobs?module=${module}`)
    return data || []
  },

  getWorkflowJob: async (id: string): Promise<AgentWorkflowJob> => {
    const { data } = await apiApexAiAuth.get(`/agents/workflows/jobs/${id}`)
    return data
  },

  resumeWorkflow: async (id: string, updates: ResumeWorkflowRequest): Promise<void> => {
    await apiApexAiAuth.post(`/agents/workflows/jobs/${id}/resume`, updates)
  },

  getAutomationLog: async (module: string, business_id: string): Promise<AutomationLogEntry[]> => {
    try {
      const { data } = await apiApexAiAuth.get(`/automation/log?module=${module}`)
      return data
    } catch (err) {
      console.warn("Could not fetch automation log, returning empty array")
      return []
    }
  },

  getAuditJobs: async (params: AuditJobsQueryParams): Promise<AuditJobsResponse> => {
    const queryParams = new URLSearchParams()
    if (params.status?.length) queryParams.append('status', params.status.join(','))
    if (params.source?.length) queryParams.append('source', params.source.join(','))
    if (params.module) queryParams.append('module', params.module)
    if (params.category) queryParams.append('category', params.category)
    if (params.search) queryParams.append('search', params.search)
    if (params.from) queryParams.append('from', params.from)
    if (params.to) queryParams.append('to', params.to)
    if (params.page) queryParams.append('page', String(params.page))
    if (params.page_size) queryParams.append('page_size', String(params.page_size))

    const { data } = await apiApexAiAuth.get(`/jobs/audit?${queryParams.toString()}`)
    return data
  },

  getApexJob: async (id: string): Promise<any> => {
    const { data } = await apiApexAiAuth.get(`/jobs/${id}`)
    return data
  },

  observeJob: async (params: { job_id?: string; session_id?: string }): Promise<any> => {
    try {
      const queryParams = new URLSearchParams()
      if (params.job_id) queryParams.append('job_id', params.job_id)
      if (params.session_id) queryParams.append('session_id', params.session_id)
      
      const { data } = await apiApexAiAuth.get(`/agent/automation/observe?${queryParams.toString()}`)
      return data
    } catch (err) {
      console.error("Error fetching job observation", err)
      return null
    }
  },

  getWorkflowMermaid: async (id: string): Promise<string> => {
    try {
      const { data } = await apiApexAiAuth.get(`/agents/workflows/${id}/visualize`);
      return data;
    } catch (err) {
      console.error("Error fetching mermaid diagram", err);
      return '';
    }
  }
}
