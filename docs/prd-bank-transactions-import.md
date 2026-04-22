# PRD: Importación de Transacciones Bancarias - Cierre del Ciclo de Cobro

**Versión:** 1.3
**Fecha:** Marzo 2026
**Estado:** En desarrollo - Fase 1, 2, 3 y 4 (parcial) completadas

---

## 1. Problem Statement

**Contexto actual:** El sistema de cobros permite enviar correos masivos a clientes morosos, pero **no existe retroalimentación sobre los pagos recibidos**. Los profesionales de cartera no tienen visibilidad de:
- Qué clientes de qué campañas han pagado
- Cuánto se ha recaudado vs. lo enviado en cobro
- Qué transacciones bancarias no han podido asociarse a clientes

**Impacto:** Sin cerrar el ciclo, el sistema es unidireccional (solo envía) y no permite medir la efectividad real de las campañas de cobro ni dar seguimiento día a día a la operación.

---

## 2. Goals

### User Goals (Profesional de Cartera)
1. **Visibilidad total**: Saber exactamente qué clientes han pagado y de qué campaña
2. **Seguimiento diario**: KPIs de recaudo vs. cartera enviada
3. **Gestión de excepciones**: Identificar y resolver transacciones sin identificar

### Business Goals
1. **Cerrar el ciclo de cobro**: Medir efectividad real de campañas
2. **Reducción de trabajo manual**: Automatizar matching de pagos
3. **Trazabilidad completa**: Auditoría de pagos por cliente/ejecución

---

## 3. Non-Goals

1. **Integración bancaria directa** - No se conectará automáticamente con bancos (v1)
2. **Conciliación contable** - No es un sistema contable, es de gestión de cartera
3. **Generación de recibos fiscales** - Fuera del alcance actual
4. **Notificaciones automáticas de pago** - Se deja para v2
5. **Múltiples cuentas bancarias** - v1 soporta una cuenta principal

---

## 4. Análisis del Formato Real de Extractos

### 4.1 Estructura del Archivo de Entrada

Basado en el archivo de referencia del cliente SIESA (`Bancos Simple.xlsx`):

**Arquitectura flexible**: Cada hoja del Excel representa un banco. El nombre de la hoja se usa como nombre del banco (normalizado a mayúsculas).

**Columnas estándar detectadas:**

| Campo | Columnas reconocidas | Observaciones |
|-------|---------------------|---------------|
| FECHA | FECHA, Fecha, fecha_transaccion | Detecta formato YYYYMMDD y fecha Excel |
| VALOR | VALOR, Valor, monto | Número decimal |
| NIT | NIT, Nit, documento | Se normaliza (sin puntos, string) |
| NOMBRE CLIENTE | NOMBRE CLIENTE, Nombre Cliente | Opcional, solo referencia |
| REFERENCIA | REFERENCIA, Referencia | Opcional |
| AGENTE | AGENTE SIESA, EQUIPO FACT Y CARTERA | Opcional |
| RECIBO | RECIBO, OK RECIBO | Opcional |
| NOVEDAD | NOVEDAD, Novedad | Opcional |

### 4.2 Mapeo de Columnas Estándar

```typescript
const COLUMN_MAPPINGS = {
  fecha: ['FECHA', ' FECHA', 'Fecha', 'fecha_transaccion'],
  valor: ['VALOR', 'Valor', 'monto', 'amount'],
  nit: ['NIT', 'Nit', 'nit_cliente', 'documento'],
  nombre: ['NOMBRE CLIENTE', 'Nombre Cliente', 'razon_social', 'cliente'],
  referencia: ['REFERENCIA', 'Referencia', 'descripcion', 'concepto'],
  agente: ['AGENTE SIESA', 'EQUIPO FACT Y CARTERA', 'agente', 'gestor'],
  recibo: ['RECIBO', 'OK RECIBO', 'OK RECIBO ', 'confirmado'],
  novedad: ['NOVEDAD', 'Novedad', 'nota', 'observacion'],
}
```

