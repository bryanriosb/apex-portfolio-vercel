# Plan: Carga Dinámica de Modelos desde models.dev

El campo de modelo en el formulario de edición de agentes está vacío porque la lista de modelos está hardcodeada. Se implementará la carga dinámica de modelos desde la API de models.dev.

**Estado: COMPLETADO** ✅

## Contexto

La API `https://models.dev/api.json` retorna un objeto con todos los proveedores y sus modelos. Cada proveedor tiene la estructura:
```json
{
  "provider_id": {
    "id": "provider_id",
    "name": "Provider Name",
    "models": {
      "model_id": {
        "id": "model_id",
        "name": "Model Name",
        ...
      }
    }
  }
}
```

## Scope
- **In:** Hook para obtener modelos, modificar formulario, soporte para edición
- **Out:** Cache offline, paginación de modelos

## Action items
[x] 1. Crear hook `hooks/use-models.ts` que obtenga modelos desde `https://models.dev/api.json` filtrados por proveedor
[x] 2. Modificar `components/agents/AgentFormFields.tsx` para usar el hook en lugar de la lista hardcodeada
[x] 3. Actualizar el selector de modelo para que muestre los modelos del proveedor seleccionado
[x] 4. Al editar un agente, asegurarse de que el modelo seleccionado esté en la lista cargada
[x] 5. Agregar estado de carga y manejo de errores en la carga de modelos
[x] 6. Probar que el formulario funcione correctamente al crear y editar agentes

## Archivos creados/modificados
| Acción | Archivo |
|--------|---------|
| Creado | `hooks/use-models.ts` |
| Modificado | `components/agents/AgentFormFields.tsx` |

## Funcionalidades implementadas
- Hook `useModels()` que obtiene modelos desde models.dev
- Cache en localStorage por 24 horas para evitar requests innecesarios
- Selector de proveedores expandido con más opciones (Google, Meta, Alibaba, etc.)
- Selector de modelos dinámico que carga según el proveedor seleccionado
- Estados de carga (spinner) y mensajes de error
- Soporte para edición (el modelo del agente se muestra correctamente)
