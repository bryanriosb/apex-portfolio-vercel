// Collection Template Models
export type TemplateType = 'email' | 'sms' | 'whatsapp'

export interface CollectionTemplate {
    id: string
    business_account_id: string

    // Metadata
    name: string
    description?: string | null
    template_type: TemplateType

    // Content
    subject?: string | null
    content_html?: string | null
    content_plain: string

    // Available variables
    available_variables: Record<string, string>

    // Status
    is_active: boolean

    created_at: string
    updated_at: string
}

export interface CollectionTemplateInsert {
    business_account_id: string
    name: string
    description?: string | null
    template_type: TemplateType
    subject?: string | null
    content_html?: string | null
    content_plain: string
    available_variables?: Record<string, string>
    is_active?: boolean
}

export interface CollectionTemplateUpdate {
    name?: string
    description?: string | null
    subject?: string | null
    content_html?: string | null
    content_plain?: string
    available_variables?: Record<string, string>
    is_active?: boolean
}

// Default variables available in all templates
export const DEFAULT_TEMPLATE_VARIABLES = {
    nombre_cliente: 'Nombre completo del cliente',
    empresa: 'Nombre de la empresa',
    email: 'Email del cliente',
    telefono: 'Teléfono del cliente',
    nit: 'NIT del cliente',
    monto_pendiente: 'Monto pendiente de pago',
    numero_factura: 'Número de factura',
    fecha_vencimiento: 'Fecha de vencimiento',
    dias_mora: 'Días de mora',
} as const
