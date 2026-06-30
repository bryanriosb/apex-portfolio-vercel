# Plan: Refactorización de WebSocket — Servicio Unificado + Reconexión Inteligente

## Objetivo
Unificar la lógica de WebSocket en un `WebSocketService` completo que maneje conexión, heartbeat, reconexión con countdown y max retries, y mensajes. Los hooks consumirán este servicio y agregarán lógica de dominio. Se migrarán los 3 consumidores existentes (Automation, EventBridge, GlobalChat) al nuevo enfoque.

## Contexto

### Estado actual (3 implementaciones independientes)

| Hook | Reconexión | Max retries | Countdown | Service |
|---|---|---|---|---|
| `use-automation-websocket.ts` | Fixed 5s | Infinito | No | Ninguno (raw WebSocket) |
| `useEventBridgeWebSocket.ts` | Fixed 3s | Infinito | No | Ninguno (raw WebSocket) |
| `useAgentChat` → `AgentService` | Countdown 6s | 6 | Sí | `WebSocketService` (sin reconexión) |

### Problemas
1. **Lógica duplicada**: Cada hook implementa su propia reconexión
2. **Sin límite de reintentos**: Automation y EventBridge reconectan infinitamente
3. **Sin countdown**: El usuario no ve cuándo reconectará
4. **`WebSocketService` incompleto**: Solo maneja conexión y heartbeat, no reconexión
5. **UI inconsistente**: El ticker no muestra estados de conexión

### Arquitectura objetivo

```
WebSocketService (clase)
├── connect() / disconnect()
├── send() / sendRaw()
├── heartbeat (ping/pong)
├── reconnect (countdown + max retries)
├── connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
├── reconnectAttempt / reconnectCountdown
└── onStatusChange callback

Hooks (consumidores)
├── useAutomationWebSocket → consume service, filtra eventos de jobs
├── useEventBridgeWebSocket → consume service, maneja eventos EventBridge
└── useAgentChat → consume service, maneja streaming de agentes
```

---

## Archivos involucrados

### Archivos a modificar
- `lib/services/websocket/WebSocketService.ts` — Expandir con reconexión, countdown, estados
- `lib/services/websocket/index.ts` — Exportar tipos nuevos
- `hooks/use-automation-websocket.ts` — Refactorizar para usar `WebSocketService`
- `hooks/use-automation-jobs.ts` — Exponer `reconnectAttempt`, `reconnectCountdown`
- `hooks/useEventBridgeWebSocket.ts` — Migrar a `WebSocketService`
- `components/automation/AutomationTicker.tsx` — Mostrar estados de conexión
- `components/automation/AutomationSheet.tsx` — Pasar estados de conexión al ticker
- `components/EventBridgeMonitor.tsx` — Adaptar a nuevos tipos de `useEventBridgeWebSocket`
- `lib/services/agent/AgentService.ts` — Migrar a usar `WebSocketService` para reconexión
- `lib/services/agent/useAgentChat.ts` — Simplificar lógica de reconexión (delegar al service)

### Archivos a crear
- Ninguno nuevo (se expande `WebSocketService` existente)

---

## Fases de Implementación

### Fase 1: Expandir `WebSocketService` con reconexión completa ✅

**Archivo:** `lib/services/websocket/WebSocketService.ts`

- [x] Agregar tipo `ConnectionStatus`: `'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'`
  - [x] Agregar interface `ReconnectionOptions`:
  ```ts
  interface ReconnectionOptions {
    maxRetries: number;        // default: 10
    countdownSeconds: number;  // default: 10
    baseDelay: number;         // default: 1000 (para backoff exponencial opcional)
  }
  ```
- [x] Agregar interface `WebSocketServiceCallbacks` extendida:
  ```ts
  interface WebSocketServiceCallbacks {
    onOpen?: () => void;
    onClose?: (event: CloseEvent) => void;
    onMessage?: (data: string) => void;
    onError?: (error: Event) => void;
    onPong?: () => void;
    onStatusChange?: (status: ConnectionStatus) => void;
    onReconnectAttempt?: (attempt: number, countdown: number) => void;
  }
  ```
- [x] Agregar propiedades internas:
  ```ts
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectAttempt = 0;
  private reconnectCountdown = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectionOptions: ReconnectionOptions;
  private intentionalDisconnect = false;
  private urlBuilder: () => string | Promise<string>; // Lazy URL construction
  ```
