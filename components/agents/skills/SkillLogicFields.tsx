'use client'

import { useEffect, useMemo, useState } from 'react'
import { useWatch, type Control } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { TagsSelector } from '@/components/TagsSelector'
import {
  parseSkillLogicFields,
  updateSkillLogicFields,
  type SkillLogicFields as LogicFields,
} from '@/lib/models/agents/skill-frontmatter'
import type { SkillFormValues } from '@/lib/models/agents/skill'
import { ToolsService } from '@/lib/services/agents/tools-service'

interface SkillLogicFieldsProps {
  /** Control del formulario: el panel se suscribe solo a `content`. */
  control: Control<SkillFormValues>
  onContentChange: (content: string) => void
  disabled?: boolean
}

interface LogicFieldProps {
  label: string
  description: string
  children: React.ReactNode
}

function LogicField({ label, description, children }: LogicFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

/**
 * Panel Logic-as-Data: edita tags, allowed-tools y references reescribiendo
 * el frontmatter del `content` (sin estado paralelo). Si el frontmatter no
 * es parseable, el panel se deshabilita y se edita en markdown directamente.
 */
export function SkillLogicFields({
  control,
  onContentChange,
  disabled = false,
}: SkillLogicFieldsProps) {
  const content = useWatch({ control, name: 'content' }) ?? ''
  const fields = useMemo(() => parseSkillLogicFields(content), [content])

  const [toolNames, setToolNames] = useState<string[]>([])
  const [toolsError, setToolsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    new ToolsService()
      .listTools()
      .then((tools) => {
        if (cancelled) return
        setToolNames(
          tools.filter((tool) => tool.is_active).map((tool) => tool.name)
        )
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.error('SkillLogicFields: fallo al cargar tools', err)
          setToolsError(
            err instanceof Error ? err.message : 'Error inesperado'
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!fields) {
    return (
      <p className="border border-dashed border-muted-foreground/40 p-3 text-xs text-muted-foreground">
        Frontmatter no parseable: edita tags, allowed-tools y references
        directamente en el markdown. El backend valida al guardar.
      </p>
    )
  }

  const apply = (patch: Partial<LogicFields>) => {
    const updated = updateSkillLogicFields(content, { ...fields, ...patch })
    if (updated !== null) {
      onContentChange(updated)
    }
  }

  return (
    <fieldset
      disabled={disabled}
      className="flex flex-col gap-4 border border-muted p-4"
    >
      <div className="space-y-1">
        <p className="text-sm font-medium">Logic-as-Data</p>
        <p className="text-xs text-muted-foreground">
          Controla el comportamiento del agente desde la metadata: estos
          campos se escriben en el frontmatter del contenido.
        </p>
      </div>

      <LogicField
        label="Herramientas permitidas (allowed-tools)"
        description="Barrera de seguridad: el agente solo podrá usar estas herramientas mientras la habilidad esté activa. Vacío = sin restricción."
      >
        <TagsSelector
          value={fields.allowedTools}
          onChange={(allowedTools) => apply({ allowedTools })}
          existingTags={toolNames}
          createNew={false}
          placeholder="Agregar herramienta del catálogo..."
        />
        {toolsError && (
          <p className="text-xs text-destructive">
            No se pudo cargar el catálogo de herramientas ({toolsError});
            puedes escribir los nombres en el frontmatter manualmente.
          </p>
        )}
      </LogicField>

      <LogicField
        label="Tags"
        description="Sinónimos y categorías para el scoring de selección (+2.0)."
      >
        <TagsSelector
          value={fields.tags}
          onChange={(tags) => apply({ tags })}
          placeholder="Agregar tag..."
        />
      </LogicField>
    </fieldset>
  )
}
