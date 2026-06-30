import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { resumeWorkflowAction, getWorkflowMermaidAction } from '@/lib/actions/automation';
import { safeParseJSON } from '@/lib/services/automation/automation-types';
import { HITLFormRenderer } from './HITLFormRenderer';
import { UiEvent } from '@zavora-ai/adk-ui-react';
import { JobItem } from '@/hooks/use-automation-jobs';
import PingPulse from '@/components/ui/ping-pulse';
import { JobObservabilityViewer } from './JobObservabilityViewer';
import { AttachmentViewer } from './AttachmentViewer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Workflow, BrainCircuit, Eye, EyeOff } from 'lucide-react';
import dynamic from 'next/dynamic';
import { getModuleLabel, getStatusLabel, getFieldLabel, getJobSchemaLabel, t } from '@/lib/i18n';

const MermaidViewer = dynamic(
  () => import('./MermaidViewer').then((mod) => mod.MermaidViewer),
  { ssr: false }
);

export interface JobDetailPanelProps {
  job: JobItem | null;
  onClose: () => void;
}

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import { Spinner } from '../ui/spinner';

function formatSQLDate(dateInput?: any, timezone?: string) {
  if (!dateInput) return '';

  let d: Date;
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
    if (match) {
      d = new Date(`${match[1]}T${match[2]}Z`);
    } else {
      const num = Number(dateInput);
      if (!isNaN(num) && num > 0) {
        d = new Date(num < 10000000000 ? num * 1000 : num);
      } else {
        d = new Date(dateInput);
      }
    }
  } else if (typeof dateInput === 'number') {
    d = new Date(dateInput < 10000000000 ? dateInput * 1000 : dateInput);
  } else {
    d = new Date(dateInput);
  }

  if (isNaN(d.getTime())) return String(dateInput);

  if (timezone) {
    try {
      return formatInTimeZone(d, timezone, "d 'de' MMM, HH:mm:ss", { locale: es });
    } catch (e) {
      // fallback if timezone is invalid
    }
  }

  return format(d, "d 'de' MMM, HH:mm:ss", { locale: es });
}

function renderListText(text: string) {
  if (!text || typeof text !== 'string') return text;

  const listPattern = /(?:^|\s+)(?=\d+\.\s)/;
  if (!listPattern.test(text)) return text;

  const parts = text.split(listPattern).filter(p => p.trim());
  if (parts.length <= 1) return text;

  return (
    <div className="flex flex-col gap-1.5 mt-1 text-[11px] sm:text-xs">
      {parts.map((part, i) => (
        <span key={i} className="block leading-relaxed">{part.trim()}</span>
      ))}
    </div>
  );
}

