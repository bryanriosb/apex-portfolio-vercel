// Tipos de campo soportados en el formulario dinámico
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'email'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'yes_no_observation' // Campo especial: SI/NO con observación
  | 'frequency' // Campo especial: Sí/No/Ocasional con observación
  | 'measurement' // Campo especial: valor inicial y final

// Definición de un campo del formulario
export interface FormField {
  field_id: string
  label: string
  type: FormFieldType
  required: boolean
  placeholder?: string
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

// Sección del formulario
export interface FormSection {
  id: string
  title: string
  description?: string
  condition?: string // Condición para mostrar la sección (ej: "age < 18")
  fields: FormField[]
}

// Esquema completo del formulario
export interface FormTemplateSchema {
  sections: FormSection[]
}

// Interfaz principal de FormTemplate
export interface IFormTemplate {
  id: string
  business_id: string
  name: string
  description: string | null
  toon_schema: FormTemplateSchema
  is_active: boolean
  is_default: boolean
  requires_signature: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type FormTemplate = IFormTemplate

export interface FormTemplateInsert {
  business_id: string
  name: string
  description?: string | null
  toon_schema: FormTemplateSchema
  is_active?: boolean
  is_default?: boolean
  requires_signature?: boolean
  created_by?: string | null
}

export interface FormTemplateUpdate {
  name?: string
  description?: string | null
  toon_schema?: FormTemplateSchema
  is_active?: boolean
  is_default?: boolean
  requires_signature?: boolean
}

// Tipos para valores de campos dinámicos
export interface YesNoObservationValue {
  answer: 'yes' | 'no' | null
  observation?: string
}

export interface FrequencyValue {
  answer: 'yes' | 'no' | 'occasional' | null
  observation?: string
}

export interface MeasurementValue {
  initial?: number | null
  final?: number | null
}

// Tipo para los datos extendidos del medical record
export type ExtendedDataValue =
  | string
  | number
  | boolean
  | string[]
  | YesNoObservationValue
  | FrequencyValue
  | MeasurementValue
  | null
  | undefined

export type ExtendedData = Record<string, any> // Simplificado para evitar problemas de tipos
