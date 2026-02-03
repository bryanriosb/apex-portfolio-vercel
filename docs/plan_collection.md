# Plan de Implementación - Módulo de Cobros (Collection)

> **Proyecto:** Apex Portfolio - Sistema de Gestión de Cobros Automatizados  
> **Fecha:** 2026-01-28  
> **Versión:** 1.0  
> **Branch:** collections

---

## Resumen Ejecutivo

Este documento describe el plan de implementación completo del módulo de **Cobros (Collection)** para la plataforma Apex Portfolio. El módulo permitirá enviar automáticamente 4,085 correos electrónicos personalizados cada semana (cada lunes) a clientes de cartera, con tracking de apertura, bounce detection y fallback automático a SMS/WhatsApp para clientes que no abren los correos.

### Objetivos Principales

1. **Envío Masivo Semanal**: Procesar y enviar 4,085+ emails personalizados con adjuntos cada lunes
2. **Tracking Avanzado**: Monitoreo en tiempo real de entrega, apertura, bounces y errores
3. **Fallback Inteligente**: Notificación automática por SMS/WhatsApp si no hay apertura en X días
4. **Observabilidad Completa**: Dashboard tipo HubSpot/n8n con event timeline, logs detallados y métricas
5. **Costo Mínimo**: Infraestructura AWS optimizada (estimado $5-15/mes)

### Stack Tecnológico

- **Frontend**: Next.js 14 + shadcn/ui + TanStack Table
- **Backend**: Supabase (PostgreSQL) + Server Actions
- **Infraestructura AWS**: SES (emails), SNS (SMS), SQS (colas), EventBridge (scheduling), Lambda (procesamiento)
- **Tracking**: SES Configuration Sets → SNS → Lambda → Supabase
- **Almacenamiento**: Supabase Storage (archivos CSV/adjuntos)

---

## Arquitectura del Sistema

### Flujo General (End-to-End)

```
1. Usuario sube CSV → Wizard de Creación (Next.js)
2. Backend valida y guarda en Supabase Storage
3. Trigger: Supabase Edge Function / API Route
4. Lambda Starter procesa CSV → genera payloads personalizados
5. SQS: encola cada cliente (retry automático)
6. Lambda Workers: envío batch via SES
7. SES Events (Open/Bounce) → SNS → Lambda → Supabase (updates)
8. EventBridge diario: detecta no-apertura → Lambda Fallback → SNS SMS
9. Frontend: Realtime subscriptions muestran progreso en vivo
```

### Diagrama de Infraestructura AWS

```
EventBridge (cron)          Supabase Storage
     ↓                            ↓
Lambda Starter ←─────── Supabase Database
     ↓
   SQS Queue
     ↓
Lambda Workers (paralelo)
     ↓
   AWS SES ────→ Clientes
     ↓
Configuration Set
     ↓
   SNS Topic
     ↓
Lambda Event Handler
     ↓
Supabase (update status)
```

---

## Esquema de Base de Datos

### Tablas Principales

#### 1. `collection_executions` (Ejecuciones de Cobro)

```sql
CREATE TABLE collection_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', 
    -- 'pending', 'processing', 'completed', 'failed', 'paused'
  
  -- Archivos
  csv_file_path TEXT NOT NULL, -- Path en Supabase Storage
  csv_file_name VARCHAR(255) NOT NULL,
  csv_row_count INTEGER DEFAULT 0,
  
  -- Configuración
  email_template_id UUID REFERENCES collection_templates(id),
  sms_template_id UUID REFERENCES collection_templates(id),
  attachment_ids UUID[] DEFAULT '{}', -- Array de IDs de adjuntos
  
  -- Reglas de fallback
  fallback_enabled BOOLEAN DEFAULT TRUE,
  fallback_days INTEGER DEFAULT 3, -- Días sin apertura para enviar SMS
  
  -- Progreso
  total_clients INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  fallback_sent INTEGER DEFAULT 0,
  
  -- Métricas calculadas
  open_rate DECIMAL(5,2) DEFAULT 0.00, -- Porcentaje
  bounce_rate DECIMAL(5,2) DEFAULT 0.00,
  delivery_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- AWS Referencias
  sqs_queue_url TEXT,
  lambda_execution_arn TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_collection_executions_business ON collection_executions(business_id);
CREATE INDEX idx_collection_executions_status ON collection_executions(status);
CREATE INDEX idx_collection_executions_created ON collection_executions(created_at DESC);
```

#### 2. `collection_clients` (Clientes por Ejecución)

