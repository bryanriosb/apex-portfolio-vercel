'use client';

import { Sheet, SheetTrigger, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Workflow } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AutomationLayout } from '@/components/automation/AutomationLayout';
import { AutomationTicker } from '@/components/automation/AutomationTicker';
import { useAutomationJobs } from '@/hooks/use-automation-jobs';

export function AutomationSheet() {
  const automationState = useAutomationJobs();
  const { isConnected, reconnectAttempt, reconnectCountdown, maxRetries } = automationState;

  const getConnectionTooltip = () => {
    if (isConnected) return "Conectado";
    if (reconnectAttempt > 0) return `Reconectando - Intento ${reconnectAttempt} de ${maxRetries} - ${reconnectCountdown} s`;
    return "Conectando...";
  };

  return (
    <Sheet>
      <div className="relative flex items-center border-b border-border bg-accent/20">

        <AutomationTicker
          isConnected={isConnected}
          reconnectAttempt={reconnectAttempt}
          reconnectCountdown={reconnectCountdown}
          maxRetries={maxRetries}
          onReconnect={automationState.reconnect}
        />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className='flex items-center justify-center hover:bg-primary dark:hover:bg-primary  font-black  sm:text-xs uppercase tracking-widest rounded-none   border-2 border-gray-900 shadow-[3px_3px_0px_#000] dark:border-gray-300 dark:shadow-[3px_3px_0px_#8C8C8C] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all cursor-pointer'>
                    <Workflow className="h-4 w-4" />
                    <span className="text-xs font-semibold tracking-wide hidden sm:inline-block">Automatizaciones</span>
                  </Button>
                </SheetTrigger>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Panel de Automatizaciones</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <SheetContent side="top" className="h-[95vh] w-full rounded-none p-0 overflow-hidden flex flex-col">
        <SheetTitle className="sr-only">Panel de Automatizaciones</SheetTitle>
        <div className="flex items-center justify-center border-b border-border bg-accent/20 px-4 py-2 shrink-0">
          <div className="flex items-center gap-3 w-full">
            <AutomationTicker
              isConnected={isConnected}
              reconnectAttempt={reconnectAttempt}
              reconnectCountdown={reconnectCountdown}
              maxRetries={maxRetries}
              onReconnect={automationState.reconnect}
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-background">
          <AutomationLayout automationState={automationState} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
