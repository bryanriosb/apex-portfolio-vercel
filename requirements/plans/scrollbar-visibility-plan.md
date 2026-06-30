# Plan: Forzar visibilidad permanente de la barra de desplazamiento en KanbanColumn

Este plan detalla los cambios necesarios para que la columna Kanban (`KanbanColumn`) muestre de forma permanente la barra de desplazamiento vertical cuando hay suficiente contenido para requerir scroll, en lugar de mostrarla únicamente al pasar el puntero (hover).

## Análisis de la base de código

1. **Componente afectado**: `components/automation/KanbanColumn.tsx`
2. **Componente de scroll utilizado**: `ScrollArea` (importado de `@/components/ui/scroll-area`)
3. **Mapeo de propiedades**: El componente `ScrollArea` de Shadcn/Radix encapsula `ScrollAreaPrimitive.Root` y propaga sus propiedades (`...props`).
4. **Propiedad de visibilidad**: Radix UI `ScrollArea` maneja la visibilidad con la propiedad `type`. Por defecto, Radix usa `"hover"`.
   - Modificando la propiedad a `type="always"`, la barra de desplazamiento se mostrará de forma permanente siempre que el contenido desborde el contenedor.

## Plan de Acción

### Fase 1: Modificar KanbanColumn

- [x] Editar `components/automation/KanbanColumn.tsx`.
- [x] Añadir la propiedad `type="always"` al componente `<ScrollArea>` en la línea 24.

### Fase 2: Validación y Pruebas

- [ ] Verificar que la barra de desplazamiento sea visible constantemente en las columnas con scroll activo (ej. PENDING, RUNNING, ACTION REQUIRED) sin necesidad de pasar el puntero por encima.
- [ ] Ejecutar el análisis de código para asegurar que no haya errores de compilación ni lints rotos (`bun run lint`).