```sql
CREATE TABLE collection_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES collection_executions(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES business_customers(id), -- Puede ser NULL si es CSV directo
  
  -- Datos del cliente (snapshot del CSV)
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  phone VARCHAR(50),
  nit VARCHAR(50),
  
  -- Datos de mora
  amount_due DECIMAL(12,2) NOT NULL,
  invoice_number VARCHAR(100),
  due_date DATE,
  days_overdue INTEGER,
  
  -- Variables personalizadas (JSON para flexibilidad)
  custom_data JSONB DEFAULT '{}',
  
  -- Estado del envío
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- 'pending', 'queued', 'sent', 'delivered', 'opened', 'bounced', 'failed'
  
  -- Email tracking
  email_sent_at TIMESTAMPTZ,
  email_delivered_at TIMESTAMPTZ,
  email_opened_at TIMESTAMPTZ,
  email_bounce_type VARCHAR(50), -- 'hard', 'soft', 'complaint'
  email_bounce_reason TEXT,
  
  -- Fallback tracking
  fallback_required BOOLEAN DEFAULT FALSE,
  fallback_sent_at TIMESTAMPTZ,
  fallback_type VARCHAR(20), -- 'sms', 'whatsapp'
  fallback_status VARCHAR(50),
  
  -- AWS SES
  ses_message_id VARCHAR(255),
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_collection_clients_execution ON collection_clients(execution_id);
CREATE INDEX idx_collection_clients_customer ON collection_clients(customer_id);
CREATE INDEX idx_collection_clients_status ON collection_clients(status);
CREATE INDEX idx_collection_clients_email ON collection_clients(email);
```

#### 3. `collection_events` (Log de Eventos)

```sql
CREATE TABLE collection_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES collection_executions(id) ON DELETE CASCADE,
  client_id UUID REFERENCES collection_clients(id) ON DELETE CASCADE,
  
  -- Tipo de evento
  event_type VARCHAR(100) NOT NULL,
    -- 'execution_started', 'execution_completed', 'execution_failed',
    -- 'batch_started', 'batch_completed', 
    -- 'email_queued', 'email_sent', 'email_delivered', 'email_opened', 'email_bounced',
    -- 'fallback_triggered', 'fallback_sent', 'retry_attempted', 'error'
  
  -- Metadata del evento
  event_status VARCHAR(50) NOT NULL DEFAULT 'success', -- 'success', 'error', 'pending'
  event_data JSONB DEFAULT '{}', -- Datos extra del evento
  error_details TEXT,
  
  -- AWS metadata (si aplica)
  aws_request_id VARCHAR(255),
  lambda_function_name VARCHAR(255),
  
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_collection_events_execution ON collection_events(execution_id);
CREATE INDEX idx_collection_events_client ON collection_events(client_id);
CREATE INDEX idx_collection_events_type ON collection_events(event_type);
CREATE INDEX idx_collection_events_timestamp ON collection_events(timestamp DESC);
```

#### 4. `collection_templates` (Plantillas de Email/SMS)

```sql
CREATE TABLE collection_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
  
  -- Metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_type VARCHAR(20) NOT NULL, -- 'email', 'sms', 'whatsapp'
  
  -- Contenido
  subject VARCHAR(500), -- Solo para emails
  content_html TEXT, -- Para emails
  content_plain TEXT NOT NULL, -- Para todos (fallback o SMS)
  
  -- Variables disponibles (para preview y validación)
  available_variables JSONB DEFAULT '{}',
    -- Ej: {"nombre_cliente": "string", "monto_pendiente": "number", ...}
  
  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_collection_templates_account ON collection_templates(business_account_id);
CREATE INDEX idx_collection_templates_type ON collection_templates(template_type);
```

#### 5. `collection_attachments` (Adjuntos Persistentes)

```sql
CREATE TABLE collection_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
  
  -- Metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_type VARCHAR(100), -- 'application/pdf', 'image/png', etc.
  file_size_bytes BIGINT,
  
  -- Storage
  storage_path TEXT NOT NULL, -- Path en Supabase Storage
  storage_bucket VARCHAR(255) DEFAULT 'collection-attachments',
  
  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_collection_attachments_account ON collection_attachments(business_account_id);
```

#### 6. `collection_config` (Configuración del Módulo)

```sql
CREATE TABLE collection_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id UUID NOT NULL UNIQUE REFERENCES business_accounts(id) ON DELETE CASCADE,
  
  -- Email config
  email_from_address VARCHAR(255) NOT NULL,
  email_from_name VARCHAR(255) NOT NULL,
  email_reply_to VARCHAR(255),
  
  -- SES Config
  ses_configuration_set VARCHAR(255),
  ses_region VARCHAR(50) DEFAULT 'us-east-1',
  
  -- Fallback config
  fallback_enabled BOOLEAN DEFAULT TRUE,
  fallback_default_days INTEGER DEFAULT 3,
  sms_from_number VARCHAR(50),
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  
  -- Alertas internas
  alert_on_high_bounce BOOLEAN DEFAULT TRUE,
  bounce_threshold_percent DECIMAL(5,2) DEFAULT 5.00,
  alert_recipients TEXT[], -- Array de emails
  
  -- Límites
  max_emails_per_execution INTEGER DEFAULT 10000,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX idx_collection_config_account ON collection_config(business_account_id);
```