- [x] Modificar constructor para aceptar `urlBuilder` (función que construye URL de forma lazy) en lugar de URL estática, y `ReconnectionOptions` opcionales
- [x] Implementar método `private reconnect()`: lógica de reconexión con countdown (6→0), max retries, y callbacks de estado
- [x] Implementar método `private startCountdown()`: inicia timer de countdown y notifica via `onReconnectAttempt`
- [x] Implementar método `private stopCountdown()`: limpia timers de reconexión
- [x] Implementar método `private updateStatus(status)`: actualiza estado y notifica via `onStatusChange`
- [x] Modificar `connect()`: usar `urlBuilder` para obtener URL, manejar estado `'connecting'`, resetear `reconnectAttempt` en éxito, limpiar socket en estado `CLOSING` para evitar que el reintentó se atasque en `0 s`
- [x] Modificar `disconnect()`: marcar `intentionalDisconnect = true`, limpiar timers de reconexión, cerrar WebSocket
- [x] Modificar `onclose`: limpiar `this.ws = null` y si no es disconnect intencional, iniciar reconexión
- [x] Agregar getters públicos: `getStatus()`, `getReconnectAttempt()`, `getReconnectCountdown()`
- [x] Agregar método `isIntentionalDisconnect()`: para que hooks puedan verificar si la desconexión fue intencional

### Fase 2: Actualizar exportaciones del service ✅

**Archivo:** `lib/services/websocket/index.ts`

- [x] Exportar tipo `ConnectionStatus`
- [x] Exportar interface `ReconnectionOptions`
- [x] Exportar interface `WebSocketServiceCallbacks` (ya existe como `WebSocketCallbacks`, extender)

### Fase 3: Refactorizar `useAutomationWebSocket` ✅

**Archivo:** `hooks/use-automation-websocket.ts`

- [x] Importar `WebSocketService` y tipos
- [x] Eliminar toda la lógica manual de reconexión (refs de timeout, `connect()` recursivo)
  - [x] Crear instancia de `WebSocketService` con:
    - `urlBuilder`: función async que obtiene ticket via `getAuthTicket()` y construye URL
    - `callbacks.onMessage`: filtro de eventos `data.job_id && data.new_status` → llama a `onEvent`
    - `callbacks.onStatusChange`: actualiza estado local
    - `reconnectionOptions`: `{ maxRetries: 10, countdownSeconds: 10 }`
  - [x] Retornar: `{ isConnected, connectionStatus, reconnectAttempt, reconnectCountdown, maxRetries }`
- [x] Cleanup: llamar `service.disconnect()` en unmount

### Fase 4: Actualizar `useAutomationJobs` ✅

**Archivo:** `hooks/use-automation-jobs.ts`

- [x] Extraer `reconnectAttempt`, `reconnectCountdown`, `maxRetries` del hook `useAutomationWebSocket`
- [x] Agregar al return: `reconnectAttempt`, `reconnectCountdown`, `connectionStatus`, `maxRetries`

### Fase 5: Migrar `useEventBridgeWebSocket` ✅

**Archivo:** `hooks/useEventBridgeWebSocket.ts`

- [x] Importar `WebSocketService` y tipos
- [x] Eliminar lógica manual de reconexión, heartbeat, y manejo de WebSocket
- [x] Crear instancia de `WebSocketService` con:
  - `urlBuilder`: función async que obtiene `WEBSOCKET_URL` y `WEBSOCKET_API_KEY` via `getEnv()`
  - `callbacks.onMessage`: parseo de eventos EventBridge, filtro de pong
  - `callbacks.onStatusChange`: actualiza estado
  - `reconnectionOptions`: `{ maxRetries: 10, countdownSeconds: 5 }`
- [x] Retornar: `{ events, isConnected, connectionStatus, reconnectAttempt, reconnectCountdown, reconnect, disconnect, setEvents }`
- [x] Actualizar tipos en `types/eventbridge.ts` si es necesario

### Fase 6: Actualizar `EventBridgeMonitor` ✅

**Archivo:** `components/EventBridgeMonitor.tsx`

- [x] Adaptar a los nuevos campos retornados por `useEventBridgeWebSocket` (si hay cambios en la interface)

### Fase 7: Migrar `AgentService` para usar `WebSocketService` con reconexión ✅

**Archivo:** `lib/services/agent/AgentService.ts`

- [x] Eliminar la creación directa de `WebSocketService` en `connect()`
- [x] Recibir `WebSocketService` como dependencia inyectada (o crear con configuración de reconexión)
  - [x] Configurar `reconnectionOptions: { maxRetries: 10, countdownSeconds: 10 }`
  - [x] Configurar callbacks de `onStatusChange` y `onReconnectAttempt`
- [x] Eliminar lógica manual de `isConnecting` flag (el service la maneja)
- [x] Exponer `getConnectionStatus()`, `getReconnectAttempt()`, `getReconnectCountdown()`

### Fase 8: Simplificar `useAgentChat` ✅

**Archivo:** `lib/services/agent/useAgentChat.ts`

