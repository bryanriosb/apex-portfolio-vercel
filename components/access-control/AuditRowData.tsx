'use client'

import { useState } from 'react'
import {
  User,
  Shield,
  KeyRound,
  Building2,
  Store,
  Calendar,
  Clock,
  CircleOff,
  Hash,
  Code2,
  Check,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/components/access-control/format'
import type {
  RbacAuditLookups,
  RbacAuditPerson,
} from '@/lib/models/access-control/access-control'

/** Nombre + email de una persona; cae al UUID si no se pudo resolver. */
function personLabel(
  id: unknown,
  users: Record<string, RbacAuditPerson>
): { primary: string; secondary?: string } {
  if (typeof id !== 'string' || !id) {
    return { primary: 'Sistema' }
  }
  const person = users[id]
  if (!person) return { primary: id }
  const primary = person.name || person.email || id
  const secondary =
    person.name && person.email ? person.email : undefined
  return { primary, secondary }
}

interface FieldView {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  primary: string
  /** Detalle secundario (p. ej. el email bajo el nombre). */
  secondary?: string
  /** Estilo del valor: normal, atenuado (nulos semánticos) o código. */
  tone?: 'default' | 'muted' | 'code'
}

/**
 * Traduce un par (clave, valor) de `row_data` a una fila legible resolviendo
 * IDs contra los diccionarios. Devuelve null para campos internos que no
 * aportan a una auditoría de negocio.
 */
function describeField(
  key: string,
  value: unknown,
  tableName: string,
  lookups: RbacAuditLookups
): FieldView | null {
  switch (key) {
    case 'user_id': {
      const p = personLabel(value, lookups.users)
      return {
        key,
        label: 'Usuario',
        icon: User,
        primary: p.primary,
        secondary: p.secondary,
      }
    }
    case 'granted_by': {
      const p = personLabel(value, lookups.users)
      return {
        key,
        label: 'Otorgado por',
        icon: User,
        primary: p.primary,
        secondary: p.secondary,
      }
    }
    case 'role_id':
      return {
        key,
        label: 'Rol',
        icon: Shield,
        primary:
          (typeof value === 'string' && lookups.roles[value]) ||
          (typeof value === 'string' ? value : '—'),
      }
    case 'permission_id':
      return {
        key,
        label: 'Permiso',
        icon: KeyRound,
        primary:
          (typeof value === 'string' && lookups.permissions[value]) ||
          (typeof value === 'string' ? value : '—'),
        tone: 'code',
      }
    case 'business_account_id':
      return {
        key,
        label: 'Cuenta',
        icon: Building2,
        primary:
          (typeof value === 'string' && lookups.accounts[value]) ||
          (typeof value === 'string' ? value : '—'),
      }
    case 'business_id':
      // NULL no es un dato faltante: significa alcance de toda la cuenta.
      if (value == null) {
        return {
          key,
          label: 'Negocio',
          icon: Store,
          primary: 'Todos los negocios de la cuenta',
          tone: 'muted',
        }
      }
      return {
        key,
        label: 'Negocio',
        icon: Store,
        primary:
          (typeof value === 'string' && lookups.businesses[value]) ||
          String(value),
      }
    case 'id':
      // La PK propia solo es útil cuando podemos nombrarla.
      if (tableName === 'rbac_roles' && typeof value === 'string') {
        return {
          key,
          label: 'Rol',
          icon: Shield,
          primary: lookups.roles[value] || value,
        }
      }
      if (tableName === 'rbac_permissions' && typeof value === 'string') {
        return {
          key,
          label: 'Permiso',
          icon: KeyRound,
          primary: lookups.permissions[value] || value,
          tone: 'code',
        }
      }
      return null
    case 'name':
      return {
        key,
        label: 'Nombre',
        icon: Hash,
        primary: value == null ? '—' : String(value),
      }
    case 'description':
      if (value == null || value === '') return null
      return { key, label: 'Descripción', icon: Hash, primary: String(value) }
    case 'code':
      return {
        key,
        label: 'Código',
        icon: Code2,
        primary: value == null ? '—' : String(value),
        tone: 'code',
      }
    case 'entity':
      return {
        key,
        label: 'Entidad',
        icon: Hash,
        primary: value == null ? '—' : String(value),
      }
    case 'action':
      return {
        key,
        label: 'Acción',
        icon: Hash,
        primary: value == null ? '—' : String(value),
      }
    case 'is_system':
      return {
        key,
        label: 'Rol del sistema',
        icon: value ? Check : X,
        primary: value ? 'Sí' : 'No',
        tone: 'muted',
      }
    case 'granted_at':
      return {
        key,
        label: 'Otorgado el',
        icon: Calendar,
        primary: value ? formatDateTime(String(value)) : '—',
        tone: 'muted',
      }
    case 'created_at':
      return {
        key,
        label: 'Creado el',
        icon: Calendar,
        primary: value ? formatDateTime(String(value)) : '—',
        tone: 'muted',
      }
    case 'updated_at':
      return {
        key,
        label: 'Actualizado el',
        icon: Calendar,
        primary: value ? formatDateTime(String(value)) : '—',
        tone: 'muted',
      }
    case 'expires_at':
      return {
        key,
        label: 'Expira',
        icon: value ? Clock : CircleOff,
        primary: value ? formatDateTime(String(value)) : 'Sin expiración',
        tone: 'muted',
      }
    default:
      // Campos desconocidos: se muestran humanizando la clave, sin ocultarlos.
      if (value == null || typeof value === 'object') return null
      return {
        key,
        label: key
          .replace(/_/g, ' ')
          .replace(/^\w/, (c) => c.toUpperCase()),
        icon: Hash,
        primary: String(value),
      }
  }
}

// Orden estable y con sentido de lectura (quién, qué, dónde, cuándo).
const FIELD_ORDER = [
  'name',
  'code',
  'entity',
  'action',
  'description',
  'user_id',
  'role_id',
  'permission_id',
  'business_account_id',
  'business_id',
  'granted_by',
  'is_system',
  'granted_at',
  'created_at',
  'updated_at',
  'expires_at',
  'id',
]

function orderFields(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ia = FIELD_ORDER.indexOf(a)
    const ib = FIELD_ORDER.indexOf(b)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })
}

