import { ScrollArea } from '@/components/ui/scroll-area';

interface KanbanColumnProps {
  title: string;
  count: number;
  icon?: React.ReactNode;
  colorClass?: string;
  children: React.ReactNode;
}

export function KanbanColumn({ title, count, icon, colorClass = "text-muted-foreground border-border/60", children }: KanbanColumnProps) {
  return (
    <div className="flex flex-col flex-1 min-w-[120px] h-full bg-card border-r border-border/60 last:border-r-0 overflow-hidden">
      <div className={`px-3 py-2 flex items-center justify-between border-b border-border/60 ${colorClass}`}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-[11px] uppercase tracking-wider">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-muted-foreground">{count}</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        <ScrollArea type="always" className="h-full w-full [&_[data-slot=scroll-area-viewport]>div]:!block">
          <div className="flex flex-col gap-2 py-2 px-2 pb-4 w-full overflow-x-hidden">
            {children}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
