'use client';

import {
  t,
  getModuleLabel,
  getStatusLabel,
  getEventLabel,
  getFieldLabel,
  getJobTypeLabel,
  getToolTypeLabel,
  getNodeTypeLabel,
  getConnectionStatusLabel,
  getLogLevelLabel,
  getCategoryLabel,
  getJobSchemaLabel,
  getUiLabel,
  es,
} from '@/lib/i18n';

export function useAutomationI18n() {
  return {
    t,
    getModuleLabel,
    getStatusLabel,
    getEventLabel,
    getFieldLabel,
    getJobTypeLabel,
    getToolTypeLabel,
    getNodeTypeLabel,
    getConnectionStatusLabel,
    getLogLevelLabel,
    getCategoryLabel,
    getJobSchemaLabel,
    getUiLabel,
    es,
    locale: 'es' as const,
  };
}
