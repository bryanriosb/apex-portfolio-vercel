# Portfolio System - Flujo de Notificaciones por Email

## Overview

Sistema de gestión de Cartera escalable con arquitectura serverless en AWS, diseñado para procesar miles de notificaciones por semana con tracking completo y fallback multi-canal.

## Arquitectura Principal

### Stack Tecnológico

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL) + Server Actions
- **Infraestructura AWS**: SES (email delivery) + EventBridge (scheduler) + Lambda (procesamiento Rust)
- **Template Engine**: TipTap editor + Handlebars rendering
- **Processing**: AWS Lambda (Rust para producción)

### Arquitectura del Flujo REAL

```
Usuario → CSV Upload → Supabase Storage → Lambda Invoke → collection-email-worker → SES → Clientes
                                    ↓
                              Event Tracking → SNS → collection-event-handler → Supabase
```

## Flujo Completo de Notificaciones (IMPLEMENTADO)

### Fase 1: Creación de Ejecución

**Archivo clave**: `/lib/actions/collection/execution-workflow.ts`

1. **Upload de CSV**: Usuario sube archivo con datos de clientes
2. **Validación**: Sistema verifica formato y estructura del archivo
3. **Configuración**: Selección de plantilla, adjuntos y programación
4. **Registro en BD**: Creación de registro en `collection_executions` con status 'pending'
5. **Registro de Clientes**: Inserción masiva en `collection_clients` con status 'pending'

### Fase 2: Invocación Lambda

#### Modo INMEDIATO

- **Archivo**: `/lib/actions/collection/execution.ts` → `processExecutionAction()`
- **Ruta**: `CollectionService.startImmediateExecution()` → **AWS Lambda Invoke**
- **Lambda**: `collection-email-worker` (ARN: `arn:aws:lambda:us-east-1:399699578521:function:collection-email-worker`)
- **Payload**: `{ execution_id, action: 'start_execution' }`

#### Modo PROGRAMADO

- **Ruta**: `CollectionService.scheduleExecution()` → **EventBridge Rule**
- **Lambda**: `collection-email-worker` (invocado por EventBridge)

### Fase 3: Procesamiento y Envío

#### Lambda collection-email-worker (Rust)

**Ubicación**: `/functions/aws/collection-email-worker/src/`

**Flujo completo**:

1. Conexión a Supabase
2. Obtener execution por ID
3. Descargar adjuntos desde Supabase Storage (si aplica)
4. Procesar todos los clientes con status 'pending'
5. Renderizar template con Handlebars
6. Enviar email via AWS SES
7. Actualizar client status a 'sent' o 'failed'
8. Registrar eventos en `collection_events`

**Características**:

- Procesamiento robusto con Handlebars
- Formateo de moneda (COP)
- Inline CSS para compatibilidad
- Soporte completo para adjuntos
- Manejo de errores y retries

### Fase 4: Template Rendering

**Variables disponibles:**

- `nombre_cliente`: Nombre completo del cliente
- `empresa`: Nombre de la empresa
- `email`: Email del cliente
- `monto_pendiente`: Monto pendiente de pago
- `dias_mora`: Días de mora
- `numero_factura`: Número de factura
- `fecha_vencimiento`: Fecha de vencimiento

**Características avanzadas:**

- Soporte para loops: `{{#each invoices}}`
- Personalización por cliente con JSON en `custom_data`
- HTML optimizado para email clients

## Tracking y Eventos

### Lambda collection-event-handler (Rust)

**Ubicación**: `/functions/aws/collection-event-handler/src/`

**Flujo completo**:

1. Recibe eventos SNS de SES
2. Parsea tipo de evento (delivery, bounce, open, complaint)
3. Busca client por `ses_message_id`
4. Crea evento en `collection_events`
5. Actualiza client status correspondiente

**Tipos de eventos manejados**:

- `delivery`: Email entregado exitosamente
- `bounce`: Email rebotado (hard/soft)
- `open`: Email abierto por el cliente
- `complaint`: Cliente marcó como spam

### Métricas en Tiempo Real

- **Delivery Rate**: Porcentaje de emails entregados
- **Open Rate**: Porcentaje de emails abiertos
- **Bounce Rate**: Porcentaje de rebotes
- **Status Tracking**: Actualización automática via eventos SES

## Configuraciones del Sistema

### Plantillas de Email

```typescript
interface CollectionTemplate {
  id: string
  name: string
  subject?: string
  content_html?: string
  content_plain: string
  template_type: 'email' | 'sms' | 'whatsapp'
  available_variables: Record<string, string>
  is_active: boolean
}
```

### Configuración AWS ACTIVA

- **SES**: Email delivery con configuration set `borls-collection-config`
- **EventBridge**: Scheduler para ejecuciones programadas
- **SNS**: Event handling para tracking
- **LambdaARN**: `arn:aws:lambda:us-east-1:399699578521:function:collection-email-worker`

