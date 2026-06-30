import apiApexAiAuth from '@/lib/actions/api/apex-ai'
import {
  AutomationMetricsResponse,
  AgentJob,
  AgentWorkflowJob,
  ResumeWorkflowRequest,
  AutomationLogEntry
} from './automation-types'

export const AutomationService = {
  getMetrics: async (business_id: string): Promise<AutomationMetricsResponse> => {
    const { data } = await apiApexAiAuth.get(`/api/jobs/metrics`)
    return data
  },

  getApexJobs: async (module: string, business_id: string): Promise<any[]> => {
    const { data } = await apiApexAiAuth.get(`/api/jobs?module=${module}`)
    return data?.jobs || data || []
  },

  getAgentJobs: async (module: string, business_id: string): Promise<AgentJob[]> => {
    const { data } = await apiApexAiAuth.get(`/api/agents/jobs?module=${module}`)
    return data || []
  },

  getWorkflowJobs: async (module: string, business_id: string): Promise<AgentWorkflowJob[]> => {
    const { data } = await apiApexAiAuth.get(`/api/agents/workflows/jobs?module=${module}`)
    return data || []
  },

  getWorkflowJob: async (id: string): Promise<AgentWorkflowJob> => {
    const { data } = await apiApexAiAuth.get(`/api/agents/workflows/jobs/${id}`)
    return data
  },

  resumeWorkflow: async (id: string, updates: ResumeWorkflowRequest): Promise<void> => {
    await apiApexAiAuth.post(`/api/agents/workflows/jobs/${id}/resume`, updates)
  },

  getAutomationLog: async (module: string, business_id: string): Promise<AutomationLogEntry[]> => {
    try {
      const { data } = await apiApexAiAuth.get(`/api/automation/log?module=${module}`)
      return data
    } catch (err) {
      console.warn("Could not fetch automation log, returning empty array")
      return []
    }
  },

  observeJob: async (params: { job_id?: string; session_id?: string }): Promise<any> => {
    try {
      const queryParams = new URLSearchParams()
      if (params.job_id) queryParams.append('job_id', params.job_id)
      if (params.session_id) queryParams.append('session_id', params.session_id)
      
      const { data } = await apiApexAiAuth.get(`/api/agent/automation/observe?${queryParams.toString()}`)
      return data
    } catch (err) {
      console.error("Error fetching job observation", err)
      return null
    }
  },

  getWorkflowMermaid: async (id: string): Promise<string> => {
    try {
      const { data } = await apiApexAiAuth.get(`/api/agents/workflows/${id}/visualize`);
      return data;
    } catch (err) {
      console.error("Error fetching mermaid diagram", err);
      return '';
    }
  }
}