### Row Level Security (RLS)

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE collection_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_config ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ejemplo para collection_executions)
-- Nota: Ajustar según tu sistema de autenticación actual

-- SELECT: Usuario debe pertenecer al business
CREATE POLICY "Users can view own business executions"
  ON collection_executions FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE id IN (
        SELECT business_id FROM user_businesses WHERE user_id = auth.uid()
      )
    )
  );

-- INSERT: Usuario autenticado puede crear
CREATE POLICY "Authenticated users can create executions"
  ON collection_executions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: Solo el business owner puede actualizar
CREATE POLICY "Users can update own business executions"
  ON collection_executions FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE id IN (
        SELECT business_id FROM user_businesses WHERE user_id = auth.uid()
      )
    )
  );

-- Replicar políticas similares para otras tablas...
```

### Triggers y Functions

```sql
-- Auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_collection_executions_updated_at
  BEFORE UPDATE ON collection_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collection_clients_updated_at
  BEFORE UPDATE ON collection_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collection_templates_updated_at
  BEFORE UPDATE ON collection_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-calcular métricas en collection_executions
CREATE OR REPLACE FUNCTION calculate_execution_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalcular open_rate, bounce_rate, delivery_rate
  UPDATE collection_executions
  SET 
    open_rate = CASE 
      WHEN emails_delivered > 0 THEN (emails_opened::DECIMAL / emails_delivered::DECIMAL) * 100
      ELSE 0
    END,
    bounce_rate = CASE
      WHEN emails_sent > 0 THEN (emails_bounced::DECIMAL / emails_sent::DECIMAL) * 100
      ELSE 0
    END,
    delivery_rate = CASE
      WHEN emails_sent > 0 THEN (emails_delivered::DECIMAL / emails_sent::DECIMAL) * 100
      ELSE 0
    END
  WHERE id = NEW.execution_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_metrics_on_client_change
  AFTER UPDATE OF status ON collection_clients
  FOR EACH ROW EXECUTE FUNCTION calculate_execution_metrics();
```

---

## Estructura del Proyecto (Frontend/Backend)

### Directorios a Crear

```
lib/
├── models/
│   └── collection/
│       ├── execution.ts              # Tipos para ejecuciones
│       ├── client.ts                 # Tipos para clientes
│       ├── template.ts               # Tipos para plantillas
│       ├── attachment.ts             # Tipos para adjuntos
│       ├── event.ts                  # Tipos para eventos
│       └── index.ts
├── actions/
│   └── collection/
│       ├── execution.ts              # Server actions para ejecuciones
│       ├── client.ts                 # Server actions para clientes
│       ├── template.ts               # Server actions para plantillas
│       ├── attachment.ts             # Server actions para adjuntos
│       ├── event.ts                  # Server actions para eventos
│       ├── csv-processor.ts          # Lógica de procesamiento CSV
│       └── index.ts
├── services/
│   └── collection/
│       ├── execution-service.ts      # Servicio de ejecuciones (fetch + mutations)
│       ├── template-service.ts       # Servicio de plantillas
│       ├── attachment-service.ts     # Servicio de adjuntos
│       └── index.ts
└── hooks/
    └── collection/
        ├── use-executions.ts         # Hook para lista de ejecuciones
        ├── use-execution-detail.ts   # Hook para detalle + realtime
        ├── use-templates.ts          # Hook para plantillas
        ├── use-attachments.ts        # Hook para adjuntos
        └── index.ts

components/
└── collection/
    ├── wizard/
    │   ├── CreateWizard.tsx          # Wizard principal (multi-step)
    │   ├── Step1UploadCSV.tsx        # Paso 1: Subir archivo
    │   ├── Step2Configuration.tsx    # Paso 2: Configurar plantilla/adjuntos
    │   ├── Step3Summary.tsx          # Paso 3: Resumen y confirmar
    │   └── CSVValidator.tsx          # Componente de validación CSV
    ├── executions/
    │   ├── ExecutionsList.tsx        # Tabla de ejecuciones
    │   ├── ExecutionDetail.tsx       # Vista detalle de ejecución
    │   ├── ExecutionHeader.tsx       # Header con status y acciones
    │   ├── AutomationFlow.tsx        # Diagrama de flujo visual
    │   ├── EventChart.tsx            # Timeline de eventos
    │   ├── EventLog.tsx              # Tabla de logs detallados
    │   ├── ClientsTable.tsx          # Tabla de clientes por ejecución
    │   └── MetricsPanel.tsx          # Panel de métricas (funnel)
    ├── templates/
    │   ├── TemplatesList.tsx         # Lista de plantillas
    │   ├── TemplateEditor.tsx        # Editor de plantillas
    │   ├── TemplatePreview.tsx       # Preview con variables
    │   └── VariableInserter.tsx      # Autocompletado de variables
    ├── attachments/
    │   ├── AttachmentsList.tsx       # Lista de adjuntos
    │   ├── AttachmentUploader.tsx    # Drag & drop uploader
    │   └── AttachmentCard.tsx        # Card de adjunto individual
    └── shared/
        ├── StatusBadge.tsx           # Badge de estado (reutilizable)
        ├── ProgressIndicator.tsx     # Indicador de progreso
        └── MetricCard.tsx            # Card de métrica