## Sistema de Fallback (Planeado)

⚠️ **NO IMPLEMENTADO COMPLETAMENTE** - Estructura DB existe pero lógica pendiente

1. **Email Primary**: Primer intento por email ✅
2. **Bounce Detection**: Clasificación automática en collection-event-handler ✅
3. **Fallback Rules**: Configuración de días en collection_executions ✅
4. **SMS/WhatsApp**: Canales alternativos en DB ❌ (pendiente implementación)
5. **Multi-canal**: Soporte para diferentes tipos de plantillas ✅

## Características Implementadas

### Gestión de Adjuntos ✅

- Múltiples archivos por campaña
- Integración con Supabase Storage  
- Descarga dinámica en Lambda para envío
- Soporte para PDF, imágenes, documentos

### Scheduling ✅

- Envío inmediato via Lambda Invoke
- Campañas programadas via EventBridge
- Ejecuciones recurrentes configurables

### UI/UX ✅

- Template Builder con editor visual TipTap
- Vista previa en tiempo real con datos dummy
- Insertor automático de variables disponibles
- Dashboard de progreso con métricas en vivo

## Infraestructura AWS ACTUAL

### Lambda Functions Deployadas

- **collection-email-worker**: Procesamiento y envío (Rust)
- **collection-event-handler**: Tracking de eventos (Rust)

### Servicios Configurados

- **SES**: Configurado con configuration set `borls-collection-config`
- **EventBridge**: Rules para ejecuciones programadas
- **SNS**: Event handling para tracking de emails
- **Región AWS**: us-east-1

### Procesamiento Real

- **Direct Processing**: Lambda invocada directamente (no usa SQS)
- **Error Handling**: Manejo de errores y logging en cada Lambda
- **Rate Limiting**: Integrado en Lambda para modo desarrollo
- **Actualización en tiempo real**: Eventos SES actualizan DB automáticamente

## Issues Conocidos

### 🔴 CRÍTICO: Modo Local Roto

- **Problema**: `@/functions/collection-starter` no existe
- **Impacto**: El modo local (`USE_AWS_LAMBDA !== 'true'`) no funciona
- **Ubicación**: `/lib/actions/collection/execution.ts:99` import inexistente
- **Solución**: Implementar `collection-starter` o remover código local

### 🟡 MEJORA: Sistema de Fallback Incompleto

- **Estado**: Estructura DB existe pero lógica de SMS/WhatsApp pendiente
- **Faltante**: Lambda para procesar fallback automático
- **Impacto**: No hay seguimiento post-email si no hay apertura

## Seguridad y Validaciones

### Data Validation ✅

- Email validation en CSV
- CSV parsing robusto con validación de columnas
- Type safety con TypeScript en frontend

### Security Measures ✅

- Environment variables seguras en AWS Lambda
- IAM roles granulares para servicios AWS
- Rate limiting integrado en Lambda (modo desarrollo)
- RLS policies en Supabase

## Resumen Ejecutivo

**Sistema ACTUALMENTE FUNCIONAL** en producción que combina:

- **Envío Inmediato**: Invocación directa de Lambda para procesamiento
- **Multi-Provider Support**: Factory pattern para AWS SES, Brevo, y futuros proveedores
- **Tracking Completo**: Webhooks unificados actualizan DB en tiempo real
- **Templates Flexibles**: Editor visual con variables dinámicas
- **Adjuntos Soportados**: Múltiples archivos por campaña
- **Infraestructura Serverless**: Lambda + EventBridge + SES/Brevo
- **Costos Optimizados**: Estimado de $5-15 USD mensuales
- **Observabilidad Real**: Dashboard con métricas en vivo

**Estado Actual**:

- ✅ **Envío de emails**: Funcional en producción (SES + Brevo)
- ✅ **Tracking de eventos**: Operativo con webhooks unificados
- ✅ **Provider abstraction**: Factory pattern implementado
- ✅ **Webhooks multi-provider**: Endpoints flexibles para SES y Brevo
- ✅ **UI completa**: Implementada
- ❌ **Modo local**: Roto por import faltante
- ❌ **Fallback SMS/WhatsApp**: Pendiente de implementación

**Documentación Técnica**:

- 📚 [Email Provider Architecture](./email_provider_architecture.md) - Arquitectura técnica completa
- 📋 [Webhook Setup Guide](./webhook_setup_guide.md) - Guía de configuración de webhooks

**Próximos Pasos Recomendados**:

1. 🔥 Fix critico: Implementar `collection-starter` o remover modo local
2. 📈 Completar sistema de fallback multi-canal
3. 🔧 Optimizar rendimiento para alto volumen
4. 📊 Mejorar dashboards de analytics
5. 🔐 Implementar validación de firmas en webhooks Brevo
