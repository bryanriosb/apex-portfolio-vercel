# Plan

Corregir el comportamiento del Spinner y botones en Dynamic UI del chat para que: (1) solo el último `ui_response` agregado muestre el Spinner durante streaming, y (2) los botones permanezcan deshabilitados después de que el servidor reporta `done`, garantizando idempotencia en las interacciones.

## Scope
- In:
  - Corregir `isStreaming` para que solo aplique al último mensaje con `uiComponents`
  - Agregar estado de "finalizado" por mensaje para deshabilitar botones después de `done`
  - Mantener apariencia visual deshabilitada en botones procesados
- Out:
  - Modificar el comportamiento del servidor o WebSocket
  - Cambiar la estructura de tipos `ChatMessage` o `AgentState`
  - Alterar el flujo de `ui_event` / `ui_response`

## Action items
[ ] 1. Agregar campo `uiFinalized: boolean` al tipo `ChatMessage` en `lib/services/agent/types.ts`
[ ] 2. Modificar `AgentService.finalizeMessage()` en `lib/services/agent/AgentService.ts` para marcar `uiFinalized: true` cuando el mensaje tiene `uiComponents`
[ ] 3. Actualizar `GlobalChat.tsx` para calcular si un mensaje es el último con `uiComponents` y pasar `isStreaming` solo a ese mensaje
[ ] 4. Modificar `DynamicUIRenderer.tsx` para recibir prop `isDisabled` y aplicar deshabilitación visual a todos los botones cuando sea `true`
[ ] 5. Actualizar `ChatUiRenderer.tsx` para aceptar y propagar `isDisabled`
[ ] 6. Integrar `isDisabled` en `GlobalChat.tsx` basado en `uiFinalized` del mensaje
[ ] 7. Verificar con lint y typecheck

## Open questions
- Ninguno - el análisis es completo y las soluciones son directas
