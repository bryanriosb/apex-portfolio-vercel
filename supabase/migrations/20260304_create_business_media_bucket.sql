-- Crear bucket para almacenamiento de imágenes de negocios
-- Este bucket se usará para logos, galería, imágenes de servicios, etc.

-- Insertar el bucket en la tabla storage.buckets
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'business-media',
  'business-media',
  true,
  false,
  5242880, -- 5MB en bytes
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir lectura pública de imágenes
CREATE POLICY "Allow public read access to business-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-media');

-- Política para permitir subida de imágenes a usuarios autenticados
CREATE POLICY "Allow authenticated users to upload to business-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-media' AND
  (storage.extension(name) = ANY (ARRAY['png', 'jpg', 'jpeg', 'webp', 'gif']))
);

-- Política para permitir actualización de imágenes a usuarios autenticados
CREATE POLICY "Allow authenticated users to update business-media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'business-media')
WITH CHECK (bucket_id = 'business-media');

-- Política para permitir eliminación de imágenes a usuarios autenticados
CREATE POLICY "Allow authenticated users to delete from business-media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'business-media');