interface AuditRowDataProps {
  tableName: string
  rowData: Record<string, unknown>
  lookups: RbacAuditLookups
}

export function AuditRowData({
  tableName,
  rowData,
  lookups,
}: AuditRowDataProps) {
  const [showRaw, setShowRaw] = useState(false)

  const fields = orderFields(Object.keys(rowData ?? {}))
    .map((key) => describeField(key, rowData[key], tableName, lookups))
    .filter((f): f is FieldView => f !== null)

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {fields.map((field) => {
          const Icon = field.icon
          return (
            <div key={field.key} className="flex items-start gap-2.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <dt className="text-xs font-medium text-muted-foreground">
                  {field.label}
                </dt>
                <dd
                  className={
                    field.tone === 'muted'
                      ? 'text-sm text-muted-foreground'
                      : field.tone === 'code'
                        ? 'font-mono text-sm'
                        : 'text-sm font-medium'
                  }
                >
                  {field.primary}
                  {field.secondary && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {field.secondary}
                    </span>
                  )}
                </dd>
              </div>
            </div>
          )
        })}
      </dl>

      <div className="flex items-center gap-2 pt-1">
        <Badge variant="outline" className="font-mono text-[10px]">
          {tableName}
        </Badge>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-muted-foreground"
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? 'Ocultar datos técnicos' : 'Ver datos técnicos (JSON)'}
        </Button>
      </div>

      {showRaw && (
        <pre className="max-h-64 overflow-x-auto rounded-md bg-muted p-3 text-xs">
          {JSON.stringify(rowData, null, 2)}
        </pre>
      )}
    </div>
  )
}
