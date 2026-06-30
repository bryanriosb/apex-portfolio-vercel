import { JobItem } from '@/hooks/use-automation-jobs';
import { KanbanColumn } from './KanbanColumn';
import { JobCard } from './JobCard';
import { AutomationLog } from './AutomationLog';
import { Loader2, AlertCircle, CheckCircle2, ListTodo, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '../ui/spinner';
import { getModuleLabel, t } from '@/lib/i18n';

interface DetailViewProps {
  moduleName: string;
  jobs: JobItem[];
  loading: boolean;
  onJobClick: (job: JobItem) => void;
  onBack: () => void;
}

export function DetailView({ moduleName, jobs, loading, onJobClick, onBack }: DetailViewProps) {
  const pendingJobs = jobs.filter(j => j.status === 'Pending');
  const processingJobs = jobs.filter(j => j.status === 'Running');
  const approvalJobs = jobs.filter(j => j.status === 'Interrupted');
  const completedJobs = jobs.filter(j => j.status === 'Completed');

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex-1 flex flex-col h-full min-w-0">
        <div className="p-4 border-b border-border bg-card flex items-center gap-4 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-none hover:bg-muted">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider">{getModuleLabel(moduleName)}</h1>
            <p className="text-xs text-muted-foreground">{jobs.length} {t('ui.automatizacionesTotales')}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Spinner className="size-8" />
              <p className="text-sm text-muted-foreground">{t('ui.cargando')}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto p-4 bg-background">
            <div className="flex gap-4 h-full min-w-max pb-4">
              <KanbanColumn
                title={t('ui.pendiente')}
                count={pendingJobs.length}
                icon={<ListTodo className="w-4 h-4" />}
                colorClass="bg-slate-500/10 text-slate-500"
              >
                {pendingJobs.map(job => (
                  <JobCard key={job.id} job={job} onClick={onJobClick} />
                ))}
              </KanbanColumn>

              <KanbanColumn
                title={t('ui.procesando')}
                count={processingJobs.length}
                icon={<Loader2 className="w-4 h-4" />}
                colorClass="bg-blue-500/10 text-blue-500"
              >
                {processingJobs.map(job => (
                  <JobCard key={job.id} job={job} onClick={onJobClick} />
                ))}
              </KanbanColumn>

              <KanbanColumn
                title={t('ui.aprobacion')}
                count={approvalJobs.length}
                icon={<AlertCircle className="w-4 h-4" />}
                colorClass="bg-amber-500/10 text-amber-500"
              >
                {approvalJobs.map(job => (
                  <JobCard key={job.id} job={job} onClick={onJobClick} />
                ))}
              </KanbanColumn>

              <KanbanColumn
                title={t('ui.completado')}
                count={completedJobs.length}
                icon={<CheckCircle2 className="w-4 h-4" />}
                colorClass="bg-green-500/10 text-green-500"
              >
                {completedJobs.map(job => (
                  <JobCard key={job.id} job={job} onClick={onJobClick} />
                ))}
              </KanbanColumn>
            </div>
          </div>
        )}
      </div>

      <AutomationLog moduleName={moduleName} />
    </div>
  );
}
