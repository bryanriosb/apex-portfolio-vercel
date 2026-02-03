# Supabase Storage Buckets Configuration
## Collection Module

This document describes the required Supabase Storage buckets and policies for the Collection module.

## Buckets to Create

### 1. `collection-csv-uploads`
**Purpose**: Store uploaded CSV files from executions

**Settings**:
- Public: `false`
- File Size Limit: `5 MB`
- Allowed MIME Types: `text/csv`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**Path Structure**:
```
collection-csv-uploads/
  └── {business_id}/
      └── {execution_id}/
          └── {filename}.csv
```

**Storage Policies**:
```sql
-- Allow authenticated users to upload CSV files
CREATE POLICY "Authenticated users can upload CSV files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'collection-csv-uploads');

-- Users can view their own business CSV files
CREATE POLICY "Users can view own business CSV files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'collection-csv-uploads' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM businesses
      WHERE id IN (
        SELECT business_id FROM user_businesses
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can delete their own business CSV files
CREATE POLICY "Users can delete own business CSV files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'collection-csv-uploads' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM businesses
      WHERE id IN (
        SELECT business_id FROM user_businesses
        WHERE user_id = auth.uid()
      )
    )
  );
```

---

### 2. `collection-attachments`
**Purpose**: Store reusable attachment files (PDFs, images, etc.)

**Settings**:
- Public: `false`
- File Size Limit: `10 MB`
- Allowed MIME Types: `application/pdf`, `image/png`, `image/jpeg`, `image/jpg`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

**Path Structure**:
```
collection-attachments/
  └── {business_account_id}/
      └── {attachment_id}/
          └── {filename}.{ext}
```

**Storage Policies**:
```sql
-- Allow authenticated users to upload attachments
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'collection-attachments');

-- Users can view their own business account attachments
CREATE POLICY "Users can view own business attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'collection-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT business_account_id::text FROM user_businesses
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their own business account attachments
CREATE POLICY "Users can update own business attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'collection-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT business_account_id::text FROM user_businesses
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own business account attachments
CREATE POLICY "Users can delete own business attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'collection-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT business_account_id::text FROM user_businesses
      WHERE user_id = auth.uid()
    )
  );
```

---

## Setup Instructions

### Via Supabase Dashboard

1. Go to **Storage** in your Supabase project
2. Click **Create a new bucket**
3. Create `collection-csv-uploads`:
   - Name: `collection-csv-uploads`
   - Public: Unchecked
   - File size limit: 5 MB
   - Allowed MIME types: Add the types listed above
4. Create `collection-attachments`:
   - Name: `collection-attachments`
   - Public: Unchecked
   - File size limit: 10 MB
   - Allowed MIME types: Add the types listed above
5. For each bucket, go to **Policies** tab and add the SQL policies above

### Via SQL Editor

```sql
-- Create buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'collection-csv-uploads',
    'collection-csv-uploads',
    false,
    5242880, -- 5 MB in bytes
    ARRAY['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']::text[]
  ),
  (
    'collection-attachments',
    'collection-attachments',
    false,
    10485760, -- 10 MB in bytes
    ARRAY[
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]::text[]
  )
ON CONFLICT (id) DO NOTHING;

-- Then apply the policies listed above for each bucket
```

---

## Usage in Code

### Uploading CSV
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const uploadCSV = async (file: File, businessId: string, executionId: string) => {
  const path = `${businessId}/${executionId}/${file.name}`
  
  const { data, error } = await supabase.storage
    .from('collection-csv-uploads')
    .upload(path, file)
    
  if (error) throw error
  return data.path
}
```

### Uploading Attachment
```typescript
const uploadAttachment = async (
  file: File,
  businessAccountId: string,
  attachmentId: string
) => {
  const fileExt = file.name.split('.').pop()
  const path = `${businessAccountId}/${attachmentId}/${file.name}`
  
  const { data, error } = await supabase.storage
    .from('collection-attachments')
    .upload(path, file)
    
  if (error) throw error
  return data.path
}
```

### Downloading File
```typescript
const downloadFile = async (bucket: string, path: string) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path)
    
  if (error) throw error
  return data
}
```

### Getting Public URL (for attachments in emails)
```typescript
const getPublicURL = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
    
  return data.publicUrl
}
```

---

## Notes

- CSV files are kept for audit trail, consider implementing cleanup policy for files older than 6 months
- Attachments are persistent and reusable across executions
- Make sure RLS policies align with your existing `user_businesses` table structure
- Test upload/download functionality before going to production
