export interface NotificationThreshold {
  id: string
  business_id: string
  name: string
  description?: string | null
  days_from: number
  days_to?: number | null
  email_template_id: string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
  
  // Relaciones
  email_template?: {
    id: string
    name: string
    subject?: string
  }
}

export interface NotificationThresholdInsert {
  business_id: string
  name: string
  description?: string | null
  days_from: number
  days_to?: number | null
  email_template_id: string
  is_active?: boolean
  display_order?: number
}

export interface NotificationThresholdUpdate {
  name?: string
  description?: string | null
  days_from?: number
  days_to?: number | null
  email_template_id?: string
  is_active?: boolean
  display_order?: number
}
