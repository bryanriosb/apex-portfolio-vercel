export const modules: Record<string, string> = {
  collection: 'Cartera',
};

export const statuses: Record<string, string> = {
  Pending: 'Pendiente',
  Running: 'Procesando',
  Interrupted: 'Aprobación',
  Completed: 'Completada',
  Failed: 'Fallida',
  Recurring: 'Recurrente',
};

export const events: Record<string, string> = {
  JobStateChanged: 'Cambio de Estado',
  ToolCallStarted: 'Herramienta Iniciada',
  ToolCallCompleted: 'Herramienta Completada',
  AgentThinking: 'Agente Razonando',
  AgentResolved: 'Agente Resolvió',
  WorkflowNodeStarted: 'Nodo Iniciado',
  WorkflowNodeCompleted: 'Nodo Completado',
  SkillsResolved: 'Skills Aplicadas',
  ToolConnectionChanged: 'Conexión Cambió',
  CronTriggered: 'Cron Disparado',
  WorkflowLog: 'Log de Workflow',
};

export const jobTypes: Record<string, string> = {
  AgentJob: 'Trabajo de Agente',
  AgentWorkflowJob: 'Flujo de Agentes',
  ApexJob: 'Trabajo APEX',
};

export const apexJobTypes: Record<string, string> = {
  Rpa: 'Automatización RPA',
  HeavyTask: 'Tarea Pesada',
  PaymentValidation: 'Validación de Pago',
  CollectionSync: 'Sincronización de Cartera',
};

export const jobKinds: Record<string, string> = {
  Single: 'Única',
  Recurring: 'Recurrente',
  Instance: 'Instancia',
};

export const toolTypes: Record<string, string> = {
  Function: 'Función',
  McpLocal: 'MCP Local',
  McpRemote: 'MCP Remoto',
  Integration: 'Integración',
  IntegrationService: 'Servicio de Integración',
  Notification: 'Notificación',
  Ontology: 'Ontología',
  Artifact: 'Artefacto',
};

export const nodeTypes: Record<string, string> = {
  Agent: 'Agente',
  HITL: 'Aprobación Humana',
  Transform: 'Transformación',
  Assembler: 'Ensamblador',
  Function: 'Función',
};

export const connectionStatus: Record<string, string> = {
  Connected: 'Conectado',
  Disconnected: 'Desconectado',
  TokenRefreshed: 'Token Refrescado',
  AuthFailed: 'Error de Autenticación',
};

export const logLevels: Record<string, string> = {
  INFO: 'Información',
  WARN: 'Advertencia',
  ERROR: 'Error',
};

export const categories: Record<string, string> = {
  tool: 'Herramienta',
  agent: 'Agente',
  workflow: 'Workflow',
  connection: 'Conexión',
  scheduling: 'Programación',
  'payment-validation': 'Validación de Pago',
  'agent-communication': 'Comunicación Agente',
  'email-reply': 'Respuesta Email',
};
