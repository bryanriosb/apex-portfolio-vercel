export interface BusinessGalleryImage {
  id: string
  business_id: string
  image_url: string
  caption?: string | null
  sort_order?: number
}

export interface BusinessGalleryImageInsert {
  business_id: string
  image_url: string
  caption?: string | null
  sort_order?: number
}

export interface BusinessGalleryImageUpdate {
  image_url?: string
  caption?: string | null
  sort_order?: number
}
