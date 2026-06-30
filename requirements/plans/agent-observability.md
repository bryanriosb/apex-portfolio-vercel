# Plan: Agent Observability Integration

## Objetivo

Integrar el endpoint `/api/agent/automation/observe` en la pestaña "Registros de Decisión" del `JobPanel` para mostrar la traza de ejecución de los agentes, incluyendo el consumo de tokens y flujo de eventos.

## Reglas y Consideraciones

- Mantener colores primarios, gris y negro de la aplicación.
- No usar esquinas redondeadas.
- Usar Shadcn UI.
- Uso exclusivo de axios en el client/service.
- Crear componente enfocado a una lectura sencilla para personas administrativas.

## Fases de Implementación

### [x] Fase 1: Interfaces y Servicios

1. Agregar los tipos de respuesta `JobObserver` a `lib/services/automation/automation-types.ts`.
2. Crear el método `observeJob` en `lib/services/automation/automation-service.ts` usando axios.
3. Crear el Server Action `observeJobAction` en `lib/actions/automation.ts`.

### [x] Fase 2: Componente de Observabilidad

1. Crear el componente `JobObservabilityViewer.tsx` en `components/automation/`.
2. Implementar visualización de:
   - Metadatos del Job.
   - Resumen de costos (tokens consumidos, costo USD).
   - "Chain of Thought": Lista vertical tipo timeline o tabla (usar `DataTable` si amerita, o timeline custom con Shadcn) mostrando los `events` y el razonamiento.
   - Contactos generados.
3. Aplicar diseño premium sin bordes redondeados (`rounded-none`).

### [x] Fase 3: Integración en JobDetailPanel

1. Consumir `observeJobAction` dentro de `JobDetailPanel.tsx` cuando se abra la pestaña de "Registros de Decisión".
2. Mostrar un estado de carga (`Loading`).
3. Reemplazar la vista en crudo actual (JSON) por el nuevo componente visual `JobObservabilityViewer`.

### [x] Fase 4: Revisión Final

1. Comprobar que los modales y las vistas mantengan la estética del sistema (UI/UX).
2. Code review general para asegurar consistencia.
