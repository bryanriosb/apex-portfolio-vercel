'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { FileCode2, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { json } from '@codemirror/lang-json'
import { javascript } from '@codemirror/lang-javascript'
import { rust } from '@codemirror/lang-rust'
import type { Extension } from '@codemirror/state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  REFERENCE_EXTENSIONS,
  type ReferenceExtension,
  type SkillReferenceDraft,
} from '@/lib/models/agents/skill'

const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[220px] items-center justify-center border border-input">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
})

const FILENAME_BASE_REGEX = /^[a-zA-Z0-9_-]{1,64}$/

function languageFor(filename: string): Extension[] {
  switch (filename.split('.').pop()) {
    case 'json':
      return [json()]
    case 'js':
      return [javascript()]
    case 'ts':
      return [javascript({ typescript: true })]
    case 'rs':
      return [rust()]
    default:
      // md, sql, py, txt, csv, yaml: sin resaltado dedicado disponible.
      return []
  }
}

interface SkillReferencesEditorProps {
  drafts: SkillReferenceDraft[]
  onDraftsChange: (drafts: SkillReferenceDraft[]) => void
  /** Descarga el contenido de una reference ya persistida (modo edición). */
  loadContent: (filename: string) => Promise<string>
  disabled?: boolean
}

/**
 * Editor de archivos de reference de una habilidad. Cada reference es un
 * archivo real (md/json/sql/código) que se sube al bucket R2 al guardar;
 * el frontmatter `references` se sincroniza con esta lista.
 */
export function SkillReferencesEditor({
  drafts,
  onDraftsChange,
  loadContent,
  disabled = false,
}: SkillReferencesEditorProps) {
  const { resolvedTheme } = useTheme()

  const [selected, setSelected] = useState<string | null>(null)
  const [loadingFile, setLoadingFile] = useState<string | null>(null)
  const [newBaseName, setNewBaseName] = useState('')
  const [newExtension, setNewExtension] = useState<ReferenceExtension>('md')
  const [error, setError] = useState<string | null>(null)

  const selectedDraft = drafts.find((d) => d.filename === selected) ?? null

  const updateDraft = (filename: string, patch: Partial<SkillReferenceDraft>) => {
    onDraftsChange(
      drafts.map((d) => (d.filename === filename ? { ...d, ...patch } : d))
    )
  }

  const handleAdd = () => {
    setError(null)
    const base = newBaseName.trim()
    if (!FILENAME_BASE_REGEX.test(base)) {
      setError('Nombre inválido: usa 1-64 caracteres [a-zA-Z0-9_-]')
      return
    }
    const filename = `${base}.${newExtension}`
    if (drafts.some((d) => d.filename === filename)) {
      setError(`Ya existe una reference llamada ${filename}`)
      return
    }
    onDraftsChange([...drafts, { filename, content: '', dirty: true }])
    setSelected(filename)
    setNewBaseName('')
  }

  const handleEdit = async (draft: SkillReferenceDraft) => {
    setError(null)
    if (draft.content === null) {
      setLoadingFile(draft.filename)
      try {
        const content = await loadContent(draft.filename)
        updateDraft(draft.filename, { content })
      } catch {
        setError(`No se pudo cargar ${draft.filename}`)
        setLoadingFile(null)
        return
      }
      setLoadingFile(null)
    }
    setSelected(draft.filename)
  }

  const handleRemove = (filename: string) => {
    onDraftsChange(drafts.filter((d) => d.filename !== filename))
    if (selected === filename) setSelected(null)
  }

  return (
    <fieldset
      disabled={disabled}
      className="space-y-3 border border-muted p-4"
    >
      <div className="space-y-1">
        <Label>References (archivos de apoyo)</Label>
        <p className="text-xs text-muted-foreground">
          Recursos que acompañan la habilidad (.md, .json, .sql, código). Se
          suben al bucket privado al guardar y el frontmatter se sincroniza.
        </p>
      </div>

      {drafts.length > 0 && (
        <ul className="space-y-1">
          {drafts.map((draft) => (
            <li
              key={draft.filename}
              className="flex items-center justify-between gap-2 border border-muted px-2 py-1"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileCode2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{draft.filename}</span>
                {draft.dirty && (
                  <Badge variant="outline" className="text-xs">
                    pendiente de subir
                  </Badge>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleEdit(draft)}
                >
                  {loadingFile === draft.filename ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => handleRemove(draft.filename)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="nombre-del-archivo"
          className="rounded-none"
          value={newBaseName}
          onChange={(e) => setNewBaseName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
        />
        <Select
          value={newExtension}
          onValueChange={(v) => setNewExtension(v as ReferenceExtension)}
        >
          <SelectTrigger className="w-28 rounded-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REFERENCE_EXTENSIONS.map((ext) => (
              <SelectItem key={ext} value={ext}>
                .{ext}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-none"
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {selectedDraft && selectedDraft.content !== null && (
        <div className="space-y-1">
          <p className="text-xs font-medium">{selectedDraft.filename}</p>
          <CodeMirror
            value={selectedDraft.content}
            height="220px"
            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
            extensions={languageFor(selectedDraft.filename)}
            // fieldset[disabled] no afecta al contenteditable de CodeMirror:
            // el bloqueo durante el submit debe ser explícito.
            editable={!disabled}
            readOnly={disabled}
            onChange={(value) =>
              updateDraft(selectedDraft.filename, {
                content: value,
                dirty: true,
              })
            }
          />
        </div>
      )}
    </fieldset>
  )
}
