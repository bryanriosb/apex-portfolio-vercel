import { useEffect, useState } from 'react';
import { getAutomationLogAction } from '@/lib/actions/automation';
import { AutomationLogEntry } from '@/lib/services/automation/automation-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import { Activity, Loader2 } from 'lucide-react';
import { useActiveBusinessStore } from '@/lib/store/active-business-store';
import { t } from '@/lib/i18n';

export function AutomationLog({ moduleName }: { moduleName: string }) {
  const { activeBusiness } = useActiveBusinessStore();
  const activeBusinessId = activeBusiness?.id;

  const [logs, setLogs] = useState<AutomationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!activeBusinessId) return;
      setLoading(true);
      try {
        const data = await getAutomationLogAction(moduleName, activeBusinessId);
        setLogs(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [moduleName, activeBusinessId]);

  return (
    <div className="w-[300px] border-l border-border bg-card h-full flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-border bg-muted/20">
        <h2 className="font-semibold flex items-center gap-2 uppercase tracking-wide text-sm">
          <Activity className="w-4 h-4 text-primary" />
          {t('ui.registros')}
        </h2>
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center p-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">{t('ui.cargando')}</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground italic text-center mt-4">{t('ui.noHayEventosRecientes')}</div>
        ) : (
          <div className="p-4 flex flex-col gap-4">
            {logs.map(log => (
              <div key={log.id} className="flex flex-col gap-1 text-sm border-b border-border/50 pb-3 last:border-0">
                <span className="text-[10px] text-muted-foreground uppercase">
                  {(() => {
                    if (!log.timestamp) return '';
                    let d: Date;
                    
                    if (typeof log.timestamp === 'string') {
                      const match = log.timestamp.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
                      if (match) {
                        d = new Date(`${match[1]}T${match[2]}Z`);
                      } else {
                        const num = Number(log.timestamp);
                        if (!isNaN(num) && num > 0) {
                          d = new Date(num < 10000000000 ? num * 1000 : num);
                        } else {
                          d = new Date(log.timestamp);
                        }
                      }
                    } else if (typeof log.timestamp === 'number') {
                      d = new Date(log.timestamp < 10000000000 ? log.timestamp * 1000 : log.timestamp);
                    } else {
                      d = new Date(log.timestamp);
                    }
                    
                    if (isNaN(d.getTime())) return String(log.timestamp);
                    
                    if ((log as any).timezone) {
                      try {
                        return formatInTimeZone(d, (log as any).timezone, "d 'de' MMM, HH:mm:ss", { locale: es });
                      } catch(e) {}
                    }
                    return format(d, "d 'de' MMM, HH:mm:ss", { locale: es });
                  })()}
                </span>
                <span className="font-semibold text-[13px] text-foreground">{log.event_type}</span>
                <span className="text-muted-foreground text-xs">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
