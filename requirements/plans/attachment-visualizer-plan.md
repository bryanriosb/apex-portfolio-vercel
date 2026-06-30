# Plan de Implementación: Visor de Archivos Adjuntos en HITL Panel

## Resumen

Este plan detalla los pasos para integrar un visor de archivos adjuntos (imágenes y PDFs) dentro del componente `JobDetailPanel` (HITL Panel). Los archivos provienen de un bucket de Cloudflare R2 (`apex-artifacts`) y la integración se hará obteniendo URLs firmadas del servidor, protegiendo así las credenciales.

---

## [x] Fase 1: Instalación y Configuración del SDK

**Objetivo:** Habilitar la conexión con Cloudflare R2 mediante el SDK de AWS S3 para Node.js.

- [x] Instalar las dependencias necesarias de AWS usando `bun`:

  ```bash
  bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
  ```

- [x] Validar la existencia de las variables en el `.env`:
  - `S3_ACCESS_ID`
  - `S3_SECRET_KEY`
  - `S3_URL_API` (Ej: `https://5957f57442a2b12ac03d75ad42c2b474.r2.cloudflarestorage.com`)
  - (Opcional) Asegurarse que el nombre del bucket `apex-artifacts` sea constante o agregar `S3_BUCKET_NAME`.

---

## [x] Fase 2: Implementación de Servicio y Server Action (Backend)

**Objetivo:** Crear la lógica en el servidor para generar URLs temporales de acceso a los archivos privados.

- [x] Crear el servicio `lib/services/automation/s3-attachments.ts`:
  - Inicializar `S3Client` apuntando al endpoint de R2 (`S3_URL_API`) e inyectando las credenciales.
  - Exportar una función `getPresignedUrls(paths: string[])` que itere sobre los paths para generar los links firmados (con `GetObjectCommand` y `getSignedUrl` con validez de 1 hora).
- [x] Crear el Server Action `getPresignedAttachmentsAction` (puede estar en `lib/actions/automation/attachments.ts` o añadido en `automation.ts`):
  - Consumir el servicio interno validando la sesión o permisos del usuario y devolver las URLs pre-firmadas generadas.

---

## [x] Fase 3: Creación del componente `AttachmentViewer`

**Objetivo:** Crear el componente UI que recibirá los paths, consumirá la action y renderizará los documentos.

- [x] Crear el componente `components/automation/AttachmentViewer.tsx`.
- [x] **Logica de estado:**
  - Recibir el array de `paths` de R2 por props.
  - Disparar un `useEffect` que llame a `getPresignedAttachmentsAction` y guarde las URLs resueltas.
  - Utilizar el componente `Loading` (existente) para manejar la espera.
- [x] **Renderizado de Archivos:**
  - Identificar la extensión por la URL final (`.pdf`, `.png`, `.jpg`, etc.).
  - **Imágenes:** Usar un elemento `<img>` nativo.
  - **PDFs:** Embeber mediante un `<object>` o `<iframe>` con clase `w-full h-[500px]`.
- [x] **Reglas UI/UX:**
  - Asegurar la clase `rounded-none` en contenedores de vista previa, botones para cambiar de archivo, o miniaturas.
  - El tamaño del componente Button siempre que lo uses es "sm".

---

## [x] Fase 4: Integración en el `JobDetailPanel` (HITL Panel)

**Objetivo:** Hacer visible el `AttachmentViewer` dentro de las opciones del trabajo cuando corresponda.

- [x] Modificar `components/automation/JobDetailPanel.tsx` en el renderizado principal.
- [x] **Detección:** En el objeto parseado `inputState` (que proviene de `job.input_state`), buscar si existe `attachment_names` o `atachment_names` (array de strings).
- [x] **Nueva Sección de Visualización:**
  - Opción A: Añadir una nueva Pestaña `<TabsTrigger value="attachments">` junto a "Contexto del Trabajo".
  - Opción B: Integrarlo como un nuevo elemento interactivo `<AccordionItem value="attachments">` justo debajo del JSON del trabajo.
  - Al abrirse, renderizar `<AttachmentViewer paths={attachmentNames} />`.

---

## [ ] Fase 5: Pruebas y Pulido Visual

**Objetivo:** Validar que la solución cumpla con los estándares técnicos y de diseño.

- [ ] Validar que un Job real con datos de R2 resuelva correctamente las firmas de S3 sin errores de CORS.
- [ ] Revisar consistencia en el diseño (Botones tamaño "sm", sin bordes redondeados, paleta de colores coherente con `HITLFormRenderer`).
- [ ] Hacer revisión (Code Review final) asegurando no haber roto la funcionalidad de reanudar workflow (`resumeWorkflowAction`).
