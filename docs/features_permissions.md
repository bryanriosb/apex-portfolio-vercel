# Guía de Sistema de Permisos Granulares por Plan

## 📋 Descripción General

Este sistema permite controlar el acceso a funcionalidades específicas dentro de cada módulo según el plan del usuario. A diferencia del sistema de módulos que habilita/deshabilita módulos completos, este sistema permite un control granular de features individuales.

## 🏗️ Arquitectura

### Base de Datos

El sistema utiliza las tablas existentes:

- **`plans`**: Definición de planes
- **`plan_modules`**: Módulos disponibles en el sistema
- **`plan_module_access`**: Relación entre planes y módulos con permisos
  - Campo `custom_permissions` (JSONB): Contiene los permisos granulares para cada feature

### Estructura de `custom_permissions`

```json
{
  "whatsapp_notifications": true,
  "specialist_assignment": true,
  "price_editing": false,
  "supply_management": true,
  "goals_management": false,
  "view_charts": true,
  "export_data": true
}
```

## 🎯 Features Implementadas por Módulo

### 1. Citas (appointments)

#### `whatsapp_notifications`
- **Descripción**: Enviar notificaciones y recordatorios por WhatsApp
- **Planes**: Pro, Enterprise
- **Implementación**:
  - UI: Componente `SendWhatsAppButton` oculto en planes básicos
  - Server: Validación en `sendWhatsAppTextMessageAction` y `sendWhatsAppTemplateMessageAction`

#### `specialist_assignment`
- **Descripción**: Asignar especialistas específicos por servicio
- **Planes**: Pro, Enterprise
- **Implementación**:
  - UI: Componente `ServiceSpecialistAssignmentComponent` con overlay en planes básicos
  - Fallback: Asignación básica de un solo especialista

#### `price_editing`
- **Descripción**: Editar precios de servicios al crear citas
- **Planes**: Pro, Enterprise
- **Estado**: Pendiente de implementación

### 2. Servicios (services)

#### `supply_management`
- **Descripción**: Gestionar insumos asociados a servicios
- **Planes**: Pro, Enterprise
- **Estado**: Pendiente de implementación

#### `price_editing_in_appointment`
- **Descripción**: Modificar precios durante la creación de citas
- **Planes**: Pro, Enterprise
- **Estado**: Pendiente de implementación

### 3. Especialistas (specialists)

#### `goals_management`
- **Descripción**: Definir y hacer seguimiento a metas
- **Planes**: Pro, Enterprise
- **Estado**: Pendiente de implementación

### 4. Reportes (reports)

#### `view_charts`
- **Descripción**: Visualizar gráficos en reportes
- **Planes**: Pro, Enterprise

#### `view_revenue`, `view_appointments`, `view_services`, `view_specialists`
- **Descripción**: Acceso a métricas básicas
- **Planes**: Free, Basic, Pro, Enterprise

#### `view_customers`, `view_supplies`
- **Descripción**: Acceso a métricas avanzadas
- **Planes**: Pro, Enterprise

#### `view_portfolio`
- **Descripción**: Acceso a datos de cartera
- **Planes**: Enterprise

#### `export_data`
- **Descripción**: Exportar reportes
- **Planes**: Pro, Enterprise

## 🛠️ Cómo Usar el Sistema

### 1. En Componentes (Client-side)

#### Opción A: Hook `useFeaturePermission`

```tsx
import { useFeaturePermission } from '@/hooks/use-feature-permission'

function MyComponent() {
  const { hasPermission, isLoading } = useFeaturePermission(
    'appointments',
    'whatsapp_notifications'
  )

  if (isLoading) return <Skeleton />
  if (!hasPermission) return null

  return <WhatsAppButton />
}
```

#### Opción B: Componente `FeatureGate`

```tsx
import { FeatureGate } from '@/components/plan/feature-gate'

// Modo 1: Ocultar completamente
<FeatureGate module="appointments" feature="whatsapp_notifications" mode="hide">
  <WhatsAppButton />
</FeatureGate>

// Modo 2: Deshabilitar (opacidad)
<FeatureGate module="appointments" feature="specialist_assignment" mode="disable">
  <SpecialistSelector />
</FeatureGate>

// Modo 3: Overlay con mensaje de upgrade
<FeatureGate
  module="services"
  feature="supply_management"
  mode="compact"
>
  <SupplyManagementSection />
</FeatureGate>

// Modo 4: Con fallback personalizado
<FeatureGate
  module="reports"
  feature="view_charts"
  fallback={<div>Actualiza a Pro para ver gráficos</div>}
>
  <ChartsSection />
</FeatureGate>
```