### 4.3 Normalizaciones Requeridas

| Campo | Transformación | Ejemplo |
|-------|----------------|---------|
| NIT | Convertir a string, quitar puntos/comas, validar longitud | `890907489` (num) → `"890907489"` |
| FECHA | Detectar formato (YYYYMMDD vs fecha Excel), convertir a DATE | `20260304` → `2026-03-04` |
| VALOR | Convertir a número decimal, manejar separadores | Ya viene como número |
| Banco | Derivar del nombre de la hoja | `"BANCOLOMBIA"` |

### 4.4 Casos Especiales Detectados

1. **Registros sin NIT**: Algunas filas tienen NIT vacío (`NaN`) - marcar como `no_nit`
2. **Filas vacías**: Últimas filas de algunas hojas están completamente vacías
3. **NITs como número**: Vienen como `890907489.0` (float), necesitan conversión

---

## 5. User Stories

### Epic 1: Importación de Transacciones

**US-1.1:** Como profesional de cartera, quiero importar un archivo Excel con múltiples hojas (una por banco) para procesar todos los pagos de diferentes bancos en una sola importación.

**US-1.2:** Como profesional de cartera, quiero ver una previsualización de las transacciones por banco antes de confirmar la importación para validar que los datos son correctos.

**US-1.3:** Como sistema, quiero detectar automáticamente el banco basándome en el nombre de la hoja del Excel.

**US-1.4:** Como sistema, quiero normalizar automáticamente los NITs (quitar puntos, convertir a string) para facilitar el matching.

### Epic 2: Matching de Transacciones

**US-2.1:** Como sistema, quiero asociar automáticamente transacciones a clientes usando el NIT como identificador principal. ✅

**US-2.2:** Como sistema, quiero registrar transacciones que no pudieron asociarse como "sin identificar" para revisión manual. ✅

**US-2.3:** Como profesional de cartera, quiero asociar manualmente una transacción sin identificar a un cliente existente. ✅

**US-2.4:** Como sistema, quiero calcular automáticamente el saldo pendiente de cada cliente después de aplicar pagos. (Pendiente)

### Epic 3: Dashboard y KPIs

**US-3.1:** Como profesional de cartera, quiero ver un dashboard con KPIs de cobro del día para tomar decisiones informadas.

**US-3.2:** Como profesional de cartera, quiero ver el total recaudado por cada campaña/ejecución para medir efectividad.

**US-3.3:** Como profesional de cartera, quiero ver un ranking de clientes con mayor recaudo para identificar patrones de pago.

**US-3.4:** Como profesional de cartera, quiero filtrar las métricas por rango de fechas para análisis periódicos.

### Epic 4: Gestión de Transacciones

**US-4.1:** Como profesional de cartera, quiero ver el historial de transacciones de un cliente específico. (Pendiente)

**US-4.2:** Como profesional de cartera, quiero ver todas las transacciones sin identificar en una tabla filtrable. ✅

**US-4.3:** Como profesional de cartera, quiero ver el estado de conciliación de cada transacción (identificada, sin identificar, duplicada). ✅

---

## 6. Requirements

### Must-Have (P0)

#### R1: Tabla de Transacciones Bancarias
- Crear tabla `bank_transactions` con campos:
  - `id`, `business_id`, `execution_id` (nullable)
  - `transaction_date`, `amount`, `bank_name`
  - `customer_id` (nullable), `customer_nit`
  - `customer_name_extract` (opcional, solo referencia del extracto)
  - `reference`, `description`, `agent_name`
  - `status`: `identified`, `unidentified`, `no_nit`, `duplicate`, `manual`
  - `receipt_status` (OK RECIBO / pendiente), `notes` (NOVEDAD)
  - `matched_at`, `matched_by`
  - `import_batch_id`, `source_file_name`, `source_sheet_name`
  - `raw_data` (JSONB para auditoría)
