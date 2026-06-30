# Plan: Migración del Panel de Automatización a un Sheet

## Objetivo
Mover el panel de automatización que actualmente se encuentra en la ruta `/admin/agentic/automation` (página dedicada) a un `Sheet` desplegable desde el header del área administrativa (`AdminHeader.tsx`). El botón de acceso (ícono de rayo) debe estar ubicado justo antes del botón "Reportar Novedad".

## Contexto y Restricciones
- Conservar estrictamente el estilo visual de la aplicación, usando tokens semánticos (ej. `bg-muted`, `text-muted-foreground`, `border-border`).
- **Uso de Colores:** Mantener el equilibrio cromático, no saturar la vista con el color `primary`. 
- **Compatibilidad de Temas:** Asegurar compatibilidad nativa con *dark mode* sin utilizar tonos azulados explícitos, sino heredando los colores grises oscuros / neutros de la paleta general.
- **Diseño Global:** No utilizar esquinas redondeadas en el contenedor del sheet o en los botones (regla de diseño global).
- **Botones:** El tamaño del componente `Button` siempre que lo uses es `"sm"`.
- **Formato de Fechas:** Si se muestran fechas/horas (ej. en el Ticker), usar **siempre el Timezone del `activeBusinessStore`** y `date-fns` en español con el formato exacto `"MMM dd, yyyy HH:mm"` (ej. "mar 10, 2026 12:27").
- **Filtro por Sucursal:** Asegurarse de que cualquier consulta o conexión a eventos respete el `activeBusinessId` del store.
- El Sheet debe desplegarse hacia abajo (propiedad `side="top"` en shadcn `Sheet`). **Nota UX:** Al ser `side="top"`, se desplegará sobre el área superior; validar que la X de cerrado no se oculte o desborde.
- El componente completo `<AutomationLayout />` que renderiza el panel ahora vivirá dentro del `Sheet`.

---

## Fases de Implementación

### Fase 1: Creación del Ticker de Eventos (Efecto Ruleta) y el Componente Sheet
- [x] **Crear componente `AutomationTicker.tsx`**: Ubicarlo en `components/automation/AutomationTicker.tsx`.
  - Escuchará eventos de estado de automatización (vía `useAutomationWebSocket` o mediante el contexto `useAutomationJobs`), asegurando utilizar el `activeBusinessId` para filtrar los datos correspondientes a la sucursal activa.
  - Mantendrá un estado local (cola circular) guardando los últimos eventos para poder visualizarlos en pares (actual y anterior).
  - Implementará un efecto visual de "ruleta 3D" o rotación vertical usando `framer-motion` (`AnimatePresence` y `motion.div`), donde un evento nuevo parece entrar rotando y empuja al anterior "hacia el fondo".
  - Proveerá la visualización concisa del evento (ej. `[Módulo] Estado` junto con la fecha/hora formateada según zona horaria) en un pequeño contenedor con ancho máximo y `overflow-hidden`.
  - **Estilos de Ticker:** Usar fuentes y colores neutros (p. ej. `text-muted-foreground`, `bg-accent/50`, etc.) de modo que se fusione de manera sobria con el header en ambos modos (Light y Dark). Evitar fondos pesados o textos excesivamente llamativos. Sin esquinas redondeadas.
- [x] **Crear componente `AutomationSheet.tsx`**: Ubicarlo en `components/automation/AutomationSheet.tsx`.
- [x] **Estructurar el Sheet**: Implementar usando `Sheet`, `SheetTrigger` y `SheetContent` de shadcn (`components/ui/sheet.tsx`).
- [x] **Configurar el Trigger y Área Visual**:
  - Integrar en un contenedor flex el `AutomationTicker` y el botón (Trigger), logrando así una mejor UX donde se lee el último evento y se hace clic en el ícono del rayo al lado para ver el panel.
  - Usar un `Button` para el trigger con variante `secondary` o `ghost` (según armonice mejor en el header).
  - Usar la prop `size="sm"` obligatoriamente.
  - Asegurar que no tenga bordes redondeados (p. ej. anulando radius global).
  - Incluir el ícono `Zap` de lucide-react.
  - Envolver el Trigger en un `Tooltip` de shadcn con la etiqueta "Panel de Automatizaciones".
- [x] **Configurar el Content**:
  - Asignar `side="top"` al `SheetContent` para que se despliegue de arriba hacia abajo.
  - Establecer clases de tamaño (`h-[95vh]` o `h-[90vh]` y `w-full`) para asegurar que el `<AutomationLayout />` se muestre de forma correcta sin cortes en el interior.
  - Quitar esquinas redondeadas al `SheetContent`.
  - Embeber `<AutomationLayout />` en su interior.

### Fase 2: Integración en el Header
- [x] **Modificar `AdminHeader.tsx`**: Abrir `components/AdminHeader.tsx`.
- [x] **Importar y posicionar**:
  - Importar `AutomationSheet`.
  - Colocar el componente `<AutomationSheet />` en el bloque de acciones de la derecha (`<div className="flex gap-2 items-center">`).
  - Ubicarlo **exactamente antes** del bloque del botón "Reportar Novedad" (el que invoca `setFeedbackOpen(true)`).

### Fase 3: Limpieza y migración de la ruta anterior
- [x] **Eliminar el ítem del menú lateral**:
  - Abrir `const/sidebar-menu.ts`.
  - Ubicar `SIDE_AGENCY_MENU_ITEMS` y eliminar el ítem con `title: 'Automatizaciones'`, `url: '/admin/agentic/automation'` e `icon: Zap`.
- [x] **Eliminar la página**:
  - Eliminar el archivo `app/admin/agentic/automation/page.tsx` para no dejar código huérfano ni rutas duplicadas.
- [x] **Verificación**: Correr el entorno de desarrollo y verificar que el Sheet abra correctamente, que el layout interno responda bien a la altura y que no haya errores de dependencias.
