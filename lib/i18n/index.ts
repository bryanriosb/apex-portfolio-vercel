import * as automation from './es-automation';
import { fieldLabels, jobSchemas } from './es-domain';
import { ui } from './es-ui';

export const es = {
  modules: automation.modules,
  statuses: automation.statuses,
  events: automation.events,
  jobTypes: automation.jobTypes,
  toolTypes: automation.toolTypes,
  nodeTypes: automation.nodeTypes,
  connectionStatus: automation.connectionStatus,
  logLevels: automation.logLevels,
  categories: automation.categories,
  fields: fieldLabels,
  jobSchemas,
  ui,
} as const;

export type I18nNamespace = keyof typeof es;

export function t(key: string, params?: Record<string, string>): string {
  const parts = key.split('.');
  let value: any = es;
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return key;
    }
  }
  if (typeof value !== 'string') return key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
}

export function getModuleLabel(module: string): string {
  return automation.modules[module] ?? module;
}

export function getStatusLabel(status: string): string {
  return automation.statuses[status] ?? status;
}

export function getEventLabel(type: string): string {
  return automation.events[type] ?? type;
}

export function getFieldLabel(key: string): string {
  return fieldLabels[key] ?? key;
}

export function getJobTypeLabel(jobType: string): string {
  return automation.jobTypes[jobType] ?? jobType;
}

export function getToolTypeLabel(toolType: string): string {
  const label = automation.toolTypes[toolType] ?? automation.toolTypes[toolType.charAt(0).toUpperCase() + toolType.slice(1)] ?? toolType;
  return label.toLowerCase().includes('mcp') ? label.toUpperCase() : label;
}

export function getNodeTypeLabel(nodeType: string): string {
  return automation.nodeTypes[nodeType] ?? nodeType;
}

export function getConnectionStatusLabel(status: string): string {
  return automation.connectionStatus[status] ?? status;
}

export function getLogLevelLabel(level: string): string {
  return automation.logLevels[level] ?? level;
}

export function getCategoryLabel(category: string): string {
  return automation.categories[category] ?? category;
}

export function getJobSchemaLabel(jobTypeKey: string, field: string): string | undefined {
  return jobSchemas[jobTypeKey]?.[field];
}

export function getUiLabel(key: string): string {
  return ui[key] ?? key;
}

export function getUiActionLabel(action: string): string {
  return ui[`uiEventAction_${action}`] ?? action;
}

export function getToolNameLabel(toolName: string): string {
  return ui[`toolName_${toolName}`] ?? toolName;
}
