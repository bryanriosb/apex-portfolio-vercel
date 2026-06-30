import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  AgentJob, 
  AgentWorkflowJob, 
  AutomationMetricsResponse, 
  JobStatus,
  type AutomationServerEvent,
} from '@/lib/services/automation/automation-types';
import { 
  getMetricsAction, 
  getAgentJobsAction, 
  getWorkflowJobsAction,
  getApexJobsAction
} from '@/lib/actions/automation';
import { useAutomationWebSocket } from './use-automation-websocket';
import { useActiveBusinessStore } from '@/lib/store/active-business-store';
import { useAutomationEventsStore } from '@/lib/store/automation-events-store';

export type ViewMode = 'dashboard' | 'detail';
export type JobItem = (AgentJob | AgentWorkflowJob | any) & { isWorkflow: boolean, isApex?: boolean };

export function useAutomationJobs() {
  const { activeBusiness } = useActiveBusinessStore();
  const activeBusinessId = activeBusiness?.id;

  const [metrics, setMetrics] = useState<AutomationMetricsResponse | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [lastWsEvent, setLastWsEvent] = useState<AutomationServerEvent | null>(null);

  const selectedModuleRef = useRef(selectedModule);
  useEffect(() => {
    selectedModuleRef.current = selectedModule;
  }, [selectedModule]);

  const fetchMetrics = useCallback(async () => {
    if (!activeBusinessId) return;
    try {
      const data = await getMetricsAction(activeBusinessId);
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch metrics', err);
    }
  }, [activeBusinessId]);

  const loadJobsForModule = useCallback(async (module: string) => {
    if (!activeBusinessId) return;
    setLoading(true);
    try {
      const [agentJobs, workflowJobs, apexJobs] = await Promise.all([
        getAgentJobsAction(module, activeBusinessId),
        getWorkflowJobsAction(module, activeBusinessId),
        getApexJobsAction(module, activeBusinessId)
      ]);
      
      const combined: JobItem[] = [
        ...agentJobs.map(j => ({ ...j, id: j.id || (j as any).job_id, isWorkflow: false })),
        ...workflowJobs.map(j => ({ ...j, id: j.id || (j as any).job_id, isWorkflow: true })),
        ...apexJobs.map(j => ({ ...j, id: j.id || (j as any).job_id, isWorkflow: false, isApex: true }))
      ];
      setJobs(combined);
      setSelectedModule(module);
      setViewMode('detail');
    } catch (err) {
      console.error('Failed to load jobs', err);
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId]);

  const loadJobsForModuleRef = useRef(loadJobsForModule);
  useEffect(() => {
    loadJobsForModuleRef.current = loadJobsForModule;
  }, [loadJobsForModule]);

  const goToDashboard = useCallback(() => {
    setViewMode('dashboard');
    setSelectedModule(null);
    setJobs([]);
    fetchMetrics();
  }, [fetchMetrics]);

  const jobsRef = useRef(jobs);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const { isConnected, connectionStatus, reconnectAttempt, reconnectCountdown, maxRetries, reconnect } = useAutomationWebSocket(useCallback((event: AutomationServerEvent) => {
    setLastWsEvent(event);

    if (event.type === 'JobStateChanged') {
      useAutomationEventsStore.getState().addEvent(event);

      const idx = jobsRef.current.findIndex(j => j.id === event.job_id);
      if (idx === -1) {
        const currentMod = selectedModuleRef.current;
        if (event.module && currentMod && event.module.toLowerCase() === currentMod.toLowerCase()) {
          setTimeout(() => {
            loadJobsForModuleRef.current(currentMod);
          }, 0);
        }
      } else {
        setJobs(prev => {
          const newJobs = [...prev];
          const currentIdx = newJobs.findIndex(j => j.id === event.job_id);
          if (currentIdx !== -1 && newJobs[currentIdx].status !== event.new_status) {
            newJobs[currentIdx] = { ...newJobs[currentIdx], status: event.new_status };
            
            if (['Interrupted', 'Completed', 'Failed'].includes(event.new_status)) {
              const currentMod = selectedModuleRef.current;
              if (currentMod) {
                setTimeout(() => {
                  loadJobsForModuleRef.current(currentMod);
                }, 500);
              }
            }
          }
          return newJobs;
        });
      }

      fetchMetrics();
    } else {
      useAutomationEventsStore.getState().addEvent(event);
    }
  }, [fetchMetrics]));

  return {
    metrics,
    setMetrics,
    jobs,
    loading,
    viewMode,
    selectedModule,
    loadJobsForModule,
    goToDashboard,
    refreshMetrics: fetchMetrics,
    lastWsEvent,
    isConnected,
    connectionStatus,
    reconnectAttempt,
    reconnectCountdown,
    maxRetries,
    reconnect,
  };
}
