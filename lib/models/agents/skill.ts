import { z } from 'zod'

export interface SkillListItem {
  name: string
  sha256: string
<<<<<<< HEAD
  /** Metadata Logic-as-Data del listado; null si el objeto está corrupto. */
  metadata?: SkillMetadata | null
}

/** Extensiones soportadas para archivos de reference (texto/datos/código). */
export const REFERENCE_EXTENSIONS = [
  'md',
  'json',
  'sql',
  'js',
  'ts',
  'py',
  'rs',
  'txt',
  'csv',
  'yaml',
] as const

export type ReferenceExtension = (typeof REFERENCE_EXTENSIONS)[number]

/**
 * Archivo de reference en edición dentro del formulario.
 * `content === null` significa "existe en R2 pero aún no se descarga";
 * `dirty` marca si debe subirse al guardar.
 */
export interface SkillReferenceDraft {
  filename: string
  content: string | null
  dirty: boolean
}

/** Operaciones de references a aplicar tras guardar la skill. */
export interface SkillReferenceOps {
  upserts: Array<{ filename: string; content: string }>
  deletions: string[]
}

/**
 * Metadata Logic-as-Data derivada del frontmatter por el backend.
 * `allowed_tools` limita el toolset del agente mientras la habilidad está
 * activa; `references` nombra recursos inyectables; `tags` alimenta el
 * scoring de selección.
 */
export interface SkillMetadata {
  description: string
  version: string | null
  tags: string[]
  allowed_tools: string[]
  references: string[]
  trigger: boolean
  hint: string | null
=======
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
}

export interface Skill {
  name: string
  content: string
<<<<<<< HEAD
  /** null si el objeto del catálogo está corrupto (el content igual llega). */
  metadata?: SkillMetadata | null
}

/** Respuesta de POST/PUT /skills: el backend devuelve la metadata parseada. */
export interface SkillWriteResponse {
  name: string
  metadata: SkillMetadata
=======
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
}

export const SKILL_NAME_REGEX = /^[a-zA-Z0-9_-]{1,128}$/

export const skillFormSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(128, 'Máximo 128 caracteres')
    .regex(
      SKILL_NAME_REGEX,
      'Solo letras, números, guiones y guiones bajos (sin espacios)'
    ),
  content: z
    .string()
    .min(1, 'El contenido es obligatorio')
    .refine((value) => value.trimStart().startsWith('---'), {
      message:
        'El contenido debe iniciar con frontmatter YAML delimitado por ---',
    })
    .refine((value) => /^\s*name\s*:/m.test(value), {
      message: 'El frontmatter debe incluir el campo name',
    })
    .refine((value) => /^\s*description\s*:/m.test(value), {
      message: 'El frontmatter debe incluir el campo description',
    }),
})

export type SkillFormValues = z.infer<typeof skillFormSchema>

export const buildSkillTemplate = (name: string) =>
  `---\nname: ${name || 'mi-habilidad'}\ndescription: Describe cuándo debe activarse esta habilidad\n---\n\nInstrucciones de la habilidad en markdown.\n`