- **Nota**: El nombre real del cliente se obtiene de `business_customers` vía relación `customer_id`

#### R2: Importación Multi-Banco
- Soportar archivos `.xlsx` con múltiples hojas (una por banco)
- **Arquitectura flexible**: cada hoja del Excel se interpreta como un banco independiente
- Los nombres de banco se normalizan automáticamente a MAYÚSCULAS
- **Columnas requeridas**: FECHA, VALOR, NIT
- **Columnas opcionales**: NOMBRE CLIENTE (solo referencia), REFERENCIA, AGENTE, RECIBO, NOVEDAD
- Mostrar preview de datos por banco antes de confirmar
- Procesar en lotes para archivos grandes (>1000 registros por hoja)
- Detectar y marcar duplicados por (business_id, transaction_date, amount, customer_nit)

#### R3: Normalización de Datos
- **NIT**: Convertir a string, quitar puntos/comas, validar longitud mínima
- **Fecha**: Detectar formato automáticamente (YYYYMMDD vs fecha Excel)
- **Valor**: Mantener como número decimal
- **Banco**: Derivar del nombre de la hoja
- Filtrar filas completamente vacías

#### R4: Matching Automático
- Buscar cliente por NIT normalizado en `business_customers`
- Si encuentra match: asociar `customer_id` y marcar como `identified`
- Si NIT está vacío: marcar como `no_nit`
- Si NIT existe pero no hay match: marcar como `unidentified`
- Buscar ejecuciones activas del cliente para asociar `execution_id`

#### R5: Dashboard de KPIs
- Métricas del día:
  - Total recaudado hoy
  - Cantidad de transacciones procesadas
  - Desglose por banco
  - Tasa de identificación (%)
  - Transacciones sin identificar pendientes
- Métricas de campaña:
  - Recaudo por ejecución
  - Efectividad (recaudo / cartera enviada)

#### R6: Tabla de Transacciones sin Identificar ✅
- DataTable con filtros por fecha, monto, banco, descripción
- Acción: "Asociar a cliente"
- Modal de búsqueda de cliente por NIT/nombre
- Mostrar NIT original del extracto para referencia

### Nice-to-Have (P1)

#### R6: Historial de Transacciones por Cliente
- Sección en perfil del cliente mostrando todos sus pagos
- Suma total de pagos recibidos
- Saldo pendiente actualizado

#### R7: Reportes de Recaudo
- Exportar resumen de recaudo por período
- Gráfico de tendencia de pagos

#### R8: Notas en Transacciones
- Agregar notas aclaratorias a transacciones
- Útil para casos especiales

### Future Considerations (P2)

- Integración directa con API bancaria
- Conciliación automática con facturas específicas
- Notificaciones de pago a clientes
- Múltiples cuentas bancarias

---

## 6. Success Metrics

### Leading Indicators (1-30 días)
| Métrica | Target | Stretch |
|---------|--------|----------|
| Tasa de identificación automática | >70% | >85% |
| Tiempo de importación (1000 registros) | <30s | <15s |
| Adopción de la funcionalidad | 50% de usuarios activos | 80% |

### Lagging Indicators (1-3 meses)
| Métrica | Target | Stretch |
|---------|--------|----------|
| Reducción de trabajo manual en conciliación | 50% | 70% |
| Tiempo promedio para identificar transacciones sin NIT | <24h | <4h |
| Usuarios que reportan "mejor visibilidad del cobro" | 70% | 90% |

---

## 7. Open Questions

| # | Pregunta | Quién responde | Blocking? |
|---|----------|----------------|-----------|
| 1 | ¿Cuál es el formato exacto del extracto bancario que usan actualmente? | Usuario final | Sí |
| 2 | ¿Los NITs vienen limpios en el extracto o requieren parseo? | Usuario final | No |
| 3 | ¿Necesitan asociar pagos a facturas específicas o solo al cliente? | Stakeholder | Sí |
| 4 | ¿Qué pasa si un cliente tiene múltiples ejecuciones activas? | Stakeholder | No |

