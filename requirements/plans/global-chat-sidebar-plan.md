# Plan: Implementación de Chat Global y Reestructuración de Sidebar

## Fases

- [x] **Fase 1: Reestructurar el Sidebar (Menú Principal)**
  - En `const/sidebar-menu.ts`: Separar `Agencia IA` de `SIDE_APP_MENU_ITEMS` y crear un nuevo grupo `SIDE_AGENCY_MENU_ITEMS`.
  - El grupo `Agencia IA` contendrá "Conectores" y "Automatización". El link de "Chat" se elimina porque será transversal.
  - En `components/AppSidebar.tsx`: Importar el nuevo grupo y renderizar un nuevo `<NavMain label="Agencia IA" />`.
  
- [x] **Fase 2: Gestor de Estado para Chat Global**
  - Crear un store Zustand (`lib/store/global-chat-store.ts`) para manejar:
    - Estado de apertura del panel lateral (Side Agent Panel).
    - Historial o selección de sesión si es necesario que persista entre montajes.

- [x] **Fase 3: Componentizar el Chat**
  - Extraer la lógica principal y el UI de `app/admin/agentic/chat/page.tsx` a componentes reutilizables (`components/global-chat/*`).
  - **GlobalChatFooter**: Barra en la parte inferior (position relative en el footer del main layout), sin bordes redondeados. Contiene el `PromptInput`.
  - **GlobalChatPanel** (Side Agent Panel): Un "sheet" (panel lateral derecho) que se desliza o empuja el contenido, mostrando el `Conversation` y el `ChatHistory`.
  - Asegurar integración de `useAgentChat` usando el store si es necesario o manteniendo la conexión activa en un componente layout wrapper.

- [x] **Fase 4: Integración en Layout**
  - Modificar `app/admin/layout.tsx` para acomodar el `GlobalChatFooter` debajo del contenido principal, en el mismo flujo (no absolute).
  - Integrar el `GlobalChatPanel` de modo que coexista fluidamente con el contenido de la aplicación.
