'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ImageIcon, Upload, X, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  onUpload: (
    file: File
  ) => Promise<{ success: boolean; url?: string; error?: string }>
  disabled?: boolean
  className?: string
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  disabled = false,
  className = '',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        return
      }

      setIsUploading(true)
      try {
        const result = await onUpload(file)
        if (result.success && result.url) {
          onChange(result.url)
        }
      } catch (error) {
        console.error('Error uploading:', error)
      } finally {
        setIsUploading(false)
      }
    },
    [onUpload, onChange]
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (disabled || isUploading) return

      const file = e.dataTransfer.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [disabled, isUploading, handleFile]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleRemove = useCallback(() => {
    onChange(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [onChange])

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {value ? (
        <div className="relative w-full h-32 rounded-lg overflow-hidden border bg-muted">
          <Image src={value} alt="Preview" fill className="object-cover" />
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && !isUploading && inputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          data-tutorial="specialist-photo-upload"
          className={`
            flex flex-col items-center justify-center w-full h-32
            border-2 border-dashed rounded-lg cursor-pointer
            transition-colors
            ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : (
            <>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted mb-2">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Arrastra o haz clic para subir
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                PNG, JPG hasta 5MB
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
