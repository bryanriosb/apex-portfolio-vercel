# Sistema de Límites de Emails

## Descripción General

El sistema de límites de emails permite controlar cuántos emails puede enviar cada cuenta de negocio, evitando el abuso de los recursos de envío (Brevo, SES, etc.) y permitiendo gestionar diferentes niveles de servicio según el plan contratado.

## Arquitectura del Sistema

### 1. Jerarquía de Configuración

El sistema utiliza una jerarquía de prioridad para determinar el límite de emails:

```
1. Override por cuenta (settings.max_emails_override)
   ↓
2. Límite del plan (plan.features.max_emails)
   ↓
3. Sin límite (null = ilimitado)
```

### 2. Tipos de Límites

#### Trial
- **Tipo:** Límite acumulado durante todo el período de prueba
- **Duración:** Desde el inicio del trial hasta `trial_ends_at`
- **Valor por defecto:** 10 emails totales
- **Cálculo:** `trial_ends_at - trial_days` hasta la fecha actual

#### Planes de Pago (Mensual/Anual)
- **Tipo:** Límite mensual según ciclo de facturación
- **Duración:** Desde `subscription_started_at`, reinicia cada mes/año
- **Cálculo del período:** Se calcula dinámicamente según el `billing_cycle`

#### Plan Free
- **Tipo:** Bloqueo completo
- **Valor:** 0 emails
- **Comportamiento:** No permite enviar ningún email

#### Planes Ilimitados
- **Tipo:** Sin restricción
- **Valor:** `null`
- **Comportamiento:** Permite envíos ilimitados

## Configuración por Plan

### Configuración en Base de Datos

El límite de emails se configura en la columna `features` de la tabla `plans`:

```sql
-- Plan Trial: 10 emails totales
UPDATE plans 
SET features = features || '{"max_emails": 10}'::jsonb
WHERE code = 'trial';

-- Plan Free: 0 emails (bloqueado)
UPDATE plans 
SET features = features || '{"max_emails": 0}'::jsonb
WHERE code = 'free';

-- Plan Pro: Ilimitado (null)
UPDATE plans 
SET features = features || '{"max_emails": null}'::jsonb
WHERE code = 'pro';

-- Plan Básico: 1000 emails por período
UPDATE plans 
SET features = features || '{"max_emails": 1000}'::jsonb
WHERE code = 'basic';
```

### Modelo de Datos

```typescript
// lib/models/plan/plan.ts
export interface PlanFeatures {
  max_appointments_per_month: number | null
  max_products: number | null
  max_services: number | null
  max_customers: number | null
  max_storage_mb: number | null
  max_emails: number | null  // ← Nuevo campo
  has_custom_branding: boolean
  has_priority_support: boolean
  has_api_access: boolean
}
```

## Override por Cuenta

### Cuándo Usar

El override permite asignar un límite personalizado a una cuenta específica, ignorando el límite de su plan. Es útil para:

- Dar créditos extra a clientes trial
- Restringir temporalmente a usuarios problemáticos
- Ofrecer límites promocionales
- Gestionar casos especiales

### Configuración vía API

```typescript
// Establecer límite personalizado
await updateAccountEmailLimitAction('account-id', 500);

// Bloquear envíos
await updateAccountEmailLimitAction('account-id', 0);

// Volver al límite del plan
await updateAccountEmailLimitAction('account-id', null);
```

### Almacenamiento

El override se guarda en `business_accounts.settings`:

```json
{
  "settings": {
    "max_emails_override": 500,
    "professional_count": "50",
    "otros_campos": "..."
  }
}
```

## Flujo de Validación

### 1. Punto de Entrada

La validación ocurre en `execution-workflow.ts` antes de crear una ejecución:

```typescript
// lib/actions/collection/execution-workflow.ts
const emailLimitService = new EmailLimitService();
const limitCheck = await emailLimitService.validateLimit(businessAccount, clients.length);

if (!limitCheck.canSend) {
  return {
    success: false,
    error: limitCheck.errorMessage || 'Email limit exceeded',
  };
}
```

### 2. Cálculo del Período

**Trial:**
```typescript
const trialDays = account.custom_trial_days || 14;
const trialEndsAt = new Date(account.trial_ends_at);
const start = new Date(trialEndsAt);
start.setDate(start.getDate() - trialDays);
// Período: [start, now]
```

**Plan de Pago:**
```typescript
const subscriptionStart = new Date(account.subscription_started_at);
const billingCycle = account.billing_cycle || 'monthly';
// Calcula el inicio del período actual según el ciclo
const start = calculatePeriodStart(subscriptionStart, billingCycle, currentDate);
// Período: [start, now]
```

### 3. Conteo de Emails Enviados

Se cuentan los emails sumando `total_clients` de `collection_executions`:

```sql
SELECT SUM(total_clients) as emails_sent
FROM collection_executions
WHERE business_id IN (SELECT id FROM businesses WHERE business_account_id = ?)
  AND created_at BETWEEN ? AND ?
```

### 4. Validación del Límite

```typescript
const emailsRemaining = Math.max(0, maxEmails - emailsSent);
const hasReachedLimit = emailsRemaining === 0;

// Si excede el límite → Bloquea
// Si alcanzó el límite → Bloquea
// Si hay suficiente → Permite
```

## Interfaz de Usuario

### 1. Indicador en el Wizard (Paso 1)

Ubicación: `components/collection/wizard/CompactEmailLimitIndicator.tsx`

**Características:**
- Muestra barra de progreso compacta
- Texto: "Emails: usados/total (restantes restantes)"
- Aparece automáticamente al entrar al wizard
- Se actualiza en tiempo real