#### Opción C: Componente `ConditionalFeature`

```tsx
import { ConditionalFeature } from '@/components/plan/feature-gate'

// Simplemente oculta si no tiene permiso
<ConditionalFeature module="reports" feature="export_data">
  <ExportButton />
</ConditionalFeature>
```

#### Opción D: Hook `useModuleFeaturePermissions`

```tsx
import { useModuleFeaturePermissions } from '@/hooks/use-feature-permission'

function ReportsPage() {
  const { permissions, isLoading, hasPermission } = useModuleFeaturePermissions('reports')

  if (isLoading) return <Loading />

  return (
    <div>
      {hasPermission('view_charts') && <Charts />}
      {hasPermission('view_customers') && <CustomersReport />}
      {hasPermission('export_data') && <ExportButton />}
    </div>
  )
}
```

### 2. En Server Actions

```tsx
import { validateFeatureAccess } from '@/lib/helpers/feature-permission-guard'

export async function myServerAction(businessAccountId: string) {
  // Validar acceso a la feature
  const permissionCheck = await validateFeatureAccess(
    businessAccountId,
    'appointments',
    'whatsapp_notifications'
  )

  if (!permissionCheck.success) {
    return {
      success: false,
      error: permissionCheck.error
    }
  }

  // Continuar con la lógica...
}
```

### 3. Verificación Directa

```tsx
import { checkFeaturePermissionAction } from '@/lib/actions/plan'

const hasPermission = await checkFeaturePermissionAction(
  businessAccountId,
  'reports',
  'export_data'
)

if (!hasPermission) {
  return { success: false, error: 'No tienes acceso a esta función' }
}
```

## 📝 Añadir Nuevas Features

### Paso 1: Definir la Feature en TypeScript

Edita [`lib/models/plan/feature-permissions.ts`](lib/models/plan/feature-permissions.ts):

```typescript
export type MyModuleFeaturePermission =
  | 'new_feature'
  | 'another_feature'

export const FEATURE_PERMISSIONS_METADATA = {
  my_module: {
    new_feature: {
      name: 'Nueva Funcionalidad',
      description: 'Descripción de la funcionalidad',
      requiredPlan: ['pro', 'enterprise'],
    },
  },
}
```

### Paso 2: Configurar en Base de Datos

Ejecuta SQL para actualizar `custom_permissions`:

```sql
UPDATE plan_module_access
SET custom_permissions = jsonb_set(
  COALESCE(custom_permissions, '{}'::jsonb),
  '{new_feature}',
  'true'::jsonb
)
WHERE plan_id = (SELECT id FROM plans WHERE code = 'pro')
  AND module_id = (SELECT id FROM plan_modules WHERE code = 'my_module');
```

### Paso 3: Implementar en UI

```tsx
<FeatureGate module="my_module" feature="new_feature" mode="overlay">
  <NewFeatureComponent />
</FeatureGate>
```

### Paso 4: Proteger Server-side

```tsx
export async function newFeatureAction(params) {
  const check = await validateFeatureAccess(
    params.businessAccountId,
    'my_module',
    'new_feature'
  )

  if (!check.success) {
    return { success: false, error: check.error }
  }

  // Lógica...
}
```

## 🔧 Configuración de Planes

### Free Plan
```json
{
  "appointments.whatsapp_notifications": false,
  "appointments.specialist_assignment": false,
  "appointments.price_editing": false,
  "services.supply_management": false,
  "specialists.goals_management": false,
  "reports.view_charts": false,
  "reports.view_customers": false,
  "reports.export_data": false
}
```

### Basic Plan
Igual que Free

### Pro Plan
```json
{
  "appointments.whatsapp_notifications": true,
  "appointments.specialist_assignment": true,
  "appointments.price_editing": true,
  "services.supply_management": true,
  "specialists.goals_management": true,
  "reports.view_charts": true,
  "reports.view_customers": true,
  "reports.view_supplies": true,
  "reports.export_data": true
}
```

### Enterprise Plan
Todo en `true` + `reports.view_portfolio`

## 🎨 Componentes Disponibles

### `<FeatureGate>`
Componente principal para controlar acceso con múltiples modos de visualización.

**Props:**
- `module`: Código del módulo
- `feature`: Código de la feature
- `mode`: 'hide' | 'disable' | 'overlay' (default: 'hide')
- `fallback`: Contenido alternativo
- `showUpgradeMessage`: Mostrar mensaje de upgrade (default: true)

### `<ConditionalFeature>`
Componente simple que oculta el contenido si no hay permiso.

**Props:**
- `module`: Código del módulo
- `feature`: Código de la feature
- `loader`: Componente a mostrar mientras carga