---

## 8. Arquitectura Propuesta

### 8.1 Base de Datos

```sql
-- Tabla principal de transacciones bancarias
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES collection_executions(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES business_customers(id) ON DELETE SET NULL,
  
  -- Datos de la transacción
  transaction_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reference VARCHAR(100),
  description TEXT,
  customer_nit VARCHAR(50),
  
  -- Estado y matching
  status VARCHAR(20) NOT NULL DEFAULT 'unidentified',
  matched_at TIMESTAMPTZ,
  matched_by UUID REFERENCES auth.users(id),
  
  -- Metadatos de importación
  import_batch_id UUID,
  source_file_name VARCHAR(255),
  raw_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_bank_transactions_business ON bank_transactions(business_id);
CREATE INDEX idx_bank_transactions_customer ON bank_transactions(customer_id);
CREATE INDEX idx_bank_transactions_execution ON bank_transactions(execution_id);
CREATE INDEX idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date DESC);
CREATE INDEX idx_bank_transactions_nit ON bank_transactions(customer_nit);

-- Constraint de unicidad para detectar duplicados
CREATE UNIQUE INDEX idx_bank_transactions_unique 
  ON bank_transactions(business_id, transaction_date, amount, reference) 
  WHERE reference IS NOT NULL;

-- Tabla de batches de importación
CREATE TABLE bank_transaction_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  total_records INTEGER DEFAULT 0,
  identified_count INTEGER DEFAULT 0,
  unidentified_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.2 Estructura de Archivos

```
lib/
├── actions/
│   └── bank-transactions/
│       ├── index.ts              # Re-exports
│       ├── transaction.ts        # CRUD de transacciones
│       ├── import.ts             # Importación de archivos
│       └── matching.ts           # Lógica de matching
├── services/
│   └── bank-transactions/
│       ├── transaction-service.ts
│       └── import-service.ts
├── models/
│   └── bank-transactions/
│       ├── transaction.ts
│       └── batch.ts

components/
└── bank-transactions/
    ├── import/
    │   ├── ImportWizard.tsx
    │   ├── FileUploadStep.tsx
    │   ├── PreviewStep.tsx
    │   └── ResultStep.tsx
    ├── dashboard/
    │   ├── CollectionKPIs.tsx
    │   ├── RecaudoByExecution.tsx
    │   └── TransactionsChart.tsx
    ├── unidentified/
    │   ├── UnidentifiedTable.tsx
    │   └── MatchCustomerDialog.tsx
    └── shared/
        └── TransactionColumns.tsx

app/
└── admin/
    └── collection/
        └── transactions/
            ├── page.tsx              # Dashboard
            ├── import/page.tsx       # Importar
            └── unidentified/page.tsx # Sin identificar