app/
└── admin/
    └── collection/
        ├── page.tsx                  # Landing / Dashboard del módulo
        ├── crear/
        │   └── page.tsx              # Página del wizard de creación
        ├── ejecuciones/
        │   ├── page.tsx              # Lista de ejecuciones
        │   └── [id]/
        │       └── page.tsx          # Detalle de ejecución
        ├── plantillas/
        │   ├── page.tsx              # Lista de plantillas
        │   └── [id]/
        │       └── page.tsx          # Editor de plantilla
        └── adjuntos/
            └── page.tsx              # Gestión de adjuntos
```

---

## Plan de Implementación por Fases

### **Fase 1: Fundamentos y Base de Datos** (Estimado: 2-3 días)

#### Objetivo
Crear el esquema completo de base de datos y las estructuras base del módulo.

#### Tareas

1. **Database Schema**
   - [ ] Crear archivo de migración SQL con todas las tablas
   - [ ] Ejecutar migración en Supabase
   - [ ] Verificar índices y constraints
   - [ ] Configurar RLS policies
   - [ ] Crear triggers y functions

2. **Configuración de Storage**
   - [ ] Crear bucket `collection-csv-uploads` en Supabase Storage
   - [ ] Crear bucket `collection-attachments`
   - [ ] Configurar políticas de acceso

3. **Models (TypeScript)**
   - [ ] `lib/models/collection/execution.ts` - Interfaces y tipos
   - [ ] `lib/models/collection/client.ts`
   - [ ] `lib/models/collection/template.ts`
   - [ ] `lib/models/collection/attachment.ts`
   - [ ] `lib/models/collection/event.ts`
   - [ ] `lib/models/collection/index.ts` - Exports centralizados

4. **Sidebar Navigation**
   - [ ] Actualizar `const/sidebar-menu.ts` con submenú completo:
     ```typescript
     {
       title: 'Cobros',
       url: '/admin/collection',
       icon: DollarSign, // Cambiar de Users a DollarSign
       moduleCode: 'collection',
       allowedRoles: [...],
       items: [
         { title: 'Dashboard', url: '/admin/collection' },
         { title: 'Crear', url: '/admin/collection/crear' },
         { title: 'Ejecuciones', url: '/admin/collection/ejecuciones' },
         { title: 'Plantillas', url: '/admin/collection/plantillas' },
         { title: 'Adjuntos', url: '/admin/collection/adjuntos' },
       ]
     }
     ```

#### Criterios de Aceptación
- ✅ Todas las tablas creadas en Supabase con índices correctos
- ✅ RLS policies activas y funcionando
- ✅ Storage buckets creados y accesibles
- ✅ Models TypeScript tipados correctamente
- ✅ Navegación del sidebar actualizada

---

### **Fase 2: Backend - Actions y Services** (Estimado: 3-4 días)

#### Objetivo
Implementar toda la lógica de servidor (Server Actions) y servicios reutilizables.

#### Tareas

1. **Actions - Executions**
   - [ ] `lib/actions/collection/execution.ts`
     - [ ] `fetchExecutionsAction` - Lista paginada
     - [ ] `getExecutionByIdAction` - Detalle individual
     - [ ] `createExecutionAction` - Nuevo Cobro
     - [ ] `updateExecutionStatusAction` - Actualizar status
     - [ ] `deleteExecutionAction` - Eliminar ejecución

2. **Actions - Clients**
   - [ ] `lib/actions/collection/client.ts`
     - [ ] `fetchClientsByExecutionAction` - Clientes de una ejecución
     - [ ] `updateClientStatusAction` - Actualizar status individual
     - [ ] `bulkInsertClientsAction` - Insertar múltiples clientes

3. **Actions - Templates**
   - [ ] `lib/actions/collection/template.ts`
     - [ ] `fetchTemplatesAction` - Lista de plantillas
     - [ ] `getTemplateByIdAction` - Detalle de plantilla
     - [ ] `createTemplateAction` - Crear plantilla
     - [ ] `updateTemplateAction` - Actualizar plantilla
     - [ ] `deleteTemplateAction` - Eliminar plantilla

4. **Actions - Attachments**
   - [ ] `lib/actions/collection/attachment.ts`
     - [ ] `fetchAttachmentsAction` - Lista de adjuntos
     - [ ] `uploadAttachmentAction` - Subir archivo a Storage
     - [ ] `deleteAttachmentAction` - Eliminar adjunto

5. **Actions - Events**
   - [ ] `lib/actions/collection/event.ts`
     - [ ] `fetchEventsByExecutionAction` - Logs de una ejecución
     - [ ] `createEventAction` - Registrar nuevo evento
     - [ ] `fetchEventsByClientAction` - Logs de un cliente específico

6. **CSV Processor**
   - [ ] `lib/actions/collection/csv-processor.ts`
     - [ ] `validateCSVStructure` - Validar columnas requeridas
     - [ ] `parseCSVFile` - Parsear archivo (usar librería `xlsx`)
     - [ ] `mapCSVToClients` - Transformar filas a modelo de clientes
     - [ ] `detectDuplicates` - Detectar emails duplicados

7. **Services**
   - [ ] `lib/services/collection/execution-service.ts`
     - [ ] `ExecutionService.fetchItems(params)` - Compatible con DataTable
   - [ ] `lib/services/collection/template-service.ts`
   - [ ] `lib/services/collection/attachment-service.ts`

#### Criterios de Aceptación
- ✅ Todas las actions funcionan correctamente con validación
- ✅ CSV processor valida y parsea archivos correctamente
- ✅ Services compatibles con DataTable component
- ✅ Manejo de errores robusto en todas las funciones

---

### **Fase 3: Frontend - Componentes Base** (Estimado: 4-5 días)

#### Objetivo
Crear todos los componentes UI del módulo siguiendo los estándares de shadcn/ui.

#### Tareas

1. **Páginas Base**
   - [ ] `app/admin/collection/page.tsx` - Dashboard del módulo
     - Mostrar última ejecución
     - Métricas agregadas (total enviados, open rate promedio, etc.)
     - Acceso rápido a "Crear" y "Ejecuciones"

2. **Wizard de Creación**
   - [ ] `app/admin/collection/crear/page.tsx`
   - [ ] `components/collection/wizard/CreateWizard.tsx` - Stepper principal
   - [ ] `components/collection/wizard/Step1UploadCSV.tsx`
     - Drag & drop uploader
     - Validación en cliente (tamaño, formato)
     - Preview de primeras 10 filas
     - Detección de columnas requeridas
   - [ ] `components/collection/wizard/Step2Configuration.tsx`
     - Selector de plantilla (email)
     - Selector de plantilla SMS/WhatsApp (opcional)
     - Checkbox de adjuntos (desde lista existente)
     - Configuración de fallback (días)
   - [ ] `components/collection/wizard/Step3Summary.tsx`
     - Resumen de todo (clientes, plantilla, adjuntos)
     - Validación final
     - Botón "Confirmar y Enviar"

3. **Lista de Ejecuciones**
   - [ ] `app/admin/collection/ejecuciones/page.tsx`
   - [ ] `components/collection/executions/ExecutionsList.tsx`
     - Usar `DataTable` con columnas:
       - ID / Fecha
       - Nombre / Comentario
       - # Clientes
       - Status Badge (Pendiente, Procesando, Completado, Error)
       - Paso actual (texto + progress)
       - Open Rate / Bounce Rate
       - Acciones (Ver detalle, Retry si error)
     - Filtros: Status, Fecha
     - Búsqueda por nombre

4. **Detalle de Ejecución**
   - [ ] `app/admin/collection/ejecuciones/[id]/page.tsx`
   - [ ] `components/collection/executions/ExecutionDetail.tsx` - Layout principal
   - [ ] `components/collection/executions/ExecutionHeader.tsx`
     - Título con status badge
     - Botones: Retry, Exportar log, Pausar/Reanudar
   - [ ] `components/collection/executions/AutomationFlow.tsx`
     - Diagrama visual de flujo (usar React Flow o Steps de shadcn)
     - Nodos: Upload → Process → Send → Track → Fallback
     - Cada nodo con status y contador
   - [ ] `components/collection/executions/EventChart.tsx`
     - Timeline horizontal de eventos
     - Usar Recharts (LineChart o ScatterChart)
     - Eventos: Started, Batch Started, Emails Sent, Opens, Bounces, Fallbacks
   - [ ] `components/collection/executions/EventLog.tsx`
     - Tabla con DataTable
     - Columnas: Tipo, Timestamp, Status, Detalles, Error (si aplica)
     - Filas expandibles para ver payload JSON
     - Filtro por tipo de evento
   - [ ] `components/collection/executions/ClientsTable.tsx`
     - Tabla con todos los clientes de la ejecución
     - Columnas: Email, Nombre, Monto, Status, Opened At, Fallback
     - Filtros: Status
   - [ ] `components/collection/executions/MetricsPanel.tsx`
     - Funnel visual: Enviados → Entregados → Abiertos → Fallback
     - Cards con porcentajes

5. **Gestión de Plantillas**
   - [ ] `app/admin/collection/plantillas/page.tsx`
   - [ ] `components/collection/templates/TemplatesList.tsx`
     - DataTable con plantillas
     - Columnas: Nombre, Tipo (Email/SMS), Última actualización, Acciones
   - [ ] `app/admin/collection/plantillas/[id]/page.tsx` - Editor
   - [ ] `components/collection/templates/TemplateEditor.tsx`
     - Form con react-hook-form + zod
     - Campos: Nombre, Tipo, Asunto (si email), Contenido HTML, Contenido Plain
     - Editor rico (básico) para HTML
     - Lista de variables disponibles (chip/badge)
   - [ ] `components/collection/templates/VariableInserter.tsx`
     - Dropdown con variables disponibles
     - Al clickear, insertar `{{variable}}` en cursor
   - [ ] `components/collection/templates/TemplatePreview.tsx`
     - Renderizar template con datos dummy
     - Reemplazar variables con valores de ejemplo

6. **Gestión de Adjuntos**
   - [ ] `app/admin/collection/adjuntos/page.tsx`
   - [ ] `components/collection/attachments/AttachmentsList.tsx`
     - DataTable con adjuntos
     - Columnas: Nombre, Tipo, Tamaño, Fecha, Acciones
   - [ ] `components/collection/attachments/AttachmentUploader.tsx`
     - Drag & drop
     - Subida a Supabase Storage
     - Progress bar
   - [ ] `components/collection/attachments/AttachmentCard.tsx`
     - Card con preview (si imagen) o icono
     - Botones: Download, Delete

7. **Componentes Compartidos**
   - [ ] `components/collection/shared/StatusBadge.tsx`
     - Badge con colores según status
   - [ ] `components/collection/shared/ProgressIndicator.tsx`
     - Barra o círculo de progreso
   - [ ] `components/collection/shared/MetricCard.tsx`
     - Card con métrica (número + label + porcentaje)

#### Criterios de Aceptación
- ✅ Todas las páginas son full responsive (mobile-first)
- ✅ Wizard funciona correctamente end-to-end
- ✅ Detalle de ejecución muestra datos en tiempo real
- ✅ Plantillas permiten edición y preview
- ✅ Adjuntos se suben correctamente a Storage
- ✅ Diseño coherente con el resto de la app (shadcn/ui)

---

### **Fase 4: Infraestructura AWS y Backend Asíncrono** (Estimado: 5-6 días)

#### Objetivo
Configurar toda la infraestructura AWS para envío de emails, tracking y fallback.

#### Tareas

1. **AWS SES - Configuración Inicial**
   - [ ] Verificar dominio en SES (DNS records)
   - [ ] Crear Configuration Set para tracking
   - [ ] Configurar SNS Topic para eventos (Open, Bounce, Delivery, etc.)
   - [ ] Solicitar aumento de quota de envío (si necesario)
   - [ ] Crear email templates (opcional, o usar HTML directo)

2. **AWS SNS - SMS y Notificaciones**
   - [ ] Configurar SNS para SMS (región adecuada para Colombia)
   - [ ] Crear Topic para eventos de SES
   - [ ] Suscribir Lambda a Topic

3. **AWS SQS - Cola de Procesamiento**
   - [ ] Crear cola SQS standard (o FIFO si orden importa)
   - [ ] Configurar DLQ (Dead Letter Queue) para errores
   - [ ] Configurar visibility timeout y retries

4. **AWS Lambda - Funciones**
   - [ ] **Lambda Starter** (Runtime: Go o Rust)
     - Lee CSV desde Supabase Storage
     - Genera payloads personalizados (reemplaza variables)
     - Encola cada cliente en SQS
     - Actualiza `collection_executions` (status = 'processing')
     - Registra evento `batch_started`
   
   - [ ] **Lambda Email Worker** (Runtime: Go o Rust)
     - Triggered por SQS
     - Lee mensaje (datos del cliente)
     - Renderiza template con variables
     - Descarga adjuntos desde Supabase Storage (si aplica)
     - Envía email via SES (SendRawEmail con adjuntos)
     - Actualiza `collection_clients` (status = 'sent', ses_message_id)
     - Registra evento `email_sent`
   
   - [ ] **Lambda Event Handler** (Runtime: Go o Rust)
     - Triggered por SNS (eventos de SES)
     - Parsea evento (tipo: Open, Bounce, Delivery, Complaint)
     - Actualiza `collection_clients` según evento
     - Registra en `collection_events`
     - Si bounce permanente, marca `fallback_required = true`
   
   - [ ] **Lambda Fallback Checker** (Runtime: Go o Rust)
     - Triggered diariamente via EventBridge
     - Query a `collection_clients` donde:
       - `status = 'delivered'` AND `email_opened_at IS NULL`
       - `created_at < NOW() - X días` (según config)
     - Para cada cliente, enviar SMS via SNS
     - Actualizar `fallback_sent_at`, `fallback_status`
     - Registrar evento `fallback_sent`

5. **AWS EventBridge**
   - [ ] Crear regla cron para envío semanal (opcional, o manual)
   - [ ] Crear regla diaria para Lambda Fallback Checker
     - Cron: `cron(0 9 * * ? *)` (9 AM diario)

6. **Integración Backend - Trigger Inicial**
   - [ ] Crear Supabase Edge Function o API Route: `/api/collection/trigger`
     - Recibe `execution_id`
     - Valida que status sea 'pending'
     - Invoca Lambda Starter con payload
     - Retorna estado
   
   - [ ] Actualizar `createExecutionAction` para llamar a trigger
     - Después de insertar en DB, llamar API

7. **Configuración de Permisos (IAM)**
   - [ ] Crear roles IAM para cada Lambda
   - [ ] Permisos: SES (SendEmail), SQS (SendMessage, ReceiveMessage), SNS (Publish), S3 (GetObject si adjuntos en S3)

#### Criterios de Aceptación
- ✅ SES envía emails correctamente con adjuntos
- ✅ Configuration Set trackea opens y bounces
- ✅ SNS recibe eventos y Lambda los procesa
- ✅ SQS procesa colas sin pérdida de mensajes
- ✅ DLQ captura errores permanentes
- ✅ Fallback checker envía SMS correctamente
- ✅ Supabase se actualiza en tiempo real con eventos

---

### **Fase 5: Realtime, Observabilidad y Testing** (Estimado: 3-4 días)

#### Objetivo
Implementar subscripciones en tiempo real, pulir observabilidad y realizar testing completo.

#### Tareas

1. **Supabase Realtime Subscriptions**
   - [ ] En `ExecutionDetail`: subscribe a `collection_executions` (cambios en status/métricas)
   - [ ] En `ExecutionDetail`: subscribe a `collection_events` (nuevos eventos)
   - [ ] En `ExecutionsList`: subscribe a `collection_executions` (updates en tabla)
   - [ ] Implementar hooks:
     - [ ] `use-execution-detail.ts` con `useEffect` + `supabase.channel().on()`
     - [ ] Actualizar estado local cuando lleguen cambios

2. **Observabilidad - Mejoras Finales**
   - [ ] Agregar botón "Retry Failed Events" en detalle
     - Filtrar eventos con status = 'error'
     - Re-encolar en SQS
   - [ ] Agregar exportación de logs a CSV/PDF
   - [ ] Agregar métricas en dashboard principal:
     - Total emails enviados (all time)
     - Open rate promedio
     - Bounce rate promedio
     - Última ejecución (timestamp)

3. **Alertas Internas**
   - [ ] Crear Lambda para monitorear bounce rate alto
     - Si bounce_rate > threshold (ej. 5%), enviar email a admins
   - [ ] Agregar página en Configuraciones → Cobros → Alertas
     - Configurar destinatarios de alertas
     - Configurar thresholds

4. **Validaciones y Seguridad**
   - [ ] Validar tamaño de archivo CSV (max 5MB)
   - [ ] Validar formato de emails en CSV
   - [ ] Sanitizar datos antes de enviar a SES
   - [ ] Rate limiting en trigger endpoint (evitar spam)

5. **Testing**
   - [ ] **Test Unitario** (Backend)
     - [ ] CSV processor con archivos válidos/inválidos
     - [ ] Actions con mocks de Supabase
   
   - [ ] **Test de Integración**
     - [ ] Flujo completo: crear ejecución → trigger → envío → tracking
     - [ ] Usar volumen pequeño (10 emails de prueba)
   
   - [ ] **Test de UI**
     - [ ] Wizard de creación (validación, preview)
     - [ ] Tabla de ejecuciones (filtros, paginación)
     - [ ] Detalle en tiempo real (subscriptions)
   
   - [ ] **Test de Carga** (Opcional)
     - [ ] Simular 4085 emails
     - [ ] Medir tiempos de procesamiento
     - [ ] Verificar que no hay cuellos de botella

6. **Documentación**
   - [ ] Crear README en `docs/collection-module.md`
     - Descripción del módulo
     - Arquitectura
     - Variables de entorno necesarias
     - Setup de AWS
     - Troubleshooting común
   
   - [ ] Comentar código crítico (especialmente Lambdas)

#### Criterios de Aceptación
- ✅ Realtime funciona sin lag (< 1 segundo de delay)
- ✅ Dashboard muestra métricas actualizadas
- ✅ Alertas se envían correctamente
- ✅ Todos los tests pasan
- ✅ Documentación completa y clara

---

## Configuraciones del Sistema

### Página de Configuración (Settings)

Agregar en `app/admin/settings/collection/page.tsx`:

#### Secciones

1. **Perfil de Envío**
   - Email From Address
   - Email From Name
   - Email Reply To

2. **Proveedores**
   - SES Configuration Set
   - SES Region
   - SNS SMS From Number

3. **Reglas de Fallback**
   - Habilitar fallback (toggle)
   - Días por defecto sin apertura
   - Habilitar WhatsApp (toggle)

4. **Notificaciones Internas**
   - Alerta en bounce alto (toggle)
   - Threshold de bounce (%)
   - Emails destinatarios (array)

5. **Límites**
   - Max emails por ejecución

---

## Variables de Entorno Necesarias

Agregar en `.env`:

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# AWS SES
AWS_SES_CONFIGURATION_SET=collection-tracking
AWS_SES_FROM_EMAIL=cobros@tudominio.com
AWS_SES_FROM_NAME="Equipo de Cobros"

# AWS SQS
AWS_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456/collection-queue

# AWS SNS
AWS_SNS_SMS_TOPIC_ARN=arn:aws:sns:us-east-1:123456:collection-sms
AWS_SNS_EVENTS_TOPIC_ARN=arn:aws:sns:us-east-1:123456:collection-events

# AWS Lambda
AWS_LAMBDA_STARTER_ARN=arn:aws:lambda:us-east-1:123456:function:collection-starter
AWS_LAMBDA_WORKER_ARN=arn:aws:lambda:us-east-1:123456:function:collection-worker

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Storage
COLLECTION_CSV_BUCKET=collection-csv-uploads
COLLECTION_ATTACHMENTS_BUCKET=collection-attachments
```