### `<FeatureLockedMessage>`
Alerta que indica que la feature está bloqueada con botón de upgrade.

**Props:**
- `module`: Código del módulo
- `feature`: Código de la feature
- `title`: Título personalizado
- `description`: Descripción personalizada

## 🧪 Testing

```typescript
// Verificar que la migración se ejecutó correctamente
SELECT
  p.code as plan,
  pm.code as module,
  pma.custom_permissions
FROM plan_module_access pma
JOIN plans p ON p.id = pma.plan_id
JOIN plan_modules pm ON pm.id = pma.module_id
WHERE pma.custom_permissions IS NOT NULL
ORDER BY p.sort_order, pm.code;
```

## 🚨 Consideraciones Importantes

1. **COMPANY_ADMIN**: Los usuarios con rol `COMPANY_ADMIN` tienen acceso completo a todas las features sin verificación de plan.

2. **Caché**: Los hooks implementan caché interno. Si cambias permisos, el usuario debe recargar la página.

3. **Performance**: `useModuleFeaturePermissions` hace una sola llamada al servidor para obtener todos los permisos de un módulo.

4. **Fallback**: Siempre proporciona un fallback visual apropiado para no confundir al usuario.

5. **Server-side**: SIEMPRE valida permisos en el servidor, la validación client-side es solo para UX.

## 📂 Archivos Clave

### Base de Datos
- [`lib/sql/feature-permissions-migration.sql`](lib/sql/feature-permissions-migration.sql) - Migración inicial

### Tipos y Modelos
- [`lib/models/plan/feature-permissions.ts`](lib/models/plan/feature-permissions.ts) - Definición de tipos y metadata

### Hooks
- [`hooks/use-feature-permission.ts`](hooks/use-feature-permission.ts) - Hooks para verificación de permisos

### Componentes
- [`components/plan/feature-gate.tsx`](components/plan/feature-gate.tsx) - Componentes de control de acceso

### Actions
- [`lib/actions/plan.ts`](lib/actions/plan.ts) - Server actions para verificación

### Helpers
- [`lib/helpers/feature-permission-guard.ts`](lib/helpers/feature-permission-guard.ts) - Helpers para validación server-side

## 📊 Ejemplo Completo: Implementar Export en Reportes

### 1. Ya está definido en tipos ✅
```typescript
// lib/models/plan/feature-permissions.ts
export type ReportsFeaturePermission =
  | 'export_data'
  // ... otros
```

### 2. Ya está en la migración ✅
```sql
-- Ya configurado para todos los planes
```

### 3. Implementar en UI

```tsx
// app/admin/reports/page.tsx
import { ConditionalFeature } from '@/components/plan/feature-gate'

export default function ReportsPage() {
  return (
    <div>
      <h1>Reportes</h1>

      {/* Charts solo en Pro+ */}
      <ConditionalFeature module="reports" feature="view_charts">
        <ChartsSection />
      </ConditionalFeature>

      {/* Export solo en Pro+ */}
      <ConditionalFeature module="reports" feature="export_data">
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar Datos
        </Button>
      </ConditionalFeature>
    </div>
  )
}
```

### 4. Proteger Server Action

```tsx
// lib/actions/reports.ts
import { validateFeatureAccess } from '@/lib/helpers/feature-permission-guard'

export async function exportReportAction(businessAccountId: string, format: string) {
  const check = await validateFeatureAccess(
    businessAccountId,
    'reports',
    'export_data'
  )

  if (!check.success) {
    return { success: false, error: check.error }
  }

  // Generar export...
  const data = await generateReport()
  return { success: true, data }
}
```

## 🎯 Próximos Pasos

Las siguientes features están pendientes de implementación completa:

- [ ] `services.supply_management` - Gestión de insumos en servicios
- [ ] `services.price_editing_in_appointment` - Edición de precios en citas
- [ ] `appointments.price_editing` - Edición de precios de servicios
- [ ] `specialists.goals_management` - Sistema de metas para especialistas
- [ ] Vistas diferenciadas de reportes según plan

Para cada una, seguir el patrón de 4 pasos documentado arriba.

## 💡 Tips

1. Usa `mode="overlay"` para features premium que quieras mostrar pero bloquear
2. Usa `mode="hide"` para features que no quieres ni mostrar
3. Usa `ConditionalFeature` para simplicidad cuando solo necesitas ocultar
4. Siempre agrega validación server-side, nunca confíes solo en el cliente
5. Documenta cada feature nueva en este archivo

---

**Última actualización**: 2025-12-11
**Sistema de permisos granulares v1.0**
