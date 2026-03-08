# Análisis de Limpieza de Código - Apex Portfolio

## Resumen Ejecutivo

Este documento detalla el análisis realizado para identificar código duplicado, código muerto y oportunidades de limpieza en el proyecto. El objetivo es reducir la complejidad y mantener un código limpio sin romper funcionalidad existente.

---

## 1. Código Duplicado Encontrado

### 1.1 Servicios de EmailBlacklist (CRÍTICO)

**Ubicación:** Dos implementaciones del mismo servicio

| Archivo | Estado | Uso |
|---------|--------|-----|
| `/lib/services/blacklist/email-blacklist-service.ts` | **MUERTO** | No se importa en ningún lugar |
| `/lib/services/collection/email-blacklist-service.ts` | **ACTIVO** | Usado en webhooks y actions |

**Detalles:**
- El servicio en `lib/services/blacklist/` es un wrapper que usa actions
- El servicio en `lib/services/collection/` es la implementación real con llamadas directas a Supabase
- El directorio `lib/services/blacklist/` entero está muerto (solo contiene este archivo)

**Acción:** Eliminar `/lib/services/blacklist/` completo

---

## 2. Código Muerto - Actions (Archivos completos sin usar)

Los siguientes archivos en `lib/actions/` no se importan en ningún archivo `.ts` o `.tsx`:

| Archivo | Razón |
|---------|-------|
| `customer-category.ts` | No se importa en ningún componente |
| `getenv.ts` | No se importa en ningún componente |
| `jwe.ts` | No se importa en ningún componente |
| `mailgun.ts` | No se importa en ningún componente |
| `check-message-ids.ts` | No se importa en ningún componente |
| `dynamodb.ts` | No se importa en ningún componente |
| `data-table-export.ts` | No se importa en ningún componente |
| `form-template.ts` | No se importa en ningún componente |
| `notification.ts` | No se importa en ningún componente |
| `template-storage.ts` | No se importa en ningún componente |

---

## 3. Código Muerto - Hooks

| Archivo | Estado | Uso |
|---------|--------|-----|
| `hooks/useExecutionDelete.ts` | **MUERTO** | No se importa en ningún lugar |

---

## 4. Código Muerto - Modelos

| Archivo | Estado | Uso |
|---------|--------|-----|
| `lib/models/blacklist/` | **MUERTO** | Directorio completo sin referencias |

---

## 5. Posibles Duplicados - Hooks con Lógica Similar

Los siguientes hooks tienen funcionalidad similar pero están optimizados de manera diferente:

| Archivo | Propósito |
|---------|-----------|
| `hooks/collection/use-threshold-preview.ts` | Preview simple sin store |
| `hooks/collection/use-wizard-threshold-preview.ts` | Preview con Zustand store para wizard |

**Nota:** Estos dos archivos tienen lógica muy similar (agrupar clientes por threshold, calcular rangos faltantes). Se podría refactorizar para共享 lógica, pero requieren análisis más profundo para no romper funcionalidad.

---

## 6. Archivos de Configuración y Otros

| Archivo/Directorio | Estado | Notas |
|-------------------|--------|-------|
| `lib/models/blacklist/const/` | **MUERTO** | Sin uso |

---

## 7. Plan de Limpieza

### Paso 1: Eliminar servicios duplicados
```bash
rm -rf lib/services/blacklist/
```

### Paso 2: Eliminar actions no usados
```bash
rm lib/actions/customer-category.ts
rm lib/actions/getenv.ts
rm lib/actions/jwe.ts
rm lib/actions/mailgun.ts
rm lib/actions/check-message-ids.ts
rm lib/actions/dynamodb.ts
rm lib/actions/data-table-export.ts
rm lib/actions/form-template.ts
rm lib/actions/notification.ts
rm lib/actions/template-storage.ts
```

### Paso 3: Eliminar hooks no usados
```bash
rm hooks/useExecutionDelete.ts
```

### Paso 4: Eliminar modelos no usados
```bash
rm -rf lib/models/blacklist/
```

### Paso 5: Verificar integridad
```bash
npm run typecheck
npm run lint
```

---

## 8. Precauciones

1. **No eliminar `dynamodb.ts`**: Aunque no se usa en frontend, podría ser necesario para funciones serverless o workers. Verificar antes de eliminar.

2. **Respaldar antes de eliminar**: Siempre hacer un backup o commit antes de ejecutar limpiezas.

3. **Verificar después de cada eliminación**: Ejecutar `npm run typecheck` después de cada grupo de eliminaciones.

---

## 9. Métricas del Proyecto

- Total de archivos TypeScript/TSX: ~150+
- Archivos con código muerto identificado: ~15
- Porcentaje de limpieza potencial: ~10%

---

*Documento generado el 2026-03-06*
