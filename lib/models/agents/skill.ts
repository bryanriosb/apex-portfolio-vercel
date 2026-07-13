import { z } from 'zod'

export interface SkillListItem {
  name: string
  sha256: string
}

export interface Skill {
  name: string
  content: string
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
