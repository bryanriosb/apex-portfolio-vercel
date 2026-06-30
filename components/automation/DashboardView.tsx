import { useState, useEffect, useRef } from 'react';
import { AutomationMetricsResponse, type AutomationServerEvent } from '@/lib/services/automation/automation-types';
import { KanbanBlock } from './KanbanBlock';
import { JobItem } from '@/hooks/use-automation-jobs';
import { getAgentJobsAction, getWorkflowJobsAction, getApexJobsAction } from '@/lib/actions/automation';
import { useActiveBusinessStore } from '@/lib/store/active-business-store';
import { BrainCircuit } from 'lucide-react';
import { Spinner } from '../ui/spinner';
import { t } from '@/lib/i18n';

interface DashboardModuleBlockProps {
  moduleName: string;
  onJobClick: (job: JobItem) => void;
  lastWsEvent?: AutomationServerEvent | null;
}

function DashboardModuleBlock({ moduleName, onJobClick, lastWsEvent }: DashboardModuleBlockProps) {
  const { activeBusiness } = useActiveBusinessStore();
  const activeBusinessId = activeBusiness?.id;

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsReload, setNeedsReload] = useState(0);

  const jobsRef = useRef(jobs);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    setJobs([]);
    setLoading(true);
  }, [activeBusinessId, moduleName]);

  useEffect(() => {
    async function load() {
      if (!activeBusinessId) return;
      try {
        const [agentJobs, workflowJobs, apexJobs] = await Promise.all([
          getAgentJobsAction(moduleName, activeBusinessId),
          getWorkflowJobsAction(moduleName, activeBusinessId),
          getApexJobsAction(moduleName, activeBusinessId)
        ]);
        setJobs([
          ...agentJobs.map(j => ({ ...j, id: j.id || (j as any).job_id, isWorkflow: false })),
          ...workflowJobs.map(j => ({ ...j, id: j.id || (j as any).job_id, isWorkflow: true })),
          ...apexJobs.map(j => ({ ...j, id: j.id || (j as any).job_id, isWorkflow: false, isApex: true }))
        ]);
      } catch (err) {
        console.error('Failed to load jobs for module', moduleName, err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [moduleName, activeBusinessId, needsReload]);

  // Handle WS updates
  useEffect(() => {
    if (!lastWsEvent || lastWsEvent.type !== 'JobStateChanged') return;

    const idx = jobsRef.current.findIndex((j: JobItem) => j.id === lastWsEvent.job_id);
    if (idx === -1) {
      if (lastWsEvent.module && lastWsEvent.module.toLowerCase() === moduleName.toLowerCase()) {
        setNeedsReload(n => n + 1);
      }
    } else {
      setJobs(prev => {
        const newJobs = [...prev];
        const currentIdx = newJobs.findIndex((j: JobItem) => j.id === lastWsEvent.job_id);
        if (currentIdx !== -1 && newJobs[currentIdx].status !== lastWsEvent.new_status) {
          newJobs[currentIdx] = { ...newJobs[currentIdx], status: lastWsEvent.new_status };

          if (['Interrupted', 'Completed', 'Failed'].includes(lastWsEvent.new_status)) {
            setTimeout(() => {
              setNeedsReload(n => n + 1);
            }, 500);
          }
        }
        return newJobs;
      });
    }
  }, [lastWsEvent, moduleName]);

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-2">
          <Spinner className="size-8" />
           <p className="text-xs text-muted-foreground">{t('ui.cargando')}</p>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) return null;

  return <KanbanBlock moduleName={moduleName} jobs={jobs} onJobClick={onJobClick} />;
}

interface DashboardViewProps {
  metrics: AutomationMetricsResponse | null;
  onJobClick: (job: JobItem) => void;
  lastWsEvent?: AutomationServerEvent | null;
}

export function DashboardView({ metrics, onJobClick, lastWsEvent }: DashboardViewProps) {
  if (!metrics) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-8" />
          <p className="text-sm text-muted-foreground">{t('ui.cargando')}</p>
        </div>
      </div>
    );
  }

  const activeModules = metrics.modules.filter(
    m => (m.total_agent_jobs + m.total_workflow_jobs + (m.total_apex_jobs || 0)) > 0
  );

  if (activeModules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 min-h-[50vh]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <BrainCircuit className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-medium">{t('ui.noHayDatosDisponibles')}</p>
          <p className="text-sm text-muted-foreground">
            {t('ui.noSeHanRegistrado')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto min-w-0">
      <h1 className="text-xl font-bold mb-4 ml-4">{t('ui.tableroDeAutomatizacion')}</h1>
      <div className="flex flex-col gap-2 min-w-0 h-[calc(100vh-11.5rem)]">
        {activeModules.map(m => (
          <DashboardModuleBlock
            key={m.module}
            moduleName={m.module}
            onJobClick={onJobClick}
            lastWsEvent={lastWsEvent}
          />
        ))}
      </div>
    </div>
  );
}