**Ejemplo visual:**
```
[📧] Emails: [████████░░░░░░░░░░░░] 250/1000 (750 restantes)    [Descargar Plantilla]
```

### 2. Modal de Gestión (Admin)

Ubicación: `/admin/business-accounts` → Menú "Límite de Emails"

**Permite:**
- Ver límite actual y uso
- Activar/desactivar límite personalizado
- Seleccionar presets (10, 50, 100, 500, 1000)
- Ingresar valor personalizado
- Bloquear completamente (0)

### 3. Visualización en Detalle de Cuenta

Ubicación: Modal de detalle de cuenta

Muestra:
- Si tiene límite personalizado (badge)
- Límite configurado
- Estado del plan

## Mensajes de Error

### Cuando se alcanza el límite:
```
"Has alcanzado el límite de 1000 emails de tu plan. 
Actualiza tu plan para continuar."
```

### Cuando se excede el límite disponible:
```
"Solo puedes enviar 150 emails más de 1000 permitidos. 
Intentas enviar 200. Reduce la cantidad o actualiza tu plan."
```

### Cuando está bloqueado (0):
```
"Tu plan actual no incluye envío de emails. 
Actualiza tu plan para continuar."
```

## Casos de Uso Comunes

### Caso 1: Cliente Trial necesita más emails
```typescript
// Dar 100 emails extra
await updateAccountEmailLimitAction('trial-account-id', 100);
```

### Caso 2: Usuario abusivo en plan free
```typescript
// Bloquear completamente
await updateAccountEmailLimitAction('abusive-account-id', 0);
```

### Caso 3: Promoción especial
```typescript
// Plan básico con límite aumentado temporalmente
await updateAccountEmailLimitAction('promo-account-id', 5000);
```

### Caso 4: Volver al plan original
```typescript
// Eliminar override
await updateAccountEmailLimitAction('account-id', null);
```

## API Reference

### Actions

#### `updateAccountEmailLimitAction(accountId: string, maxEmails: number | null)`
Actualiza el límite personalizado de una cuenta.

**Parámetros:**
- `accountId`: ID de la cuenta de negocio
- `maxEmails`: Límite de emails (null = usar plan, 0 = bloquear, número = límite)

**Retorna:**
```typescript
{ success: boolean; error?: string }
```

#### `getAccountEmailLimitInfoAction(accountId: string)`
Obtiene información completa del límite de una cuenta.

**Retorna:**
```typescript
{
  data: {
    maxEmails: number | null,
    emailsSent: number,
    emailsRemaining: number | null,
    hasReachedLimit: boolean,
    isOverridden: boolean,
    periodStart: Date,
    periodEnd: Date
  } | null,
  error?: string
}
```

### Servicios

#### `EmailLimitService`
Servicio principal para validación de límites.

**Métodos:**
- `validateLimit(account, requestedCount)`: Valida si puede enviar N emails
- `countEmailsSent(account)`: Cuenta emails enviados en período actual
- `getLimitInfo(account)`: Obtiene información del límite
- `hasEmailLimit(account)`: Verifica si tiene límite configurado

## Migraciones

### Crear migración inicial
```sql
-- supabase/migrations/20260304_add_email_limits_to_plan_features.sql
UPDATE plans 
SET features = features || '{"max_emails": 10}'::jsonb
WHERE code = 'trial';

UPDATE plans 
SET features = features || '{"max_emails": 0}'::jsonb
WHERE code = 'free';

UPDATE plans 
SET features = features || '{"max_emails": null}'::jsonb
WHERE code NOT IN ('trial', 'free');
```

## Testing

### Verificar configuración de un plan:
```sql
SELECT code, name, features->>'max_emails' as max_emails
FROM plans 
WHERE code = 'trial';
```

### Verificar límite de una cuenta:
```sql
SELECT 
  ba.id,
  ba.company_name,
  ba.settings->>'max_emails_override' as override,
  p.code as plan_code,
  p.features->>'max_emails' as plan_max_emails
FROM business_accounts ba
LEFT JOIN plans p ON ba.plan_id = p.id
WHERE ba.id = 'account-id';
```

### Contar emails enviados:
```sql
SELECT SUM(total_clients) as emails_sent
FROM collection_executions ce
JOIN businesses b ON ce.business_id = b.id
WHERE b.business_account_id = 'account-id'
  AND ce.created_at >= '2024-01-01';
```

## Consideraciones de Seguridad

1. **Validación Server-Side:** La validación siempre ocurre en el servidor, nunca confíes solo en la UI
2. **Race Conditions:** En alta concurrencia, usar transacciones si se requiere precisión exacta
3. **Logs:** Los intentos de envío bloqueados se loguean para auditoría
4. **Overrides:** Solo usuarios con permiso `canEditFull` pueden modificar límites

## Troubleshooting

### Error: "Email limit exceeded" sin haber enviado emails
**Causa probable:** Fechas de trial incorrectas o plan mal configurado
**Solución:** Verificar `trial_ends_at` y `subscription_started_at` en la cuenta

### Error: No se actualiza el límite después de cambiarlo
**Causa probable:** Cache del navegador o estado no actualizado
**Solución:** Recargar la página o esperar a que expire el cache del servicio

### Emails enviados no se contabilizan
**Causa probable:** Las ejecuciones están fuera del período calculado
**Solución:** Verificar fechas de `created_at` en `collection_executions`

## Soporte

Para reportar problemas o solicitar aumentos de límite, contactar al equipo de soporte con:
- ID de la cuenta de negocio
- Plan actual
- Límite actual vs necesario
- Justificación del aumento