---

## Estimación de Costos AWS (Mensual)

### Volumen: 4,085 emails/semana ≈ 16,340 emails/mes

| Servicio | Costo Estimado |
|----------|----------------|
| **SES** | $1.70 (16,340 emails × $0.0001) |
| **Lambdas** | $1.00 (invocaciones + compute) |
| **SQS** | $0.50 (requests) |
| **SNS** | $0.50 (events + SMS si pocos) |
| **EventBridge** | $0.10 (rules) |
| **S3/Storage** | $1.00 (archivos CSV + adjuntos) |
| **SMS Fallback** | $50-200 (solo si muchos no abren) |
| **TOTAL** | **$5-15/mes** (sin SMS masivo) |

---

## Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| **Bounce rate alto** | Reputación SES dañada | Validar emails antes de enviar, monitorear métricas, limpiar lista |
| **Lambda timeout** | Emails no enviados | Aumentar timeout, optimizar código, procesar en batches más pequeños |
| **DLQ llena** | Pérdida de datos | Alert en CloudWatch, dashboard para reintentos |
| **Quota SES excedida** | Envíos bloqueados | Solicitar aumento con anticipación, monitorear uso |
| **CSV malformado** | Ejecución fallida | Validación estricta en wizard, mensajes de error claros |
| **Supabase Storage lleno** | No se pueden subir archivos | Limpiar archivos viejos periódicamente, configurar lifecycle |

