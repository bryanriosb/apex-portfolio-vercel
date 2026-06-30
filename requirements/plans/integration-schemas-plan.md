# Plan - Esquemas de Configuración de Integraciones y Formulario Dinámico

Rediseñar el formulario de configuración de integraciones para utilizar esquemas estructurados con validación en español por defecto (empezando por Odoo), permitiendo opcionalmente alternar a la vista JSON en crudo mediante un botón, aplicando principios SOLID para mantener la extensibilidad del sistema.

## Scope
- **In**:
  - Definición de tipos y esquemas de validación Zod en español para integraciones (Odoo como primer caso).
  - Estructuración extensible (SOLID) mediante un registro de esquemas de conectores.
  - Modificación de `IntegrationConfigForm.tsx` para renderizar el formulario estructurado por defecto.
  - Implementación de un botón de alternancia (toggle) para cambiar entre formulario estructurado y vista JSON en crudo.
  - Sincronización automática bidireccional de datos entre ambos modos antes del envío.
  - Aplicación de restricciones de diseño: sin esquinas redondeadas (`rounded-none`), botones tamaño `"sm"`, y `SelectTrigger` con ancho completo (`w-full`).
- **Out**:
  - Creación de nuevos endpoints de API o migraciones de bases de datos.
  - Implementación de esquemas detallados para otros conectores no especificados (se usará fallback JSON).

## Action items
- [x] **Definición de Tipos y Esquemas**: Crear `lib/models/integrations/connector-schemas.ts` que implemente la abstracción de esquemas de conector y defina `OdooIntegrationConfig` junto a su esquema y metadatos en español.
- [x] **Registro de Esquemas**: Configurar un mapa indexador de esquemas por `connector_id` para cumplir con el principio de Abierto/Cerrado (OCP), facilitando la adición de futuros conectores sin tocar la UI.
- [x] **Actualización del Formulario**: Modificar `components/integrations/IntegrationConfigForm.tsx` para incorporar el estado del conector activo y cargar dinámicamente sus campos estructurados.
- [x] **Mapeador de Estado**: Implementar lógica para sincronizar los valores del formulario estructurado dinámico con el campo `config_json` de react-hook-form al alternar vistas y al enviar.
- [x] **Botón de Alternancia**: Agregar un botón tipo toggle discreto (`size="sm"`, `variant="outline"`, `rounded-none`) para alternar a la vista JSON.
- [x] **Validación y Estilo**: Garantizar que todos los nuevos componentes creados sigan las directrices de UX/UI (`rounded-none`, botones `"sm"`, triggers de selección `w-full`).
- [x] **Pruebas de Integración**: Validar el funcionamiento del flujo de creación/edición, asegurando que las cargas útiles JSON enviadas a la API sean válidas y correctas.

## Open questions
- *Ninguna por el momento.*
