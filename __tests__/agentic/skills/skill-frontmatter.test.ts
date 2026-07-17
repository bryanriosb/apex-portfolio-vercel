import { describe, expect, it } from 'vitest'
import {
  parseSkillLogicFields,
  updateSkillFrontmatterName,
  updateSkillLogicFields,
  updateSkillReferencesList,
} from '@/lib/models/agents/skill-frontmatter'

const FULL_SKILL = `---
name: seguimiento-facturas
description: Persigue facturas vencidas con tono cordial
version: "1.1.0"
tags:
  - cobranza
  - facturas
allowed-tools:
  - odoo_invoice_lookup
  - send_email
references:
  - references/guia-tono.md
---

Instrucciones de la habilidad.
`

const MINIMAL_SKILL = `---
name: mi-habilidad
description: Describe cuándo debe activarse esta habilidad
---

Instrucciones de la habilidad en markdown.
`

describe('parseSkillLogicFields', () => {
  it('extrae tags, allowed-tools y references del frontmatter', () => {
    const fields = parseSkillLogicFields(FULL_SKILL)
    expect(fields).toEqual({
      tags: ['cobranza', 'facturas'],
      allowedTools: ['odoo_invoice_lookup', 'send_email'],
      references: ['references/guia-tono.md'],
    })
  })

  it('devuelve listas vacías cuando las claves no existen', () => {
    expect(parseSkillLogicFields(MINIMAL_SKILL)).toEqual({
      tags: [],
      allowedTools: [],
      references: [],
    })
  })

  it('devuelve null sin frontmatter o con YAML inválido', () => {
    expect(parseSkillLogicFields('sin frontmatter')).toBeNull()
    expect(parseSkillLogicFields('---\n: [invalido\n---\ncuerpo')).toBeNull()
  })
})

describe('updateSkillLogicFields', () => {
  it('agrega claves nuevas preservando las existentes y el cuerpo', () => {
    const updated = updateSkillLogicFields(MINIMAL_SKILL, {
      tags: ['cobranza'],
      allowedTools: ['send_email'],
      references: [],
    })
    expect(updated).not.toBeNull()
    expect(updated).toContain('name: mi-habilidad')
    expect(updated).toContain(
      'description: Describe cuándo debe activarse esta habilidad'
    )
    expect(updated).toContain('Instrucciones de la habilidad en markdown.')

    const roundtrip = parseSkillLogicFields(updated!)
    expect(roundtrip).toEqual({
      tags: ['cobranza'],
      allowedTools: ['send_email'],
      references: [],
    })
    expect(updated).not.toContain('references:')
  })

  it('elimina la clave cuando la lista queda vacía', () => {
    const updated = updateSkillLogicFields(FULL_SKILL, {
      tags: [],
      allowedTools: ['odoo_invoice_lookup'],
      references: [],
    })
    expect(updated).not.toBeNull()
    expect(updated).not.toContain('tags:')
    expect(updated).not.toContain('references:')
    expect(parseSkillLogicFields(updated!)).toEqual({
      tags: [],
      allowedTools: ['odoo_invoice_lookup'],
      references: [],
    })
    // Las claves ajenas al panel no se tocan.
    expect(updated).toContain('version:')
  })

  it('descarta entradas en blanco y devuelve null sin frontmatter', () => {
    const updated = updateSkillLogicFields(MINIMAL_SKILL, {
      tags: ['  ', 'valida'],
      allowedTools: [],
      references: [],
    })
    expect(parseSkillLogicFields(updated!)?.tags).toEqual(['valida'])

    expect(
      updateSkillLogicFields('sin frontmatter', {
        tags: [],
        allowedTools: [],
        references: [],
      })
    ).toBeNull()
  })

  it('es idempotente en un roundtrip parse → update', () => {
    const fields = parseSkillLogicFields(FULL_SKILL)!
    const updated = updateSkillLogicFields(FULL_SKILL, fields)!
    expect(parseSkillLogicFields(updated)).toEqual(fields)
  })

  it('preserva byte a byte las claves no gestionadas (sin re-serializar YAML)', () => {
    const skill = `---
name: mi-habilidad
description: >
  Descripción en bloque
  de varias líneas
version: 1.0
---
Cuerpo.
`
    const updated = updateSkillLogicFields(skill, {
      tags: ['nueva'],
      allowedTools: [],
      references: [],
    })!
    // `version: 1.0` NO debe convertirse en el número 1 ni perder formato,
    // y el bloque de description debe quedar intacto.
    expect(updated).toContain('version: 1.0')
    expect(updated).toContain('description: >')
    expect(updated).toContain('  Descripción en bloque')
    expect(parseSkillLogicFields(updated)?.tags).toEqual(['nueva'])
  })
})

describe('updateSkillReferencesList', () => {
  it('sincroniza solo la lista references preservando tags y allowed-tools', () => {
    const updated = updateSkillReferencesList(FULL_SKILL, [
      'references/guia-tono.md',
      'references/datos.json',
    ])!
    expect(parseSkillLogicFields(updated)).toEqual({
      tags: ['cobranza', 'facturas'],
      allowedTools: ['odoo_invoice_lookup', 'send_email'],
      references: ['references/guia-tono.md', 'references/datos.json'],
    })

    const cleared = updateSkillReferencesList(updated, [])!
    expect(parseSkillLogicFields(cleared)?.references).toEqual([])
    expect(cleared).not.toContain('references:')
  })
})

describe('updateSkillFrontmatterName', () => {
  it('reemplaza solo la línea name preservando el resto', () => {
    const withFields = updateSkillLogicFields(MINIMAL_SKILL, {
      tags: ['cobranza'],
      allowedTools: ['send_email'],
      references: [],
    })!
    const renamed = updateSkillFrontmatterName(withFields, 'seguimiento')!
    expect(renamed).toContain('name: seguimiento')
    expect(parseSkillLogicFields(renamed)).toEqual({
      tags: ['cobranza'],
      allowedTools: ['send_email'],
      references: [],
    })
  })

  it('agrega la clave name cuando no existe y quotea valores especiales', () => {
    const noName = `---\ndescription: algo\n---\ncuerpo`
    const renamed = updateSkillFrontmatterName(noName, 'mi-skill')!
    expect(renamed.startsWith('---\nname: mi-skill\n')).toBe(true)

    expect(updateSkillFrontmatterName('sin frontmatter', 'x')).toBeNull()
  })
})
