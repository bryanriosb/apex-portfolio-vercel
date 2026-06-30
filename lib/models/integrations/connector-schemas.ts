import { z } from 'zod'

export interface ConnectorFieldDefinition {
  name: string
  label: string
  placeholder?: string
  description?: string
  type: 'text' | 'password' | 'number' | 'boolean' | 'textarea'
  required?: boolean
}

export interface ConnectorSchemaDefinition<T = any> {
  connectorId: string
  displayName: string
  schema: z.ZodSchema<T>
  fields: ConnectorFieldDefinition[]
  defaultValues: T
}

// ----------------------------------------------------
// Odoo Integration Configuration (Single Responsibility)
// ----------------------------------------------------
export interface OdooIntegrationConfig {
  url: string
  database: string
  username: string
  password?: string
}

export const odooConfigSchema = z.object({
  url: z
    .string()
    .url('Debe ser una URL válida (ej: https://odoo.example.com)')
    .min(1, 'La URL del servidor es requerida'),
  database: z.string().min(1, 'La base de datos es requerida'),
  username: z.string().min(1, 'El usuario o correo es requerido'),
  password: z.string().min(1, 'La contraseña o API Key es requerida'),
})

export const OdooIntegrationDefinition: ConnectorSchemaDefinition<OdooIntegrationConfig> = {
  connectorId: 'odoo',
  displayName: 'Odoo',
  schema: odooConfigSchema,
  defaultValues: {
    url: '',
    database: '',
    username: '',
    password: '',
  },
  fields: [
    {
      name: 'url',
      label: 'URL del Servidor',
      placeholder: 'https://odoo.example.com',
      description: 'Dirección web completa de la instancia de Odoo.',
      type: 'text',
      required: true,
    },
    {
      name: 'database',
      label: 'Base de Datos',
      placeholder: 'mi_base_de_datos',
      description: 'Nombre de la base de datos de Odoo a la que conectar.',
      type: 'text',
      required: true,
    },
    {
      name: 'username',
      label: 'Usuario / Correo Electrónico',
      placeholder: 'usuario@correo.com',
      description: 'Correo o nombre de usuario de la cuenta con acceso API.',
      type: 'text',
      required: true,
    },
    {
      name: 'password',
      label: 'Contraseña / API Key',
      placeholder: '••••••••',
      description: 'Contraseña de la cuenta o API Key generada.',
      type: 'password',
      required: true,
    },
  ],
}

// ----------------------------------------------------
// Connector Registry (Open/Closed Principle)
// ----------------------------------------------------
export const connectorSchemaRegistry: Record<string, ConnectorSchemaDefinition> = {
  odoo: OdooIntegrationDefinition,
}

/**
 * Get schema definition for a connector ID
 */
export function getConnectorSchemaDefinition(connectorId: string): ConnectorSchemaDefinition | undefined {
  if (!connectorId) return undefined
  const normalizedKey = connectorId.toLowerCase().trim()
  return connectorSchemaRegistry[normalizedKey]
}
