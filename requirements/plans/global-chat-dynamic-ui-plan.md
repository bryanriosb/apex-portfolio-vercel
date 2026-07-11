# Plan: Integración de UI Dinámica en GlobalChat

## Objetivo

Permitir que el GlobalChat renderice componentes UI dinámicos (forms, cards, tablas, etc.) emitidos por agentes a través del WebSocket, reutilizando la infraestructura existente de `@zavora-ai/adk-ui-react` ya utilizada en `HITLFormRenderer` para el `JobDetailPanel`.

## Estado Actual

- **GlobalChat** renderiza mensajes como texto plano vía `Streamdown` (markdown)
- **`ChatMessage`** solo soporta `content: string` — sin campo para UI estructurada
- **WebSocket protocol** solo maneja: `chunk`, `reasoning_delta`, `done`, `session`, `workflow_node_start/end`, `ping/pong`
- **`HITLFormRenderer`** en automation usa `Renderer` de adk-ui-react para renderizar `UiResponse` — este es el patrón a reutilizar

## Diseño

### Protocolo WebSocket — Server → Client

El backend emite el evento `ui_response` con esta estructura:

```json
{
  "type": "ui_response",
  "payload": {
    "tool_name": "render_form",
    "payload": {
      "components": [
        { "type": "card", "title": "...", "content": [...] },
        { "type": "button", "label": "Aprobar", "action_id": "approve" }
      ],
      "theme": "light"
    }
  }
}
```

El tipo real de `UiResponse` se extrae de `payload.payload` (doble anidamiento por el envoltorio del tool).

### Protocolo WebSocket — Client → Server

El cliente envía interacciones de UI de vuelta al backend:

```json
{
  "type": "ui_event",
  "payload": {
    "action": "form_submit",
    "action_id": "form_submit",
    "data": { "payment_verified": true, "amount": 150 },
    "session_id": "sess-001"
  }
}
```

### Modelo de Mensaje

`ChatMessage` se extiende con campos opcionales para UI:

```ts
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  uiComponents?: Component[]                      // ← nuevo
  uiTheme?: 'light' | 'dark' | 'system'          // ← nuevo
  uiToolName?: string                             // ← nuevo (para tracking/debug)
  createdAt: Date
}
```

### Renderizado

- Si `message.uiComponents` existe → renderizar con `ChatUiRenderer`
- Si solo `message.content` → renderizar con `MessageResponse` (Streamdown) — comportamiento actual
- Si ambos existen → renderizar texto primero, luego los componentes UI debajo

---

## Scope

### In
- Nuevo tipo de mensaje WebSocket `ui_response` (server→client) y `ui_event` (client→server)
- Extensión de `ChatMessage` con campos UI
- `AgentService` parseo de `ui_response` y envío de `ui_event`
- Componente `ChatUiRenderer` para renderizar UI en mensajes del chat
- Integración en `GlobalChat.tsx`

### Out
- Cambios en el backend (se asume que ya envía `ui_response`)
- Cambios en `HITLFormRenderer` de automation (se reutiliza tal cual)
- Persistencia de estado de formularios entre sesiones
- Streaming de UI parcial (solo UI completa)

---

## Action Items

### Fase 1: Tipos y Protocolo
- [x] **1.1** Agregar tipo `ui_response` a `WebSocketIncomingMessage` en `lib/services/agent/types.ts`:
  ```ts
  | { type: 'ui_response'; payload: { tool_name: string; payload: UiResponse } }
  ```
- [x] **1.2** Agregar tipo `ui_event` a `WebSocketOutgoingMessage` en `lib/services/websocket/WebSocketService.ts`:
  ```ts
  | { type: 'ui_event'; payload: { action: string; action_id: string; data: Record<string, unknown>; session_id: string } }
  ```
- [x] **1.3** Extender interfaz `ChatMessage` con `uiComponents?: Component[]`, `uiTheme?: 'light' | 'dark' | 'system'` y `uiToolName?: string` en `lib/services/agent/types.ts`
- [x] **1.4** Importar tipos `Component`, `UiResponse`, `UiEvent` desde `@zavora-ai/adk-ui-react` en el archivo de tipos

### Fase 2: AgentService — Procesamiento de ui_response
- [x] **2.1** En `lib/services/agent/AgentService.ts`, agregar case `'ui_response'` en `handleMessage()`:
  - Extraer `payload.payload` (el `UiResponse` real, ya que viene anidado bajo `tool_name`)
  - Guardar `components` y `theme` en acumuladores temporales de la clase
  - Guardar `tool_name` para tracking
- [x] **2.2** Agregar propiedades privadas a la clase:
  ```ts
  private accumulatedUiComponents: Component[] | null = null
  private accumulatedUiTheme: 'light' | 'dark' | 'system' | undefined = undefined
  private accumulatedUiToolName: string | undefined = undefined
  ```
- [x] **2.3** En `finalizeMessage()`, adjuntar los componentes UI acumulados al `ChatMessage`:
  ```ts
  uiComponents: this.accumulatedUiComponents || undefined,
  uiTheme: this.accumulatedUiTheme || undefined,
  uiToolName: this.accumulatedUiToolName || undefined,
  ```
