import { useState } from 'react';
import { AutomationMetricsResponse } from '@/lib/services/automation/automation-types';
import { ViewMode } from '@/hooks/use-automation-jobs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Layers, ChevronRight, Menu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getModuleLabel, t } from '@/lib/i18n';

interface ModuleSidebarProps {
  metrics: AutomationMetricsResponse | null;
  viewMode: ViewMode;
  selectedModule: string | null;
  onSelectModule: (module: string) => void;
  onDashboardClick: () => void;
}

export function ModuleSidebar({ metrics, viewMode, selectedModule, onSelectModule, onDashboardClick }: ModuleSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const modules = metrics?.modules || [];

  return (
    <div className={`border-r border-border bg-card h-full flex flex-col flex-shrink-0 transition-all duration-300 relative ${isCollapsed ? 'w-[48px]' : 'w-[150px]'}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-6 z-20 p-1 bg-background border border-border hover:bg-muted shadow-sm rounded-none text-muted-foreground hover:text-foreground transition-colors"
        title={isCollapsed ? t('ui.expandir') : t('ui.colapsar')}
      >
        <Menu className="w-4 h-4" />
      </button>

      <div className={`p-4 border-b border-border bg-muted/20 flex flex-col min-h-[88px] justify-center ${isCollapsed ? 'items-center px-2 py-4' : ''}`}>
        {!isCollapsed && (
          <div className="mt-2">
            <h1 className="text-xl font-bold mb-1 tracking-wider">{t('ui.modulos')}</h1>
            <p className="text-xs text-muted-foreground">{t('ui.gestionAgentes')}</p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className={`py-3 ${isCollapsed ? 'px-0' : 'px-3'}`}>

          <div className="flex flex-col gap-1">
            {modules.map(mod => {
              const total = mod.total_agent_jobs + mod.total_workflow_jobs + (mod.total_apex_jobs || 0);
              if (total === 0) return null;

              const isSelected = viewMode === 'detail' && selectedModule === mod.module;

              return (
                <button
                  key={mod.module}
                  onClick={() => onSelectModule(mod.module)}
                  title={isCollapsed ? mod.module : undefined}
                  className={`flex items-center py-2 text-sm transition-colors rounded-none w-full text-left border border-transparent ${isSelected ? 'bg-primary/10 text-primary border-primary/20' : 'hover:bg-muted/50'
                    } ${isCollapsed ? 'justify-center px-0' : 'justify-between px-3'}`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
                    <Layers className="w-4 h-4 opacity-70 flex-shrink-0" />
                    {!isCollapsed && <span className="capitalize whitespace-nowrap overflow-hidden text-ellipsis">{getModuleLabel(mod.module)}</span>}
                  </div>
                  {!isCollapsed && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-none text-[10px] px-1.5 py-0">
                        {total}
                      </Badge>
                      <ChevronRight className="w-3 h-3 opacity-50 flex-shrink-0" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
