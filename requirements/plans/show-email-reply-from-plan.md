# Plan de Implementación: Mostrar remitente en JobCard para email_reply

Este plan detalla los pasos para mostrar el campo `from` debajo del nombre del trabajo en el componente `JobCard` cuando el `input_state` contenga un correo de respuesta (`email_reply`).

---

## Fases de Implementación

### Fase 1: Análisis y Extracción de Datos

- [x] **1. Identificar la estructura de `input_state`**
  - El campo `input_state` en `JobItem` (específicamente en `AgentWorkflowJob`) puede venir como un string JSONificado.
  - Se utilizará `safeParseJSON` para parsearlo de forma segura.
  - Se extraerá el valor del campo `from` si el objeto parseado contiene la clave `email_reply` (ya sea como objeto que tiene `from` adentro o como propiedad simple con `from` en el nivel raíz del `input_state`).

- [x] **2. Importar utilidades necesarias en `JobCard.tsx`**
  - Importar `safeParseJSON` desde `@/lib/services/automation/automation-types`.
  - Importar el icono `Mail` de `lucide-react` para usarlo junto al remitente.

---

### Fase 2: Modificación de la Interfaz (UI)

- [x] **3. Renderizar el remitente en `JobCard.tsx`**
  - Justo debajo del nombre del trabajo, agregar un bloque condicional que verifique si existe un remitente de email (`emailReplyFrom`).
  - Usar la misma estructura y clases de Tailwind CSS que la fecha de programación (`scheduled_at`):

    ```tsx
    {emailReplyFrom && (
      <div className="flex items-center gap-1 text-xs text-muted-foreground w-full min-w-0">
        <Mail className="w-2.5 h-2.5 flex-shrink-0" />
        <span className="truncate block flex-1">{emailReplyFrom}</span>
      </div>
    )}
    ```

  - Mantener los estilos existentes para asegurar que no se introduzcan esquinas redondeadas (`rounded-none`).

---

### Fase 3: Validación y Control de Calidad

- [x] **4. Verificar compilación y lint**
  - Ejecutar verificación de tipos y sintaxis.
  - Realizar una revisión visual/de código (code review) para certificar que el diseño mantiene consistencia estética premium y se apega a las reglas de UI/UX.