- [x] Eliminar lógica de reconexión manual (`reconnectAttempt`, `reconnectCountdown`, `countdownTimerRef`, `intentionalDisconnectRef`)
- [x] Obtener `reconnectAttempt` y `reconnectCountdown` directamente del `AgentService` (que a su vez los obtiene del `WebSocketService`)
- [x] Simplificar el `useEffect` de reconexión (ya no necesita manejar countdown)
- [x] Mantener `connect()`, `disconnect()`, `reconnect()` como wrappers del service

### Fase 9: Actualizar UI del Ticker ✅

**Archivo:** `components/automation/AutomationTicker.tsx`

- [x] Agregar props: `isConnected`, `reconnectAttempt`, `reconnectCountdown`, `maxRetries`
- [x] Implementar 4 estados visuales:
  - `!isConnected && reconnectAttempt === 0`: Mostrar "Conectando..." con dot animado gris
  - `reconnectAttempt > 0`: Mostrar "Reconectando - Intento {attempt} de {maxRetries}  {countdown} s" con dot pulsante (estilo PromptInput)
  - `isConnected && events.length === 0`: Mostrar "Sin actividad reciente" con RadioOff
  - `isConnected && events.length > 0`: Mostrar eventos como actualmente
- [x] Usar dot indicator consistente con `GlobalChat.tsx`:
  ```tsx
  // Reconectando
  <span className="relative flex items-center justify-center h-3 w-3">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-500 opacity-80" />
    <span className="relative inline-flex h-2 w-2 rounded-full bg-muted-foreground" />
  </span>
  // Conectado
  <div className="h-2 w-2 rounded-full bg-primary" />
  // Desconectado
  <div className="h-2 w-2 rounded-full bg-red-500" />
  ```

### Fase 10: Actualizar `AutomationSheet` ✅

**Archivo:** `components/automation/AutomationSheet.tsx`

  - [x] Extraer `reconnectAttempt`, `reconnectCountdown`, `maxRetries` de `automationState`
  - [x] Pasar `isConnected`, `reconnectAttempt`, `reconnectCountdown`, `maxRetries` como props a `<AutomationTicker />`
- [x] Actualizar el tooltip del indicador de conexión para reflejar el estado real

### Fase 11: Validación

- [x] Ejecutar `bun run lint` — verificar que no hay errores
- [x] Ejecutar `bunx tsc --noEmit` — verificar tipos (ignorar errores pre-existentes en test files)
- [ ] Verificar manualmente en el browser:
  - Automation ticker muestra "Conectando..." al cargar
  - Al conectar, muestra eventos o "Sin actividad reciente"
  - Al perder conexión, muestra "Reconectando - Intento X de {maxRetries}  Y s"
  - Al reconectarse, vuelve a mostrar eventos
  - El indicador dot cambia de color correctamente
- [ ] Verificar que EventBridge monitor sigue funcionando
- [ ] Verificar que GlobalChat sigue funcionando con reconexión
- [x] El default de reconexión es 10 intentos cada 10 segundos y es configurable por inyección

---

## Fase 12: Fix crítico — timeout de conexión y estado atascado en "Conectando..." 🚨

### Problema reportado
El WebSocket de Automation (y potencialmente GlobalChat) se queda ocasionalmente en estado **"Conectando..."** indefinidamente. Al recargar la página conecta correctamente. Esto indica que la conexión inicial se atasca en `WebSocket.CONNECTING` sin disparar `onopen`, `onerror` ni `onclose`.

### Causas identificadas en `WebSocketService.ts`
1. **Sin timeout de conexión**: `new WebSocket(url)` puede permanecer en estado `CONNECTING` durante minutos si el servidor no responde el handshake, hay problemas de red, DNS lentos, o proxies/firewalls que dropean el tráfico WebSocket. El navegador no cierra la conexión por sí solo en un tiempo útil.
2. **Estado `connecting` bloqueante**: `connect()` retorna temprano si `this.connectionStatus === 'connecting'`, por lo que incluso si se invoca reconexión manual, no se crea un nuevo socket mientras el anterior esté "conectando".
3. **No hay detección de conexión muerta (dead connection)**: el heartbeat envía `ping` pero no verifica si llegó `pong`; una conexión TCP abierta pero sin actividad real puede parecer viva cuando ya está muerta.
4. **En GlobalChat**, al cambiar el modo `simple` ↔ `workflow`, el `AgentService` se recrea con una nueva URL/agente, pero el `useEffect` de `GlobalChat.tsx` solo depende de `userId` y `businessAccountId`, por lo que no reconecta automáticamente ante ese cambio.

### Cambios a realizar

