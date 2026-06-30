import { JobItem } from '@/hooks/use-automation-jobs';
import { Badge } from '@/components/ui/badge';
import { Bot, Activity, BrainCircuit, Hammer, Clock, Mail } from 'lucide-react';
import { formatSQLDate } from '@/lib/utils/date-format';
import { RunningIndicator } from './RunningIndicator';
import { motion } from 'framer-motion';
import { safeParseJSON } from '@/lib/services/automation/automation-types';
import { getStatusLabel, t, getCategoryLabel } from '@/lib/i18n';

interface JobCardProps {
  job: JobItem;
  onClick?: (job: JobItem) => void;
}

export function JobCard({ job, onClick }: JobCardProps) {
  const isInterrupted = job.status === 'Interrupted';
  const isRunning = job.status === 'Running';
  const isCompleted = job.status === 'Completed';

  const inputState = job.input_state ? safeParseJSON(job.input_state) : null;
  let emailReplyFrom = '';
  if (inputState && typeof inputState === 'object') {
    if ('email_reply' in inputState) {
      const reply = inputState.email_reply;
      if (reply && typeof reply === 'object' && 'from' in reply) {
        emailReplyFrom = String(reply.from);
      } else if ('from' in inputState) {
        emailReplyFrom = String(inputState.from);
      }
    }
  }

  const getCardColor = () => {
    return 'bg-card text-card-foreground hover:border-primary/50';
  };

  const getBadgeStyle = () => {
    if (isInterrupted) return 'bg-amber-500 text-white border-transparent';
    if (isCompleted) return 'bg-primary text-white border-transparent';
    return 'bg-indigo-600 text-white border-transparent';
  };

  const getBadgeText = () => {
    if (job.category) {
      if (isInterrupted) {
        if (['payment-validation', 'agent-communication', 'email-reply'].includes(job.category)) {
          return getCategoryLabel(job.category).toUpperCase();
        }
        return getStatusLabel('Interrupted').toUpperCase();
      }
      return getCategoryLabel(job.category).toUpperCase();
    }
    if (isInterrupted) return getStatusLabel('Interrupted').toUpperCase();
    if (isCompleted) return t('ui.automatizado');
    return t('ui.aiApex');
  };

  return (
    <motion.div
      layout="position"
      layoutId={job.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`p-2 shadow-sm rounded-none cursor-pointer transition-colors border border-border/60 flex flex-col justify-between h-[92px] overflow-hidden w-full min-w-0 ${getCardColor()}`}
      onClick={() => onClick && onClick(job)}
    >
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between gap-2 w-full min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {job.isApex ? (
              <Hammer className="w-3.5 h-3.5 flex-shrink-0" />
            ) : job.isWorkflow ? (
              <BrainCircuit className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <Bot className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            <span className="font-semibold text-xs truncate block">{job.name || job.kind}</span>
          </div>
          {isRunning && (
            <div className="flex-shrink-0">
              <RunningIndicator />
            </div>
          )}
        </div>

        {emailReplyFrom && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground w-full min-w-0">
            <Mail className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate block flex-1">{emailReplyFrom}</span>
          </div>
        )}

        {job.scheduled_at && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground w-full min-w-0">
            <Clock className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate block flex-1">{formatSQLDate(job.scheduled_at, job.timezone)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-1 w-full min-w-0">
        <div className="flex items-center gap-1 text-[10px] opacity-80 min-w-0 flex-1">
          <Activity className="w-3 h-3 flex-shrink-0" />
          <span className="truncate block">{formatSQLDate(job.created_at, job.timezone)}</span>
        </div>
        <Badge variant="outline" className={`rounded-none text-[8px] font-bold px-1.5 py-0 tracking-wider flex-shrink-0 ml-2 ${getBadgeStyle()}`}>
          {getBadgeText()}
        </Badge>
      </div>
    </motion.div>
  );
}
