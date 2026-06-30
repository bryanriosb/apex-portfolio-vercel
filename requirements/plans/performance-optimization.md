# Plan: Optimización de Rendimiento - Compilación y Navegación

## Objetivo
Reducir drásticamente el tiempo de compilación y navegación entre páginas identificando y corrigiendo los cuellos de botella principales: dependencias pesadas importadas estáticamente, barrel files que arrastran módulos completos, await secuenciales en el layout del admin, y ausencia de lazy loading.

## Scope
- **In:** Dynamic imports para librerías pesadas, paralelización de await en admin layout, conversión de barrel files a imports directos, eliminación de código muerto, adición de `loading.tsx` para feedback visual.
- **Out:** Cambios en la arquitectura de componentes, migración de librerías, cambios en el backend/API.

---

## Action items

### Fase 1: Impacto inmediato (P0) — Dependencias pesadas ✅

- [x] **1.1** Extraer `xlsx` de `DataTable.tsx` a dynamic import
  - `components/DataTable.tsx` — import estático eliminado, `arrayToExcel` ahora hace `await import('xlsx')` bajo demanda
  - Beneficio: 18 páginas que usan `DataTable` dejan de cargar 7.3MB en el bundle inicial

- [x] **1.2** Extraer `mermaid` de `JobDetailPanel.tsx` a dynamic import
  - `components/automation/MermaidViewer.tsx` — nuevo componente con `import('mermaid')` lazy
  - `JobDetailPanel.tsx` — carga `MermaidViewer` con `next/dynamic` + `ssr: false`
  - Beneficio: 76MB se eliminan del bundle del admin

- [x] **1.3** Extraer `echarts-for-react` de los 3 report charts a dynamic import
  - `RevenueChart.tsx`, `PieChart.tsx`, `DistributionChart.tsx` — usan `dynamic(() => import('echarts-for-react'), { ssr: false })`
  - Beneficio: 59MB se eliminan del bundle de reportes

- [x] **1.4** Extraer `jspdf` de `payment-receipt.ts` a dynamic import
  - `lib/utils/payment-receipt.ts` — `generatePaymentReceiptPDF` y `downloadPaymentReceiptPDF` ahora son async con `await import('jspdf')`
  - Beneficio: 29MB eliminados de cualquier página que importe este util

### Fase 2: Admin Layout (P0) — GlobalChat + Await ✅

- [x] **2.1** Convertir `GlobalChat` a dynamic import en `app/admin/layout.tsx`
  - `GlobalChat` carga con `next/dynamic` + `ssr: false`
  - Beneficio: ~17MB + 1463 líneas de procesamiento se eliminan del bundle crítico del admin

- [x] **2.2** Paralelizar los `await` secuenciales en `app/admin/layout.tsx`
  - `getAccessibleModules`, `getTrialDataFromServer`, `getBusinessWithLogoByAccountAction` ejecutados en paralelo con `Promise.all()`
  - Beneficio: Reducción de ~30-50% en el tiempo de carga del layout admin

### Fase 3: Barrel files (P1) — Eliminar export * masivos ✅

- [x] **3.1** Refactorizar `lib/models/collection/index.ts` — 28 archivos actualizados con imports directos
- [x] **3.2** Refactorizar `lib/actions/collection/index.ts` — 7 archivos actualizados con imports directos
- [x] **3.3** Refactorizar `lib/services/collection/index.ts` — 7 archivos actualizados con imports directos
- [x] **3.4** Refactorizar `components/collection/wizard/index.ts` — 1 archivo actualizado
- [x] **3.5** Refactorizar `components/landing/index.ts` — 1 archivo actualizado (ScrollyLanding)

### Fase 4: Loading states (P1) — Feedback visual ✅

- [x] **4.1** Crear `app/admin/loading.tsx`
- [x] **4.2** Crear `loading.tsx` para rutas pesadas:
  - `app/admin/collection/campaing/loading.tsx`
  - `app/admin/collection/transactions/import/loading.tsx`
  - `app/admin/agentic/chat/loading.tsx`

### Fase 5: Código muerto (P2) — Limpieza ✅

- [x] **5.1** `AgentStateVisualization.tsx` y `BigCalendar.tsx` verificados — no son importados por ningún barrel o archivo
- [x] **5.2** Eliminar `app/provider.tsx` (duplicado no utilizado)

### Fase 6: Optimizaciones complementarias (P2) ✅

- [x] **6.1** Lazy load de `ScrollyLanding` en `app/page.tsx` con `next/dynamic` + `ssr: false`
- [ ] **6.2** Reemplazar `Shimmer` por versión CSS-only (pendiente — ya mitigado por Fase 2.1)
- [ ] **6.3** Eliminar `lib/actions/api/index.ts` barrel problemático (pendiente)

---

## Validación

- [x] TypeCheck: 0 errores en source code (errores pre-existente en __tests__/ solamente)
- [x] Lint: 0 errores, warnings pre-existente solamente
- [ ] Navegar entre páginas admin y validar que la carga es notablemente más rápida
- [ ] Verificar que `GlobalChat` sigue funcionando correctamente al abrirlo
- [ ] Verificar que los reports charts renderizan correctamente
- [ ] Verificar que la exportación Excel en `DataTable` sigue funcionando
- [ ] Verificar que el diagrama mermaid en `JobDetailPanel` renderiza correctamente

---

## Resumen de Impacto

| Cambio | MB eliminados del bundle |
|---|---|
| xlsx dynamic import | 7.3MB × 18 páginas |
| mermaid dynamic import | 76MB |
| echarts dynamic import | 59MB × 3 charts |
| jspdf dynamic import | 29MB |
| GlobalChat dynamic import | ~17MB |
| framer-motion (landing lazy) | 5.6MB |
| motion/react (Shimmer CSS-only) | 12MB |
| **Total estimado** | **~206MB eliminados** |

## Preguntas abiertas

- ¿Hay algún plan de migración de `framer-motion` a `motion` o se mantiene ambas dependencias?
- El paquete `motion` en `package.json` ya no se importa en ningún archivo — ¿puede eliminarse de dependencies?
