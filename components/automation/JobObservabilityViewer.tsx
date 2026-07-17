'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { observeJobAction } from '@/lib/actions/automation';
import { JobObserver } from '@/lib/services/automation/automation-types';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Brain, Coins, Clock, Zap, Mail, AlertTriangle, User, Wrench, ChevronDown, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getFieldLabel, t } from '@/lib/i18n';

interface JobObservabilityViewerProps {
  jobId?: string;
  sessionId?: string;
  /** Oculta costos de plataforma (USD) cuando es false; ej. Panel de Auditoría. */
  showCosts?: boolean;
}

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

const renderListText = (text: string) => {
  const listPattern = /(?:^|\s+)(?=\d+\.\s)/;
  if (!listPattern.test(text)) return text;
  
  const parts = text.split(listPattern).filter(p => p.trim());
  if (parts.length <= 1) return text;
  
  return (
    <div className="flex flex-col gap-1.5 mt-1">
      {parts.map((part, i) => (
        <span key={i} className="block leading-relaxed">{part.trim()}</span>
      ))}
    </div>
  );
};

const renderValue = (val: any): React.ReactNode => {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'string') {
    const lowerVal = val.trim().toLowerCase();
    if (lowerVal === 'true') return t('ui.si');
    if (lowerVal === 'false') return t('ui.no');
    if (lowerVal === 'null' || lowerVal === 'undefined' || lowerVal === 'none') return '-';

    if (val.trim().startsWith('<') && val.trim().endsWith('>')) {
      return <div dangerouslySetInnerHTML={{ __html: val }} className="prose prose-sm dark:prose-invert max-w-none text-[11px] leading-tight" />;
    }
    return renderListText(val);
  }
  if (typeof val !== 'object') {
    if (typeof val === 'boolean') return val ? t('ui.si') : t('ui.no');
    return String(val);
  }

  if (Array.isArray(val)) {
    return (
      <div className="flex flex-col gap-1 mt-1 w-full min-w-0">
        {val.map((item, i) => (
          <div key={i} className="pl-2 border-l border-border/50 bg-muted/5 py-1 pr-1 text-[11px] min-w-0 break-words w-full">
            {renderValue(item)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 mt-1 bg-muted/5 p-1.5 border border-border/50 w-full min-w-0">
      {Object.entries(val).map(([k, v]) => {
        if (k.startsWith('__')) return null;
        if (TECHNICAL_KEYS.has(k)) return null;
        if ((k.endsWith('_id') || k === 'id') && k !== 'message_id') return null;

        let displayVal = renderValue(v);
        if (typeof v === 'number' && (k.toLowerCase().includes('amount') || k.toLowerCase().includes('monto') || k === 'amount' || k === 'outstanding_amount')) {
          displayVal = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(v);
        }

        const isObjectOrArray = typeof v === 'object' && v !== null;

        if (isObjectOrArray) {
          return (
            <div key={k} className="flex flex-col w-full min-w-0 mb-1 last:mb-0">
               <span className="font-semibold text-foreground/80 text-[10px] shrink-0">{getFieldLabel(k)}:</span>
               <div className="pl-2 border-l border-primary/20 w-full min-w-0">
                 {displayVal}
               </div>
            </div>
          );
        }

        return (
          <div key={k} className="flex flex-col sm:flex-row sm:items-baseline gap-1 w-full min-w-0 border-b border-border/40 pb-1 last:border-0 last:pb-0">
            <span className="font-semibold text-foreground/80 text-[10px] sm:min-w-[120px] shrink-0">{getFieldLabel(k)}:</span>
            <div className="break-words whitespace-pre-wrap font-mono text-[11px] w-full min-w-0">
              {displayVal}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const cleanUserMessage = (text: string): string => {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && typeof parsed === 'object' && 'body_text' in parsed) {
        return parsed.body_text;
      }
    } catch (e) {
      // Return original text if parsing fails
    }
  }
  return text;
};

export function JobObservabilityViewer({ jobId, sessionId, showCosts = true }: JobObservabilityViewerProps) {
  const [data, setData] = useState<JobObserver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!jobId && !sessionId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await observeJobAction({ job_id: jobId, session_id: sessionId });
        if (response) {
          setData(response);
        } else {
          setError(t('ui.noHayDatosDisponibles'));
        }
      } catch (err: any) {
        setError(err.message || t('ui.error'));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [jobId, sessionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 h-full">
        <Spinner className="size-8" />
        <p className="text-sm text-muted-foreground">{t('ui.obteniendoRegistros')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-none">
        <AlertTriangle className="size-5 mb-2" />
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-muted-foreground text-sm">
        {t('ui.noHayDatosDisponibles')}
      </div>
    );
  }

  const { job, events = [], contacts = [], total_cost } = data;

  const seenEventIds = new Set<string>();
  const uniqueEvents = events.filter(ev => {
    if (!ev.id) return true;
    if (seenEventIds.has(ev.id)) return false;
    seenEventIds.add(ev.id);
    return true;
  });

  const totalTokens = uniqueEvents.reduce((acc, ev) => acc + (ev.tokens?.total_tokens || 0), 0);
  const totalInputTokens = uniqueEvents.reduce((acc, ev) => acc + (ev.tokens?.input_tokens || 0), 0);
  const totalOutputTokens = uniqueEvents.reduce((acc, ev) => acc + (ev.tokens?.output_tokens || 0), 0);

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null) return '$0.0000';
    return `$${val.toFixed(4)}`;
  };

  const formatDate = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return 'N/A';
    try {
      const d = new Date(dateInput);
      return format(d, "d 'de' MMM, HH:mm:ss", { locale: es });
    } catch {
      return String(dateInput);
    }
  };

  const translateKey = (k: string) => getFieldLabel(k) || k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const getAuthorBadge = (author: string) => {
    const authLower = author.toLowerCase();
    if (authLower === 'system' || authLower === 'function') {
      return (
          <Badge variant="outline" className="rounded-none font-normal text-[10px] px-1.5 py-0 border-border bg-muted/30">
            <Wrench className="w-3 h-3 mr-1 text-muted-foreground" /> {t('ui.sistema')}
        </Badge>
      );
    }
    if (authLower === 'user') {
      return (
          <Badge variant="secondary" className="rounded-none font-normal text-[10px] px-1.5 py-0">
            <User className="w-3 h-3 mr-1 text-foreground" /> {t('ui.usuario')}
        </Badge>
      );
    }
    return (
      <Badge className="rounded-none bg-primary text-primary-foreground font-semibold text-xs px-3 py-1 h-6">
        <Brain className="mr-2 !w-4 !h-4" /> {author.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const renderTextContent = (text: string) => {
    let cleanText = text.trim();
    if (cleanText.startsWith('```')) {
      const match = cleanText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
      if (match) {
        cleanText = match[1].trim();
      }
    }

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const beforeJson = cleanText.substring(0, jsonMatch.index).trim();
        const afterJson = cleanText.substring(jsonMatch.index! + jsonMatch[0].length).trim();
        
        return (
          <div className="flex flex-col gap-2">
            {beforeJson && <ReactMarkdown>{beforeJson}</ReactMarkdown>}
            <div className="bg-muted/10 border border-border/50 p-2.5 my-1 w-full text-xs">
              {renderValue(parsed)}
            </div>
            {afterJson && <ReactMarkdown>{afterJson}</ReactMarkdown>}
          </div>
        );
      } catch (e) {
        // fallback to markdown if parsing fails
      }
    }
    return <ReactMarkdown>{text}</ReactMarkdown>;
  };

  const renderedToolCalls = new Set<string>();

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="w-4 h-4" />
              {t('ui.observabilidadDeEjecucion')}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className={`grid ${showCosts ? 'grid-cols-3' : 'grid-cols-2'} bg-muted/20 border border-border px-1 py-2 rounded-none text-sm w-full divide-x divide-border/65`}>
        {showCosts && (
          <div className="flex items-center justify-center gap-3 px-1">
            <div className="p-1.5 bg-background border border-border rounded-none shrink-0">
              <Coins className="size-3 text-primary" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-muted-foreground font-medium text-[12px] uppercase tracking-wider truncate">{t('ui.costoTotal')}</span>
              <span className="text-sm font-bold text-foreground leading-none truncate">{formatCurrency(total_cost)}</span>
              <span className="text-[12px] text-muted-foreground truncate">{t('ui.usdAcumulado')}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 px-1">
          <div className="p-1.5 bg-background border border-border rounded-none shrink-0">
            <Zap className="size-3 text-primary" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-muted-foreground font-medium text-[12px] uppercase tracking-wider truncate">{t('ui.usoTokens')}</span>
            <span className="text-sm font-bold text-foreground leading-none truncate">{totalTokens.toLocaleString()}</span>
            <div className="flex gap-1 text-[11px] text-muted-foreground truncate">
              <span>{t('ui.ent')} {totalInputTokens.toLocaleString()}</span>
              <span>•</span>
              <span>{t('ui.sal')} {totalOutputTokens.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 px-1">
          <div className="p-1.5 bg-background border border-border rounded-none shrink-0">
            <Clock className="size-3 text-primary" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-muted-foreground font-medium text-[12px] uppercase tracking-wider truncate">{t('ui.eventos')}</span>
            <span className="text-sm font-bold text-foreground leading-none truncate">{uniqueEvents.length}</span>
            <span className="text-[12px] text-muted-foreground truncate">{t('ui.interacciones')}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-base font-semibold flex items-center gap-2 text-foreground border-b border-border pb-2">
          {t('ui.registrosDeDecision')}
        </h3>

        <div className="flex flex-col gap-4">
          {uniqueEvents.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 bg-muted/20 border border-border">
              {t('ui.noHayEventosRegistrados')}
            </div>
          ) : (
            uniqueEvents.map((event, idx) => {
              let textContent = (event.llm_response as any)?.text || event.llm_response?.content?.parts?.find((p) => p.text)?.text;
              if (event.author.toLowerCase() === 'user' && textContent) {
                textContent = cleanUserMessage(textContent);
              }
              const allToolCalls = event.llm_response?.content?.parts?.filter((p) => p.functionResponse || p.args) || [];

              const toolCalls = allToolCalls.filter(tool => {
                const name = tool.name || tool.functionResponse?.name || 'Herramienta';
                const args = tool.args || tool.functionResponse?.response;
                const toolKey = tool.id || `${name}_${JSON.stringify(args)}`;
                if (renderedToolCalls.has(toolKey)) {
                  return false;
                }
                renderedToolCalls.add(toolKey);
                return true;
              });

              if (!textContent && toolCalls.length === 0) {
                return null;
              }

              const isLast = idx === uniqueEvents.length - 1;

              return (
                <div key={event.id || idx} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-5 h-5 rounded-none border border-border bg-background text-[10px] font-semibold text-muted-foreground">
                      {idx + 1}
                    </div>
                    {!isLast && <div className="w-px h-full bg-border mt-2" />}
                  </div>

                  <Card className="rounded-none border-border shadow-none flex-1 bg-background hover:bg-muted/5 transition-colors">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                      <div className="flex items-center gap-3">
                        {getAuthorBadge(event.author)}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(event.timestamp)}
                        </span>
                      </div>
                      {showCosts && event.cost && event.cost > 0 ? (
                        <div className="text-[11px] font-mono font-medium text-muted-foreground/80 bg-muted/30 px-2 py-0.5 border border-border">
                          {formatCurrency(event.cost)}
                        </div>
                      ) : null}
                    </CardHeader>

                    <CardContent className="p-4 pt-2">
                      {textContent && (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 text-[13px] leading-relaxed">
                          {renderTextContent(textContent)}
                        </div>
                      )}

                      {toolCalls.length > 0 && (
                        <div className="mt-4 flex flex-col gap-2">
                          {toolCalls.map((tool, tidx) => {
                            const name = tool.name || tool.functionResponse?.name || 'Herramienta';
                            const args = tool.args || tool.functionResponse?.response;
                            const isResponse = !!tool.functionResponse;
                            const hasArgs = args && typeof args === 'object' && Object.keys(args).length > 0;

                            if (!hasArgs) {
                              return (
                                <div key={tidx} className="flex items-center gap-2 p-2 bg-muted/20 border border-border rounded-none">
                                  <div className={`p-1 border border-border ${isResponse ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                                    {isResponse ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Wrench className="w-3 h-3 text-primary" />}
                                  </div>
                                  <span className="text-[12px] font-semibold text-foreground">
                                    {isResponse ? `${t('ui.respuestaDe')} ${name}` : `${t('ui.ejecutando')} ${name}`}
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <Collapsible key={tidx} className="bg-muted/20 border border-border rounded-none overflow-hidden">
                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/30 transition-colors group">
                                  <div className="flex items-center gap-2">
                                    <div className={`p-1 border border-border ${isResponse ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                                      {isResponse ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Wrench className="w-3 h-3 text-primary" />}
                                    </div>
                                    <span className="text-[12px] font-semibold text-foreground">
                                      {isResponse ? `${t('ui.respuestaDe')} ${name}` : `${t('ui.ejecutando')} ${name}`}
                                    </span>
                                  </div>
                                  <ChevronDown className="w-3 h-3 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                  <div className="p-2 bg-background border-t border-border w-full min-w-0">
                                    {renderValue(args)}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