#### 1. `lib/services/websocket/WebSocketService.ts`
- [x] Agregar opción `connectionTimeoutMs` (default: `10000`) al constructor / `WebSocketServiceOptions`.
- [x] Agregar timer privado `connectionTimeoutTimer`.
- [x] En `connect()`:
  - Iniciar `connectionTimeoutTimer` justo después de crear `new WebSocket(resolvedUrl)`.
  - En `onopen`, limpiar el timeout.
  - Si el timeout vence:
    - Cerrar el socket forzosamente (`ws.close()` o `ws.terminate()` equivalente en browser).
    - Limpiar `this.ws = null`.
    - Invocar `handleConnectionFailure()` para iniciar la reconexión con countdown.
- [x] Agregar opción `heartbeatTimeoutMs` (default: `35000`).
- [x] Agregar timer privado `heartbeatTimeoutTimer` y `lastPongReceivedAt`.
- [x] En `onmessage`, si llega un `pong` (o el mensaje definido como pong), actualizar `lastPongReceivedAt` y limpiar/reiniciar el timeout.
- [x] En `startHeartbeat()`:
  - Al enviar cada ping, iniciar `heartbeatTimeoutTimer`.
  - Si vence sin recibir pong, cerrar el socket y forzar reconexión.
- [x] En `stopHeartbeat()`, limpiar también `heartbeatTimeoutTimer`.
- [x] En `connect()`, cambiar la lógica de guarda de `CONNECTING`:
  - Si `connect()` se llama explícitamente y hay un socket atascado en `CONNECTING`, cerrarlo y crear uno nuevo.
- [x] Resetear `intentionalDisconnect = false` al inicio de `connect()`.
- [x] Asegurar que en `disconnect()` se limpien todos los timers (connection timeout, heartbeat, countdown).

#### 2. `lib/services/agent/AgentService.ts`
- [x] Asegurar que `connect()` limpia cualquier instancia previa de `WebSocketService` antes de crear una nueva.

#### 3. `components/global-chat/GlobalChat.tsx`
- [x] Actualizar el `useEffect` de conexión para que dependa también de `agentMode`:
  ```ts
  useEffect(() => {
    if (!userId || !businessAccountId) return
    connect()
    return () => disconnect()
  }, [connect, disconnect, userId, businessAccountId, agentMode])
  ```
- [x] Esto garantiza reconexión inmediata al cambiar entre agente simple y workflow.

#### 4. `hooks/use-automation-websocket.ts`
- [x] Verificar que el hook reaccione correctamente a reconexiones forzadas por timeout; no requirió cambios.

### Validación de la fase 12
- [x] Ejecutar `bun run lint` — sin errores.
- [x] Ejecutar `bunx tsc --noEmit` — errores solo en archivos de test pre-existentes.
- [x] Ejecutar tests existentes (`bun run test:run __tests__/agentic/services/AgentService.test.ts`) — falla pre-existente no relacionada.
- [ ] Verificar manualmente:
  - Simular servidor WebSocket lento/no disponible y confirmar que no se queda en "Conectando..." más de ~10 s.
  - Confirmar que inicia countdown de reconexión tras timeout.
  - Confirmar que GlobalChat reconecta al cambiar de modo simple ↔ workflow.
  - Confirmar que Automation reconecta si se pierde conexión.

---

## Notas de implementación

### `WebSocketService` — Diseño del URL Builder

El `urlBuilder` permite construir la URL de forma lazy (al momento de conectar), lo cual es necesario porque:
- Automation necesita obtener un ticket JWT fresco antes de cada conexión
- EventBridge necesita leer variables de entorno
- El ticket puede expirar y necesitar renovación

  ```ts
  // Ejemplo de uso en automation
  const service = new WebSocketService({
    urlBuilder: async () => {
      const { ticket } = await getAuthTicket();
      const url = new URL(`${selectedEnvironment.APEX_WS_URL}/automation`);
      url.searchParams.set('token', ticket);
      return url.toString();
    },
    heartbeatInterval: 30000,
    heartbeatMessage: { type: 'Ping' },
    reconnection: { maxRetries: 10, countdownSeconds: 10 },
    callbacks: { onMessage, onStatusChange, onReconnectAttempt },
  });
  ```

### Backoff exponencial (futuro)

El plan incluye `baseDelay` en `ReconnectionOptions` para soportar backoff exponencial en el futuro. Por ahora se usa countdown fijo (como en GlobalChat), pero la infraestructura estará lista.

### Separación de responsabilidades

| Capa | Responsabilidad |
|---|---|
| `WebSocketService` | Conexión, heartbeat, reconexión, estados, envío/recepción |
| Hooks (`useAutomationWebSocket`, etc.) | Filtrado de mensajes, transformación de datos, integración con stores |
| Componentes (`AutomationTicker`, etc.) | UI, presentación visual de estados |
