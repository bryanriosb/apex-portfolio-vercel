'use client';

import { useEffect, useState } from 'react';
import { useAutomationJobs, JobItem } from '@/hooks/use-automation-jobs';
import { DashboardView } from './DashboardView';
import { DetailView } from './DetailView';
import { ModuleSidebar } from './ModuleSidebar';
import { JobDetailPanel } from './JobDetailPanel';

export interface AutomationLayoutProps {
  automationState: ReturnType<typeof useAutomationJobs>;
}

export function AutomationLayout({ automationState }: AutomationLayoutProps) {
  const {
    metrics,
    jobs,
    loading,
    viewMode,
    selectedModule,
    loadJobsForModule,
    goToDashboard,
    refreshMetrics,
    lastWsEvent
  } = automationState;

  const [selectedJobForHitl, setSelectedJobForHitl] = useState<JobItem | null>(null);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  const handleJobClick = (job: JobItem) => {
    setSelectedJobForHitl(job);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">

      {
        metrics && metrics.modules.length > 0 && (
          <ModuleSidebar
            metrics={metrics}
            viewMode={viewMode}
            selectedModule={selectedModule}
            onSelectModule={loadJobsForModule}
            onDashboardClick={goToDashboard}
          />)
      }


      <main className="flex-1 overflow-hidden relative">
        {viewMode === 'dashboard' ? (
          <DashboardView
            metrics={metrics}
            onJobClick={handleJobClick}
            lastWsEvent={lastWsEvent}
          />
        ) : selectedModule ? (
          <DetailView
            moduleName={selectedModule}
            jobs={jobs}
            loading={loading}
            onJobClick={handleJobClick}
            onBack={goToDashboard}
          />
        ) : null}
      </main>

      <JobDetailPanel
        job={selectedJobForHitl}
        onClose={() => setSelectedJobForHitl(null)}
      />
    </div>
  );
}
