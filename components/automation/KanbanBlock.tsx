import { KanbanColumn } from './KanbanColumn';
import { JobCard } from './JobCard';
import { JobItem } from '@/hooks/use-automation-jobs';
import { Loader2, AlertCircle, CheckCircle2, ListTodo, Activity, PlaySquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { t } from '@/lib/i18n';


interface KanbanBlockProps {
  moduleName: string;
  jobs: JobItem[];
  onJobClick: (job: JobItem) => void;
}

export function KanbanBlock({ moduleName, jobs, onJobClick }: KanbanBlockProps) {
  const pendingJobs = jobs.filter(j => j.status === 'Pending');
  const processingJobs = jobs.filter(j => j.status === 'Running');
  const approvalJobs = jobs.filter(j => j.status === 'Interrupted');
  const completedJobs = jobs.filter(j => j.status === 'Completed');

  const actionRequiredCount = approvalJobs.length;
  const automatedLast24h = completedJobs.length;

  const getModuleColor = () => {
    if (moduleName.toLowerCase().includes('order')) return 'bg-blue-900/40 border-blue-500/50';
    if (moduleName.toLowerCase().includes('maintenance')) return 'bg-red-900/40 border-red-500/50';
    if (moduleName.toLowerCase().includes('support')) return 'bg-orange-900/40 border-orange-500/50';
    return 'bg-slate-900/40 border-slate-500/50';
  };

  return (
    <div className="flex w-full mb-3 border border-border/40 rounded-sm overflow-hidden h-full bg-slate-50 dark:bg-secondary">
      {/* Columna 1: Metricas del Modulo */}
      <div className="w-[150px] bg-slate-200/50 dark:bg-secondary p-3 flex flex-col flex-shrink-0 border-r border-border/40">
        <div className="flex items-center gap-1.5 mb-2">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <h2 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase">
            {moduleName.toLowerCase() === "collection" ? "Cartera" : moduleName}
          </h2>
        </div>

        {
          actionRequiredCount > 0 && <div className="bg-white dark:bg-secondary border border-border/40 p-2 rounded-sm mb-2 flex items-center gap-2 shadow-sm">
            <div className="flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>

            <div className="min-w-0 flex items-center gap-1">
              <span className="font-bold text-sm leading-none">{actionRequiredCount}</span>
              <span className="text-xs whitespace-nowrap">Aprobación</span>
            </div>
          </div>

        }

        <div className="bg-white dark:bg-secondary border border-border/40 p-2 rounded-sm flex items-center gap-2 mb-4 shadow-sm">
          <div className="flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex flex-col items-start justify-center">
            <span className="font-bold text-sm leading-none mb-0.5">{automatedLast24h}</span>
            <span className="text-[9px] leading-tight text-slate-500">Gestiones 24h</span>
          </div>
        </div>

          <div className="flex flex-col gap-1 mt-auto">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Completitud</span>
              <span className="text-xs font-bold text-emerald-500">
                {jobs.length > 0 ? Math.round((completedJobs.length / jobs.length) * 100) : 0}%
              </span>
            </div>
          </div>
      </div>

      {/* Columna 2: Kanban Columns */}
      <div className="flex-1 bg-card/90 overflow-hidden flex flex-col min-w-0">
        <div className="flex h-full w-full min-w-0">
          <KanbanColumn
            title={t('ui.pendiente')}
            count={pendingJobs.length}
            icon={<ListTodo className="w-4 h-4" />}
            colorClass="text-slate-400"
          >
            {pendingJobs.map(job => (
              <JobCard key={job.id} job={job} onClick={onJobClick} />
            ))}
          </KanbanColumn>

          <KanbanColumn
            title={t('ui.procesando')}
            count={processingJobs.length}
            icon={<PlaySquare className="w-4 h-4" />}
            colorClass="text-blue-500"
          >
            {processingJobs.map(job => (
              <JobCard key={job.id} job={job} onClick={onJobClick} />
            ))}
          </KanbanColumn>

          <KanbanColumn
            title={t('ui.aprobacion')}
            count={approvalJobs.length}
            icon={<AlertCircle className="w-4 h-4" />}
            colorClass="text-amber-500"
          >
            {approvalJobs.map(job => (
              <JobCard key={job.id} job={job} onClick={onJobClick} />
            ))}
          </KanbanColumn>

          <KanbanColumn
            title={t('ui.completado')}
            count={completedJobs.length}
            icon={<Activity className="w-4 h-4" />}
            colorClass="text-primary"
          >
            {completedJobs.map(job => (
              <JobCard key={job.id} job={job} onClick={onJobClick} />
            ))}
          </KanbanColumn>
        </div>
      </div>
    </div>
  );
}
