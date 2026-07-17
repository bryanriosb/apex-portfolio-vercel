import { dump, load } from 'js-yaml'

/**
 * Campos Logic-as-Data editables desde el panel estructurado del formulario.
 * El markdown `content` sigue siendo la única fuente de verdad: estos
 * helpers leen y reescriben su frontmatter sin duplicar estado.
 *
 * Las reescrituras son quirúrgicas: solo se tocan las líneas de las claves
 * gestionadas (`tags`, `allowed-tools`, `references`, `name`); el resto del
 * frontmatter se preserva byte a byte (un `version: 1.0` sin comillas jamás
 * se re-serializa como número).
 */
export interface SkillLogicFields {
  tags: string[]
  allowedTools: string[]
  references: string[]
}

const FRONTMATTER_RE = /^\s*---\r?\n([\s\S]*?)\r?\n---(\r?\n?)([\s\S]*)$/

const MANAGED_KEYS: Array<[key: string, field: keyof SkillLogicFields]> = [
  ['tags', 'tags'],
  ['allowed-tools', 'allowedTools'],
  ['references', 'references'],
]

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

interface ParsedFrontmatter {
  data: Record<string, unknown>
  rawYaml: string
  separator: string
  body: string
}

function loadFrontmatter(content: string): ParsedFrontmatter | null {
  const match = FRONTMATTER_RE.exec(content)
  if (!match) return null
  try {
    const data = load(match[1])
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return null
    }
    return {
      data: data as Record<string, unknown>,
      rawYaml: match[1],
      separator: match[2],
      body: match[3],
    }
  } catch {
    return null
  }
}

/** Elimina la línea de una clave top-level y sus líneas de bloque indentadas. */
function removeTopLevelKey(yamlText: string, key: string): string {
  const keyRe = new RegExp(`^${key.replace(/-/g, '\\-')}\\s*:`)
  const out: string[] = []
  let inRemovedBlock = false
  for (const line of yamlText.split('\n')) {
    if (inRemovedBlock && /^[ \t]/.test(line)) continue
    inRemovedBlock = false
    if (keyRe.test(line)) {
      inRemovedBlock = true
      continue
    }
    out.push(line)
  }
  return out.join('\n')
}

function rebuild(parsed: ParsedFrontmatter, rawYaml: string): string {
  return `---\n${rawYaml}\n---${parsed.separator}${parsed.body}`
}

/**
 * Extrae tags / allowed-tools / references del frontmatter.
 * Devuelve null si el frontmatter falta o no es YAML válido (el panel se
 * deshabilita y el usuario sigue editando en markdown).
 */
export function parseSkillLogicFields(content: string): SkillLogicFields | null {
  const parsed = loadFrontmatter(content)
  if (!parsed) return null
  return {
    tags: toStringArray(parsed.data.tags),
    allowedTools: toStringArray(parsed.data['allowed-tools']),
    references: toStringArray(parsed.data.references),
  }
}

/**
 * Reescribe solo las claves Logic-as-Data del frontmatter preservando las
 * demás líneas tal cual. Las listas vacías eliminan su clave. Devuelve null
 * si el contenido no tiene frontmatter parseable.
 */
export function updateSkillLogicFields(
  content: string,
  fields: SkillLogicFields
): string | null {
  const parsed = loadFrontmatter(content)
  if (!parsed) return null

  let yamlText = parsed.rawYaml
  const additions: string[] = []
  for (const [key, field] of MANAGED_KEYS) {
    yamlText = removeTopLevelKey(yamlText, key)
    const clean = fields[field].map((v) => v.trim()).filter(Boolean)
    if (clean.length > 0) {
      // dump por clave: quoting YAML seguro para valores con caracteres
      // especiales, sin re-serializar el resto del frontmatter.
      additions.push(dump({ [key]: clean }, { lineWidth: -1 }).trimEnd())
    }
  }

  const merged = [yamlText.trimEnd(), ...additions]
    .filter((section) => section.length > 0)
    .join('\n')
  return rebuild(parsed, merged)
}

/**
 * Reescribe solo la lista `references` del frontmatter (las rutas derivan de
 * los archivos del editor: `references/<filename>`). Devuelve null si el
 * frontmatter no es parseable.
 */
export function updateSkillReferencesList(
  content: string,
  references: string[]
): string | null {
  const fields = parseSkillLogicFields(content)
  if (!fields) return null
  return updateSkillLogicFields(content, { ...fields, references })
}

/**
 * Sincroniza la clave `name` del frontmatter con el nombre del formulario
 * sin tocar el resto del contenido (modo creación). Devuelve null si el
 * frontmatter no es parseable.
 */
export function updateSkillFrontmatterName(
  content: string,
  name: string
): string | null {
  const parsed = loadFrontmatter(content)
  if (!parsed) return null

  const nameLine = dump({ name }, { lineWidth: -1 }).trimEnd()
  const rawYaml = /^name\s*:/m.test(parsed.rawYaml)
    ? parsed.rawYaml.replace(/^name\s*:.*$/m, nameLine)
    : `${nameLine}\n${parsed.rawYaml}`
  return rebuild(parsed, rawYaml)
}
