// Collection Attachment Models
export interface CollectionAttachment {
    id: string
    business_account_id: string

    // Metadata
    name: string
    description?: string | null
    file_type?: string | null
    file_size_bytes?: number | null

    // Storage
    storage_path: string
    storage_bucket: string

    // Status
    is_active: boolean

    created_at: string
    updated_at: string
}

export interface CollectionAttachmentInsert {
    business_account_id: string
    name: string
    description?: string | null
    file_type?: string | null
    file_size_bytes?: number | null
    storage_path: string
    storage_bucket?: string
    is_active?: boolean
}

export interface CollectionAttachmentUpdate {
    name?: string
    description?: string | null
    is_active?: boolean
    storage_path?: string
}