```

### 8.3 Componentes a Reutilizar

| Componente | Ubicación | Uso |
|------------|-----------|-----|
| `DataTable` | `components/ui/data-table` | Tabla de transacciones |
| `Loading` | `components/ui/loading` | Estados de carga |
| `FormField` | `shadcn` | Formularios |
| `GenericImportService` | `lib/services/data-templates` | Procesamiento de importación |
| `parseCSVFile` | `lib/actions/collection/csv-processor` | Parseo de Excel/CSV |

---

## 9. Plan de Implementación

### Fase 1: Fundamentos ✅ COMPLETADA (2026-03-16)

**Archivos creados:**
- `supabase/migrations/tables/20260316_bank_transaction_batches.sql`
- `supabase/migrations/tables/20260316_bank_transactions.sql`
- `lib/models/bank-transactions/transaction.ts`
- `lib/models/bank-transactions/batch.ts`
- `lib/models/bank-transactions/index.ts`
- `lib/actions/bank-transactions/transaction.ts`
- `lib/actions/bank-transactions/batch.ts`
- `lib/actions/bank-transactions/index.ts`

**Tareas:**
- [x] Crear migraciones SQL (tablas, índices, RLS)
- [x] Crear modelos TypeScript (interfaces, tipos, mapeos)
- [x] Crear actions básicos (CRUD + matching + estadísticas)

**Actions disponibles:**
| Action | Descripción |
|--------|-------------|
| `fetchBankTransactionsAction` | Listar con filtros paginados |
| `getBankTransactionByIdAction` | Obtener por ID con relaciones |
| `createBankTransactionAction` | Crear transacción individual |
| `bulkInsertBankTransactionsAction` | Insertar en lote |
| `updateBankTransactionAction` | Actualizar transacción |
| `matchTransactionToCustomerAction` | Matching manual cliente |
| `deleteBankTransactionAction` | Eliminar individual |
| `deleteBankTransactionsAction` | Eliminar en lote |
| `getUnidentifiedTransactionsCountAction` | Contar sin identificar |
| `getTodayTransactionsSummaryAction` | Resumen del día por banco |
| `fetchBankTransactionBatchesAction` | Listar batches |
| `createBankTransactionBatchAction` | Crear batch |
| `updateBankTransactionBatchAction` | Actualizar batch |
| `completeBankTransactionBatchAction` | Completar batch con stats |
| `getBatchStatsAction` | Estadísticas de batch |
| `deleteBankTransactionBatchAction` | Eliminar batch + transacciones |

### Fase 2: Importación ✅ COMPLETADA (2026-03-16)

**Archivos creados/modificados:**
- `components/bank-transactions/import/ImportWizard.tsx` - Wizard de 3 pasos
- `components/bank-transactions/import/FileUploadStep.tsx` - Upload y validación
- `components/bank-transactions/import/PreviewStep.tsx` - Preview de datos por banco
- `components/bank-transactions/import/ResultStep.tsx` - Resultado de importación
- `components/bank-transactions/import/types.ts` - Tipos TypeScript
- `components/bank-transactions/import/index.ts` - Exports
- `lib/actions/bank-transactions/import.ts` - Server actions de importación
- `lib/services/bank-transactions/import-service.ts` - Lógica de parseo y matching
- `app/admin/collection/transactions/import/page.tsx` - Página de importación
- `supabase/migrations/20260316_fix_bank_transactions_unique_index.sql` - Fix índice único

**Correcciones realizadas (2026-03-16):**
- [x] Implementar PreviewStep.tsx (estaba vacío, solo exports)
- [x] Corregir import en page.tsx (importaba de './types' inexistente)
- [x] Eliminar export circular en index.ts
- [x] Corregir índice único: usar (business_id, date, amount, reference) en lugar de customer_nit
- [x] Agregar soporte para formato YYYYMMDD (usado por BANCOLOMBIA)
- [x] Agregar onFileSelect prop para mantener referencia al archivo seleccionado

**Tareas:**
- [x] Crear wizard de importación (3 pasos)
- [x] Validación y preview de datos
- [x] Procesamiento batch con progress
- [x] Soporte multi-banco flexible (cada hoja = un banco, nombres en mayúsculas)
- [x] Matching automático por NIT
- [x] Detección de duplicados

### Fase 3: Matching y Asociación Manual ✅ COMPLETADA (2026-03-24)

**Archivos creados/modificados:**
- `lib/actions/bank-transactions/import.ts` - Mejora de detección de duplicados antes de insertar
- `components/bank-transactions/unidentified/MatchCustomerDialog.tsx` - Diálogo de búsqueda de cliente
- `components/bank-transactions/unidentified/UnidentifiedTable.tsx` - Tabla de transacciones pendientes
- `components/bank-transactions/unidentified/index.ts` - Exports
- `app/admin/collection/transactions/unidentified/page.tsx` - Página de pendientes
- `app/admin/collection/transactions/page.tsx` - Dashboard básico con KPIs

**Tareas:**
- [x] Algoritmo de matching por NIT (ya implementado en Fase 2)
- [x] Detección de duplicados antes de insertar (marcar con status `duplicate`)
- [x] Asociación manual de transacciones a clientes
- [x] Tabla de transacciones sin identificar con filtros
- [x] Diálogo de búsqueda de clientes por NIT/nombre
- [x] Dashboard básico con KPIs del día y contador de pendientes

**Funcionalidades:**
- Detección proactiva de duplicados usando (business_id, transaction_date, amount, reference)
- Transacciones duplicadas se marcan con status `duplicate` en lugar de fallar
- UI para asociar manualmente transacciones a clientes existentes
- Alerta visual cuando hay transacciones pendientes de identificar
- Links rápidos a importación y transacciones pendientes

### Fase 4: Dashboard ✅ COMPLETADA (2026-03-24)

**Archivos creados/modificados:**
- `lib/actions/bank-transactions/transaction.ts` - Nuevos actions de recaudo
  - `getRecaudoDashboardStatsAction` - Estadísticas generales de recaudo
  - `getRecaudoByBankAction` - Recaudo acumulado por banco
- `components/dashboard/collection/RecaudoStatsCards.tsx` - KPIs principales de recaudo
- `components/dashboard/collection/RecaudoByBank.tsx` - Desglose por banco con barras de progreso
- `components/dashboard/collection/RecaudoAlerts.tsx` - Alertas de transacciones sin identificar
- `app/admin/dashboard/page.tsx` - Agregada estructura de tabs (Campaña/Recaudo)

**Tareas:**
- [x] Tab "Recaudo" en dashboard principal
- [x] KPIs de recaudo (total mes, hoy, sin identificar, tasa identificación)
- [x] Desglose por banco con porcentajes
- [x] Alerta visual para transacciones sin identificar
- [x] Link rápido a página de pendientes

**KPIs implementados:**
| KPI | Descripción |
|-----|-------------|
| Total Recaudado (Mes) | Suma de transacciones del mes actual |
| Hoy | Recaudo del día con cantidad de transacciones |
| Sin Identificar | Cantidad pendiente de asociar |
| Tasa Identificación | % de transacciones asociadas |
| Por Banco | Desglose con barras de progreso |

**Nota:** Se decidió NO implementar realtime para bank_transactions ya que no es crítico. Las estadísticas se actualizan con refresh manual.

### Fase 5: Testing y Polish (2 días)
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Refinamiento de UX

---

## 10. Timeline

**Tiempo total estimado:** 11-15 días hábiles

| Fase | Duración | Estado | Dependencias |
|------|----------|--------|--------------|
| Fase 1 | 2-3 días | ✅ Completada | Ninguna |
| Fase 2 | 3-4 días | ✅ Completada | Fase 1 |
| Fase 3 | 2-3 días | ✅ Completada | Fase 1, 2 |
| Fase 4 | 2-3 días | ✅ Completada | Fase 1, 2, 3 |
| Fase 5 | 2 días | Pendiente | Fase 1-4 |

---

## 11. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Formato de extracto bancario variable | Alta | Medio | Diseñar parser flexible con mapeo de columnas |
| NITs con formatos inconsistentes | Media | Alto | Normalizar NITs antes del matching |
| Alto volumen de transacciones | Baja | Medio | Procesamiento en lotes con paginación |
| Duplicados entre importaciones | Media | Bajo | Detección por constraint único |

---

## 12. Aprobaciones

| Rol | Nombre | Fecha | Estado |
|-----|--------|-------|--------|
| Product Owner | | | Pendiente |
| Tech Lead | | | Pendiente |
| Stakeholder | | | Pendiente |

---

**Documento creado:** Marzo 2026
**Última actualización:** 2026-03-24 (Fase 4 completada - Dashboard con tabs Campaña/Recaudo)
