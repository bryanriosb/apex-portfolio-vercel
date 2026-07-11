# Plan — Módulo de Facturas (Ontology API)

## Objetivo

Implementar el módulo de **Facturas** consumiendo el endpoint `GET /api/ontology/invoices` (CRUD completo), integrado en el sidebar bajo **Aplicación → Cartera → Facturas** (antes de Transacciones). Se sigue la arquitectura existente: **Component → Service → Action → API**, con DataTable autónomo y modales para CRUD, tal como el módulo de customers.

## Scope

- **In:** Sidebar menu, server actions, service, tipos, columnas DataTable, página de listado, modales create/edit, confirmación delete (física), selector de `client_id` desde `business_customers`
- **Out:** Vista de detalle individual, exportación, reportes, dashboards, paginación en cliente

## Estado de Implementación

✅ **Todas las fases completadas** — Build y lint pasan sin errores.

## Fases

### Fase 1: Tipos y acciones del API ✅

**Archivos a crear:**
- `lib/models/invoice/types.ts`
- `lib/actions/api/invoices.ts`

**Detalles:**
- Definir interfaces `Invoice`, `InvoiceListParams`, `InvoiceCreatePayload`, `InvoiceUpdatePayload`, `InvoicesPaginatedResponse`
- Crear server actions usando `apiApexAiAuth` con patrón `handleApiCall` (igual que integrations):
  - `listInvoicesAction(params)` → GET `/api/ontology/invoices`
  - `getInvoiceAction(id)` → GET `/api/ontology/invoices/${id}`
  - `createInvoiceAction(data)` → POST `/api/ontology/invoices`
  - `updateInvoiceAction(id, data)` → PATCH `/api/ontology/invoices/${id}`
  - `deleteInvoiceAction(id)` → DELETE `/api/ontology/invoices/${id}`

### Fase 2: Service layer ✅

**Archivos a crear:**
- `lib/services/invoice/invoice-service.ts`

**Detalles:**
- Clase `InvoiceService` con métodos:
  - `fetchItems(params)` → delega a `listInvoicesAction`, mapea respuesta a `{ data, total, total_pages }` para compatibilidad DataTable
  - `getById(id)` → delega a `getInvoiceAction`
  - `create(data)` → delega a `createInvoiceAction`
  - `update(id, data)` → delega a `updateInvoiceAction`
  - `destroy(id)` → delega a `deleteInvoiceAction`
  - `destroyMany(ids)` → ejecuta `deleteInvoiceAction` en loop (API no soporta batch)

### Fase 3: Acción de clientes para selector ✅

**Archivos a modificar:**
- `lib/actions/business-customer.ts`

**Detalles:**
- Agregar función `searchBusinessCustomersForSelectAction(business_id, search)` que retorne `{ id, full_name }` con límite de 50 resultados para el selector de `client_id`

### Fase 4: Columnas DataTable ✅

**Archivos a crear:**
- `lib/models/invoice/const/data-table/invoices-columns.tsx`

**Detalles:**
- Columnas: `invoice_number`, `invoice_date`, `due_date`, `amount_total`, `amount_due`, `days_overdue`, `status` (Badge), `actions`
- Status con variantes: draft=default, pending=warning, paid=success, partial=info, cancelled=danger

### Fase 5: Sidebar menu ✅

**Archivos a modificar:**
- `const/sidebar-menu.ts`

**Detalles:**
- Agregar sub-item `{ title: 'Facturas', url: '/admin/collection/invoices' }` **antes** de 'Transacciones' en la sección Cartera (~línea 96)

### Fase 6: Página de listado ✅

**Archivos a crear:**
- `app/admin/collection/invoices/page.tsx`

**Detalles:**
- Instanciar `InvoiceService` con `useMemo`
- `searchConfig`: columna `invoice_number`, placeholder "Buscar factura..."
- `filterConfigs`: filtro `status` con opciones: draft, pending, paid, partial, cancelled
- `defaultQueryParams`: `{ per_page: 20 }` (business_id se resuelve del token)
- Botón "Crear Factura" en header
- Modal `InvoiceFormModal` para create/edit
- `ConfirmDeleteDialog` para delete individual y batch

### Fase 7: Modal Create/Edit ✅

**Archivos a crear:**
- `components/invoices/InvoiceFormModal.tsx`

**Detalles:**
- FormSchema Zod: erp_id (string, required), invoice_number (string, required), invoice_date (date, required), due_date (date, required), amount_total (number > 0, required), amount_due (number ≥ 0, required), status (enum, default: draft), client_id (string, optional)
- Select async para `client_id` usando `searchBusinessCustomersForSelectAction`
- Componentes: FormField + Input, Select, Input type="date"
- Props: `open`, `onClose`, `onSave`, `invoice?: Invoice` (para editar)

### Fase 8: Verificación ✅

**Comandos:**
- `bun run build`
- Linter del proyecto

**Detalles:**
- Validar que no hay errores de tipos ni de linting
- Verificar que la página carga correctamente en el navegador

## Preguntas abiertas

- Ninguna — resueltas en la conversación anterior

## Archivos Creados/Modificados

### Creados:
- `lib/models/invoice/types.ts` — Interfaces y tipos
- `lib/actions/api/invoices.ts` — Server actions CRUD
- `lib/services/invoice/invoice-service.ts` — Service layer
- `lib/models/invoice/const/data-table/invoices-columns.tsx` — Columnas DataTable
- `app/admin/collection/invoices/page.tsx` — Página de listado
- `components/invoices/InvoiceFormModal.tsx` — Modal create/edit

### Modificados:
- `const/sidebar-menu.ts` — Agregado sub-item "Facturas" antes de "Transacciones"