function ExpandableDescription({ text, maxLength = 150 }: { text: string; maxLength?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  if (text.length <= maxLength) {
    return <span className="text-sm text-muted-foreground">{text}</span>;
  }

  return (
    <div className="flex flex-col items-start">
      <span className="text-sm text-muted-foreground">
        {expanded ? text : `${text.slice(0, maxLength)}...`}
      </span>
      <button
        onClick={(e) => { e.preventDefault(); setExpanded(!expanded); }}
        className="text-[11px] text-primary font-medium hover:underline mt-0.5"
      >
        {expanded ? t('ui.verMenos') : t('ui.verMas')}
      </button>
    </div>
  );
}

function AgentDefinitionViewer({ agent }: { agent: any }) {
  if (!agent) return null;
  return (
    <div className="flex flex-col gap-3 mt-2 mb-2 w-full">
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-foreground">{t('ui.nombre')}:</span>
        <span className="text-sm text-muted-foreground">{agent.name}</span>
      </div>
      {agent.id && (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-foreground">{t('ui.agenteId')}:</span>
          <span className="text-xs font-mono text-muted-foreground">{agent.id}</span>
        </div>
      )}
      {agent.description && (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-foreground">{t('ui.descripcion')}:</span>
          <ExpandableDescription text={agent.description} />
        </div>
      )}
      {agent.skill_tags && agent.skill_tags.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-foreground">{t('ui.skillsActivos')}:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {agent.skill_tags.map((skill: string) => (
              <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WorkflowDefinitionViewer({ workflow }: { workflow: any }) {
  const [mermaidData, setMermaidData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agentsModalOpen, setAgentsModalOpen] = useState(false);

  const composedAgents = workflow.composed_agents || [];

  const handleVisualize = async () => {
    if (mermaidData) return;
    setLoading(true);
    try {
      const targetId = workflow.id;
      const data = await getWorkflowMermaidAction(targetId);
      setMermaidData(data);
    } catch (err) {
      console.error("Error fetching workflow mermaid", err);
    }
    setLoading(false);
  };

  if (!workflow) return null;

  let graphData: any = null;
  if (workflow.graph_json) {
    graphData = typeof workflow.graph_json === 'string' ? safeParseJSON(workflow.graph_json) : workflow.graph_json;
  }

  const agentNodes = graphData?.nodes?.filter((n: any) => n.type === 'agent') || [];
  const functionNodes = graphData?.nodes?.filter((n: any) => n.type === 'function') || [];

  return (
    <div className="flex flex-col gap-4 mt-2 mb-2 w-full">
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-foreground">{t('ui.nombre')}:</span>
        <span className="text-sm text-muted-foreground">{workflow.name}</span>
      </div>
      {workflow.description && (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-foreground">{t('ui.descripcion')}:</span>
          <ExpandableDescription text={workflow.description} />
        </div>
      )}

      {graphData && (
        <div className="flex flex-col gap-2 p-3 bg-secondary/50 rounded-none border border-border/50">
          <span className="font-semibold text-sm">{t('ui.composicionDelGrafo')}</span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col">
              <span className="text-muted-foreground font-semibold">{t('ui.agentes')}</span>
              <span className="text-muted-foreground">{agentNodes.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground font-semibold">{t('ui.funciones')}</span>
              <span className="text-muted-foreground">{functionNodes.length}</span>
            </div>
          </div>
          <div className="flex gap-2 w-full mt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs gap-1.5"
              onClick={handleVisualize}
              disabled={loading}
            >
              {loading ? <Spinner className="w-3 h-3" /> : <Workflow className="w-3.5 h-3.5" />}
              {t('ui.verDiagrama')}
            </Button>

            {composedAgents.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs gap-1.5"
                onClick={() => setAgentsModalOpen(true)}
              >
                <BrainCircuit className="w-3.5 h-3.5" />
                {t('ui.verAgentes')}
              </Button>
            )}
          </div>

          <Dialog open={agentsModalOpen} onOpenChange={setAgentsModalOpen}>
            <DialogContent className="max-w-3xl w-[90vw] max-h-[85vh] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="p-4 pb-2 border-b border-border flex-shrink-0">
                <DialogTitle>{t('ui.agentesDelGrafo')}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-muted/20">
                {composedAgents.map((agent: any, index: number) => (
                  <div key={agent.id} className="p-4 border border-border bg-background rounded-none shadow-xs relative">
                    <div className="absolute top-4 right-4 bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <AgentDefinitionViewer agent={agent} />
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!mermaidData} onOpenChange={(open) => { if (!open) setMermaidData(null); }}>
            <DialogContent
              className="!max-w-[95vw] w-[95vw] h-[95vh] !max-h-[95vh] flex flex-col p-0 overflow-hidden"
              onInteractOutside={(e) => e.preventDefault()}
            >
              <DialogHeader className="p-4 pb-2 border-b border-border flex-shrink-0">
                <DialogTitle>{t('ui.flujoDelGrafo')}: {workflow.name}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden">
                {mermaidData && <MermaidViewer chart={mermaidData} />}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

function JobContextViewer({ job }: { job: any }) {
  const rawInputState = safeParseJSON(job.input_state) || safeParseJSON(job.input_content) || safeParseJSON(job.payload) || job.payload;
  const metadata = safeParseJSON(job.metadata);

  const jobTypeStr = metadata?.job_type || (job.isApex ? 'apex-job' : (job.isWorkflow ? 'agent-workflow-job' : 'agent-job'));
  const schemaKey = `${jobTypeStr}_${job.category}`;

  const getTranslation = (key: string): string => {
    const schemaLabel = getJobSchemaLabel(schemaKey, key) ?? getJobSchemaLabel(`agent-workflow-job_${job.category}`, key);
    if (schemaLabel) return schemaLabel;
    return getFieldLabel(key);
  };

  const TECHNICAL_KEYS = new Set([
    'pending_ui_form',
    'affected_ids',
    'duration',
    'records',
    'payload',
    'attachment_names',
    'attachments',
    'errors',
    'status',
    'collection_flow_id',
    'prior_promise',
    'preferred_channels',
    '__job_app_name'
  ]);

  const preprocessInputState = (obj: any, isRoot = false): any => {
    const result: any = {};

    if (obj !== null && obj !== undefined) {
      if (typeof obj !== 'object') {
        if (!isRoot) return obj;
        if (obj !== '') {
          result['payload'] = obj;
        }
      } else if (Array.isArray(obj)) {
        if (!isRoot) return obj.map((v: any) => preprocessInputState(v, false));
        result['items'] = obj.map((v: any) => preprocessInputState(v, false));
      } else {
        for (const [k, v] of Object.entries(obj)) {
          if (k.startsWith('__')) continue;
          if (TECHNICAL_KEYS.has(k)) continue;
          if ((k.endsWith('_id') || k === 'id') && k !== 'message_id') {
            continue;
          }
          result[k] = preprocessInputState(v, false);
        }
      }
    }

    if (isRoot) {
      if (job.customer_name) result['customer_name'] = job.customer_name;
      if (job.business_name) result['business_name'] = job.business_name;
      if (job.business_account_name) result['business_account_name'] = job.business_account_name;
      if (metadata?.invoices) result['invoices'] = metadata.invoices;
    }

    return result;
  };

  const inputState = preprocessInputState(rawInputState, true);

  const rawAttachments = rawInputState?.attachment_names || rawInputState?.atachment_names || rawInputState?.attachments;
  const attachmentPaths = Array.isArray(rawAttachments) ? rawAttachments : [];
  const hasAttachments = attachmentPaths.length > 0;

  let tipoBadge = <span className="break-words font-mono text-xs">{job.kind}</span>;
  if (job.kind === 'Single') {
    tipoBadge = <Badge variant="default">{t('ui.ejecucionUnica')}</Badge>;
  } else if (job.kind) {
    tipoBadge = <span className="break-words font-mono text-xs">{getTranslation(job.kind.toLowerCase()) || getTranslation(job.kind) || job.kind}</span>;
  }

  const jobInfo: any = {
    ID: job.id || job.job_id,
    ...(job.name ? { name: job.name } : {}),
    ...(job.category ? { category: job.category } : {}),
    ...(metadata?.job_type ? { job_type: metadata.job_type } : {}),
    Módulo: job.module ? getModuleLabel(job.module) : '',
    Tipo: tipoBadge,
    Estado: job.status ? getStatusLabel(job.status) : '',
    'Creado en': formatSQLDate(job.created_at, job.timezone),
    ...(job.updated_at ? { 'Actualizado en': formatSQLDate(job.updated_at, job.timezone) } : {})
  };

  const hasAgentInfo = job.agent_id || job.result_content || job.error_message || job.agent || job.isWorkflow || job.session_id || (job.isApex && job.result);

  const renderAgentDefinition = () => {
    const agent = job.agent;
    if (!agent) return null;
    if (job.isWorkflow) {
      return <WorkflowDefinitionViewer workflow={agent} />;
    }
    return <AgentDefinitionViewer agent={agent} />;
  };

  const agentInfo = hasAgentInfo ? {
    ...(job.agent ? { [job.isWorkflow ? t('ui.grafo') : t('ui.agente')]: renderAgentDefinition() } : {}),
    ...(job.agent_id ? { [t('ui.agenteId')]: job.agent_id } : {}),
    ...(job.session_id ? { [t('ui.idSesion')]: job.session_id } : {}),
    ...(job.user_id ? { [t('ui.usuarioId')]: job.user_id } : {}),
    ...(job.result_content ? { [t('ui.resultado')]: job.result_content } : {}),
    ...(job.result_reasoning ? { [t('ui.razonamiento')]: job.result_reasoning } : {}),
    ...(job.isApex && job.result ? { [t('ui.resultado')]: safeParseJSON(job.result) || job.result } : {}),
    ...(job.error_message ? { [t('ui.error')]: job.error_message } : {}),
  } : null;

  const renderKeyValue = (data: any) => {
    if (!data || typeof data !== 'object') return null;
    const isArray = Array.isArray(data);
    return (
      <div className="flex flex-col gap-2 text-sm">
        {Object.entries(data).map(([key, val]) => {
          if (val === null || val === undefined || val === '') return null;
          if (Array.isArray(val) && val.length === 0) return null;
          if (typeof val === 'object' && !React.isValidElement(val) && Object.keys(val).length === 0) return null;

          let displayKey = getTranslation(key) || getTranslation(key.toLowerCase()) || key.replace(/_/g, ' ');
          if (isArray && !isNaN(Number(key))) {
            displayKey = `${Number(key) + 1}`;
          }

          if (typeof val === 'object' && val !== null) {
            if (React.isValidElement(val)) {
              return (
                <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-1 border-b border-border/40 pb-1 last:border-0 last:pb-0">
                  <span className="font-medium min-w-[140px] text-sm text-muted-foreground ">{displayKey}:</span>
                  <div className="flex-1">{val}</div>
                </div>
              );
            }
            return (
              <div key={key} className="pl-3 border-l-2 border-primary/20 my-1">
                <span className="font-semibold text-sm text-muted-foreground">{displayKey}:</span>
                <div className="mt-1">{renderKeyValue(val)}</div>
              </div>
            );
          }

          let displayVal: any = String(val);
          if (typeof val === 'boolean') {
            displayVal = val ? t('ui.si') : t('ui.no');
          } else if (typeof val === 'number' && (key.toLowerCase().includes('amount') || key.toLowerCase().includes('monto') || key === 'amount' || key === 'outstanding_amount')) {
            displayVal = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val);
          } else if (typeof val === 'string') {
            const lowerVal = val.trim().toLowerCase();
            if (lowerVal === 'true') {
              displayVal = t('ui.si');
            } else if (lowerVal === 'false') {
              displayVal = t('ui.no');
            } else if (lowerVal === 'null' || lowerVal === 'undefined' || lowerVal === 'none') {
              displayVal = '-';
            } else {
              const translated = getFieldLabel(val.toLowerCase()) !== val.toLowerCase() ? getFieldLabel(val.toLowerCase()) : (getFieldLabel(val) !== val ? getFieldLabel(val) : null);
              if (translated) {
                displayVal = translated;
              } else {
                displayVal = renderListText(val);
              }
            }
          }

          return (
            <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-1 border-b border-border/40 pb-1 last:border-0 last:pb-0 mt-1">
              <span className="font-medium min-w-[140px] text-muted-foreground">{displayKey}:</span>
              <span className="break-words flex-1 font-mono text-xs">{displayVal}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Accordion type="multiple" defaultValue={["info", "input", "agent"]} className="mb-6 w-full">
      <AccordionItem value="info" className="border-border rounded-none">
        <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3 px-1">{t('ui.informacionGeneral')}</AccordionTrigger>
        <AccordionContent className="bg-muted/10 p-4 border border-border rounded-none">
          {renderKeyValue(jobInfo)}
        </AccordionContent>
      </AccordionItem>

      {inputState && Object.keys(inputState).length > 0 && (
        <AccordionItem value="input" className="border-border rounded-none">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3 px-1">{t('ui.trabajo')}</AccordionTrigger>
          <AccordionContent className="bg-muted/10 p-4 border border-border rounded-none">
            {renderKeyValue(inputState)}
          </AccordionContent>
        </AccordionItem>
      )}



      {agentInfo && Object.keys(agentInfo).length > 0 && (
        <AccordionItem value="agent" className="border-border rounded-none">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3 px-1">
            {job.isApex ? t('ui.resultadoEjecucion') : t('ui.ejecucionAgente')}
          </AccordionTrigger>
          <AccordionContent className="bg-muted/10 p-4 border border-border rounded-none">
            {renderKeyValue(agentInfo)}
          </AccordionContent>
        </AccordionItem>
      )}

      {metadata && Object.keys(metadata).length > 0 && (
        <AccordionItem value="metadata" className="border-border rounded-none">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3 px-1">{t('ui.metadatos')}</AccordionTrigger>
          <AccordionContent className="bg-muted/10 p-4 border border-border rounded-none">
            {renderKeyValue(metadata)}
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}

export function JobDetailPanel({ job, onClose }: JobDetailPanelProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);

  useEffect(() => {
    console.log("Job: ", job);
  }, [job])


  const handleAction = async (event: UiEvent) => {
    if (event.action === 'form_submit') {
      setSubmitting(true);
      setError(null);
      try {
        await resumeWorkflowAction(job!.id, { state_updates: event.data });
        onClose();
      } catch (err: any) {
        setError(err.message || t('ui.errorAlReanudar'));
      } finally {
        setSubmitting(false);
      }
    }
  };

  const isOpen = !!job;

  let uiForm = null;
  let attachmentPaths: string[] = [];
  if (job) {
    if (job.interrupt_data) {
      const parsed = safeParseJSON(job.interrupt_data);
      uiForm = parsed?.interrupt?.data?.ui_form;
    }
    const rawInputState = safeParseJSON(job.input_state) || safeParseJSON(job.input_content) || safeParseJSON(job.payload) || job.payload;
    const rawAttachments = rawInputState?.attachment_names || rawInputState?.atachment_names || rawInputState?.attachments;
    attachmentPaths = Array.isArray(rawAttachments) ? rawAttachments : [];
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-[600px] w-[90vw] overflow-y-auto rounded-none border-l border-border p-0 flex flex-col">
        <SheetHeader className="p-6 border-b border-border bg-muted/20">
          <SheetTitle className="uppercase tracking-wider">
            {job?.status === 'Interrupted' ? t('ui.intervencionHumana') : t('ui.detallesDelTrabajo')}
            <SheetDescription className="block text-sm mt-1 font-normal">
              {job?.name || job?.kind || t('ui.procesandoAprobacion')}
            </SheetDescription>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 relative">

          {submitting && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-8" />
                <span className="text-sm font-medium">{t('ui.enviandoDecision')}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 m-4 bg-red-500/10 text-red-500 text-sm border border-red-500/20 rounded-none">
              {error}
            </div>
          )}

          {job && (
            <Tabs defaultValue="scenario" className="w-full flex flex-col h-full">
              <div className="px-6 border-b border-border flex-shrink-0">
                <TabsList className="w-full justify-start rounded-none bg-transparent h-auto p-0 flex">
                  <TabsTrigger value="scenario" className="rounded-none border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3 px-4 flex-1 text-xs">
                    {t('ui.contextoDelTrabajo')}
                  </TabsTrigger>

                  {uiForm && (
                    <TabsTrigger
                      value="action"
                      className="rounded-none border-transparent data-[state=active]:border-amber-500 dark:data-[state=active]:border-amber-400 data-[state=active]:text-amber-500 dark:data-[state=active]:text-amber-400 data-[state=active]:bg-amber-500/5 data-[state=active]:shadow-none py-3 px-4 flex-1 text-xs text-primary/70 dark:text-amber-400/70 hover:text-amber-500 dark:hover:text-amber-400 transition-all"
                    >
                      <div className="flex items-center gap-1.5 justify-center text-amber-500">
                        <PingPulse color='amber' />
                        <span>{t('ui.accionRequerida')}</span>
                      </div>
                    </TabsTrigger>
                  )}

                  {!job.isApex && (
                    <TabsTrigger value="log" className="rounded-none border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3 px-4 flex-1 text-xs">
                      {t('ui.registrosDeDecision')}
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <TabsContent value="scenario" className="flex-1 p-6 m-0 outline-none overflow-y-auto">
                <JobContextViewer job={job} />
              </TabsContent>

              {uiForm && (
                <TabsContent value="action" className="flex-1 p-6 m-0 outline-none overflow-y-auto">
                  <div className="flex flex-col gap-6 w-full">
                    {attachmentPaths.length > 0 && (
                      <Collapsible
                        open={isAttachmentsOpen}
                        onOpenChange={setIsAttachmentsOpen}
                        className="flex flex-col gap-2 w-full border border-border p-4 bg-muted/10 rounded-none"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">{attachmentPaths.length} {attachmentPaths.length === 1 ? t('ui.archivoAdjunto') : t('ui.archivosAdjuntos')}</span>
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm" className="rounded-none gap-2 w-[90px]">
                              {isAttachmentsOpen ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                              {isAttachmentsOpen ? t('ui.ocultar') : t('ui.ver')}
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent className="pt-2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 slide-in-from-top-2">
                          <AttachmentViewer paths={attachmentPaths} />
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                    <HITLFormRenderer
                      components={uiForm.components ? uiForm.components : [uiForm]}
                      theme={uiForm.theme || 'light'}
                      onAction={handleAction}
                    />
                  </div>
                </TabsContent>
              )}

              {!job.isApex && (
                <TabsContent value="log" className="flex-1 p-6 m-0 outline-none overflow-y-auto">
                  <JobObservabilityViewer jobId={job.id || job.job_id} sessionId={job.session_id} />
                </TabsContent>
              )}
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