- [x] **2.4** Limpiar acumuladores en `send()` y `setConversation()` junto con `rawStreamContent` y `accumulatedContent`
- [x] **2.5** Agregar método `sendUiEvent(event: UiEvent, sessionId: string)` que envíe `{ type: 'ui_event', payload: { ...event, session_id } }` al WebSocket

### Fase 3: Componente ChatUiRenderer
- [x] **3.1** Crear `components/global-chat/ChatUiRenderer.tsx`:
  - Importar `Renderer` y tipos desde `@zavora-ai/adk-ui-react`
  - Reutilizar la lógica de `CustomComponentWrapper` de `HITLFormRenderer` (render_form/render_card custom + delegar al `Renderer`)
  - Props: `components: Component[]`, `theme?: string`, `onAction: (event: UiEvent) => void`, `toolName?: string`
  - Renderizar cada componente en un contenedor con estilo consistente con el chat
- [x] **3.2** El `onAction` callback recibe `UiEvent` y lo envía al backend vía `AgentService.sendUiEvent()`
- [x] **3.3** Manejar el caso donde los componentes se renderizan dentro del `MessageContent` con padding y estilos apropiados para el panel lateral (350-400px de ancho)
- [x] **3.4** Aplicar `rounded-none` a todos los subcomponentes internos (Input, Select, Button) según convención del proyecto

### Fase 4: Integración en GlobalChat
- [x] **4.1** En `components/global-chat/GlobalChat.tsx`, importar `ChatUiRenderer`
- [x] **4.2** Modificar el renderizado de mensajes finalizados (líneas 518-551) para detectar `message.uiComponents`:
  ```tsx
  {message.uiComponents && message.uiComponents.length > 0 ? (
    <ChatUiRenderer
      components={message.uiComponents}
      theme={message.uiTheme}
      toolName={message.uiToolName}
      onAction={handleUiAction}
    />
  ) : (
    <MessageResponse>{message.content}</MessageResponse>
  )}
  ```
- [x] **4.3** Si el mensaje tiene `content` Y `uiComponents`, renderizar ambos (texto arriba, UI abajo)
- [x] **4.4** Implementar `handleUiAction` en GlobalChat que llame a `agentService.sendUiEvent(event, sessionId)` — acceder al `agentService` instance a través de `useAgentChat` (exponer `sendUiEvent` desde el hook)
- [x] **4.5** Adaptar el layout del `ChatUiRenderer` para que quepa correctamente en el panel lateral (max-w-full, overflow handling)

### Fase 5: Exponer sendUiEvent desde useAgentChat
- [x] **5.1** En `lib/services/agent/useAgentChat.ts`, exponer `sendUiEvent` del `AgentService` como retorno del hook
- [x] **5.2** En `AgentService`, el método `sendUiEvent` debe verificar que el WebSocket esté conectado antes de enviar
- [x] **5.3** En GlobalChat, destructurar `sendUiEvent` del hook y usarlo en `handleUiAction`

### Fase 6: Validación y Edge Cases
- [x] **6.1** Verificar que mensajes con UI se persisten correctamente al recargar historial de sesiones (SessionService) — validar que `uiComponents` se incluye en la respuesta de `GET /sessions/:id/events`
- [x] **6.2** Testear que `MessageResponse` (Streamdown) no rompa cuando `content` está vacío pero `uiComponents` existe
- [x] **6.3** Verificar que los formularios dinámicos funcionan dentro del ancho limitado del panel lateral
- [x] **6.4** Manejar errores de parseo de componentes UI inválidos (fallback a texto plano con toast de warning)
- [x] **6.5** Run `bun run typecheck` y `bun run lint` para verificar calidad del código

---

## Archivos a Modificar

| Archivo | Cambio |
|---|---|
| `lib/services/agent/types.ts` | Extender `ChatMessage`, agregar `ui_response` a `WebSocketIncomingMessage` |
| `lib/services/websocket/WebSocketService.ts` | Agregar `ui_event` a `WebSocketOutgoingMessage` |
| `lib/services/agent/AgentService.ts` | Parsear `ui_response`, acumular componentes, adjuntar a mensajes, nuevo método `sendUiEvent` |
| `lib/services/agent/useAgentChat.ts` | Exponer `sendUiEvent` desde el hook |
| `components/global-chat/ChatUiRenderer.tsx` | **Nuevo** — renderer de UI dinámica para chat |
| `components/global-chat/GlobalChat.tsx` | Integrar `ChatUiRenderer` en renderizado de mensajes |

## Archivos de Referencia (no modificar)

| Archivo | Propósito |
|---|---|
| `components/automation/HITLFormRenderer.tsx` | Patrón de renderizado a reutilizar (`CustomComponentWrapper`, `CustomRenderForm`) |
| `components/ai-elements/message.tsx` | Componentes de mensaje existentes |
| `node_modules/@zavora-ai/adk-ui-react/dist/index.d.ts` | Tipos `Component`, `UiResponse`, `UiEvent`, `Renderer` |