---

## Mejoras Futuras (Post-MVP)

1. **A/B Testing de Templates**: Permitir 2 plantillas y comparar open rate
2. **Scheduling Avanzado**: Programar envíos futuros (no solo manual)
3. **WhatsApp Integration**: Usar Meta Business API para fallback
4. **Analytics Avanzado**: Dashboards interactivos (Tremor, Recharts)
5. **Webhooks**: Notificar a sistemas externos cuando se completa ejecución
6. **Multi-tenant**: Soporte para múltiples business accounts con configuraciones separadas
7. **Plantillas Compartidas**: Marketplace de plantillas entre usuarios
8. **Segmentación Avanzada**: Filtros más complejos en CSV (por monto, días de mora, etc.)

---

## Conclusión

Este plan de implementación cubre completamente el módulo de Cobros desde cero hasta producción. La arquitectura está diseñada para ser:

- ✅ **Escalable**: SQS + Lambda permiten procesar miles de emails en paralelo
- ✅ **Confiable**: DLQ, retries automáticos, RLS en Supabase
- ✅ **Observable**: Event log completo, métricas en tiempo real, alertas
- ✅ **Económica**: Stack AWS optimizado para volumen bajo/medio ($5-15/mes)
- ✅ **Mantenible**: Código estructurado, separación de concerns, tipado estricto

Cada fase es independiente y puede ser validada antes de pasar a la siguiente. Se recomienda seguir el orden propuesto para minimizar blockers y maximizar velocidad de desarrollo.

**Próximos pasos:**
1. Revisar y aprobar este plan
2. Iniciar Fase 1 (Database Schema)
3. Setup de repositorio AWS (IAM, cuentas, etc.)
4. Kick-off de desarrollo

---

*Última actualización: 2026-01-28*
