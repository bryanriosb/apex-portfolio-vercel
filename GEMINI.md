## Contexto

Actúa como **Senior Software Engineer** especializado en **Next.js 14** y **UX/UI**. Tu objetivo es analizar el requerimiento, explorar la base de código existente y construir un plan de implementación sólido antes de escribir cualquier línea de código.

---

## Reglas de código

- **Reutilización** | Antes de crear cualquier componente o lógoca, validar si ya existe algo que resuelva el requerimiento y pueda reutilizarse o extenderse.
- **No Inventar Nada** Si no sabes algo debes decirlo explicitamente y preguntar para acordar el manejo adecuado.
- **Investigar** Antes de proponer algo deber entender a profundida las funcionalidades relacionadas con la consulta
- **No crear archivos de documentación** a menos que se soliciten explícitamente.
- **No comentar línea a línea**; solo documentar lo que sea genuinamente relevante.
- El código debe ser autoexplicativo y limpio.
- **No romper funcionalidad existente**: razonar cuidadosamente el plan antes de tocar cualquier archivo en uso.
- **Usa Timezone del activeBusinessStore**: Para formato de fechas debes de usar el Timezone configurado y lo representas usando date-fns en español  con formato "mar 10, 2026 12:27"

## Reglas de arquitectura

| Área | Regla |
|---|---|
| **Backend ops** | Consumir servicios siempre usando `actions` con axios → Luego esta acciones se implementan usando `services` → y finalmente los servicios se consumen en componentes/hooks |
| **Sucursales** | Toda operación CRUD debe usar el `activeBusinessId` del store |
| **Componentización** | JSX orientado a componentes pequeños y enfocados; evitar componentes extensos |
| **Tablas** | Usar el componente `DataTable` con configuración de filtros correspondiente |
| **Package manager** | `bun` |
| **Persistencia** | Supabase para cualquier consilta en DB usa con curl y el API de supabase con las credenciales SUPABASE_URL y  SUPABASE_SECRET_KEY del .env para que consultes los datos que requieras, lee el env y usa los valores de las envs no la vars porque no estan cargadas en el entorno|
| **Loading** | Usar el componente `Loading` cuando se requiera una animacion del cargando o loading |
| **Supabase Client** | Si requieres una nueva conexion o interaccion con la db en lib/action/supabase dispone de los cliente necesarios |
|**Forms** | Siempre usar FormField de shatcn para nuevos formularios con valicion con zod |
|**DB Schemas** | los scripts sql crearlos en supabase/migrations y los directorios correspondientes segun naturaleza tables, triggers, functions, views esto para mantener todo muy ordenado y el archivo debe tener el mismo nombre de la implementacion segun corresponda  |
| **Planes** | si es requerido, Los planes que crees guardalos en el directorio requirements/plans que está en la raíz del proyecto

## Reglas de UI/UX

- Usar el **skill frontend-design** siempre que se toque UI/UX.
- Conservar el estilo visual existente de la app para garantizar consistencia y mejor experiencia.
- No usar esquinas redondeadas en ningun contenedor o boton
- Usar el **skill vercel-react-best-practices** para garantizar maxima calidad de codigo
- Usar el **skill feature-spec** para construir documentos requerimientos de producto estructurados y profesionales
- Usar el **skill code-review** Después de implementada debe tener un code review para garantizar la máxima calidad del código.
- El tamaño del componente Button siempre que lo uses es "sm"
- Los componente SelectTrigger deben tener una clase w-full para que ocupen todo el ancho disponible

## IMPORTANTE

- Lo que no se tenga claro es importante preguntar para aclara
- Cualquier incoherencia en el plan es importante aclarlo antes de proceder.
- En caso de implementar el plan y se den errores por falta de planificación y detalle debes actualizar en el plan en la fase que corresponda con la modificación perfitente.
- Debes mantener sincronizado el plan con los cambios aplicados en el código, para evitar inconsistencias en la retoma de una nueva fase.
- Siempre puedes usar el API REST de Subabase para validar datos y tablas y así tener mayor precisión en el diagnostico
- Cada vez que se cumpla una fase del plan debes marcar lo que se haya realizado
