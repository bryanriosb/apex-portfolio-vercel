'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { LifeBuoy, Upload, X, CheckCircle } from 'lucide-react'
import { feedbackService } from '@/lib/services/feedback'
import {
  CreateFeedback,
  FeedbackType,
  FeedbackSeverity,
} from '@/lib/models/feedback'
import Loading from '../ui/loading'

const formSchema = z.object({
  type: z.enum([
    'bug_report',
    'feature_request',
    'general_feedback',
    'complaint',
  ]),
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(255, 'El título no puede exceder 255 caracteres'),
  description: z.string().min(1, 'La descripción es requerida'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
})

type FormData = z.infer<typeof formSchema>

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
  userId: string
}

export function FeedbackDialog({
  open,
  onOpenChange,
  businessId,
  userId,
}: FeedbackDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'general_feedback',
      title: '',
      description: '',
      severity: 'medium',
    },
  })

  const resetForm = () => {
    form.reset()
    setUploadedFiles([])
    setError(null)
    setSubmitted(false)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files].slice(0, 5)) // Max 5 files
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // In a real implementation, you would upload files to a storage service
      // For now, we'll just simulate it
      const attachmentUrls: string[] = []

      // TODO: Implement file upload to storage service
      // for (const file of uploadedFiles) {
      //   const url = await uploadFile(file)
      //   attachmentUrls.push(url)
      // }

      const feedbackData: CreateFeedback = {
        ...data,
        priority:
          data.severity === 'critical'
            ? 5
            : data.severity === 'high'
              ? 4
              : data.severity === 'medium'
                ? 3
                : 2,
        attachment_urls: attachmentUrls,
        metadata: {
          files_count: uploadedFiles.length,
          file_names: uploadedFiles.map((f) => f.name),
        },
      }

      const result = await feedbackService.createFeedback(
        businessId,
        feedbackData,
        userId
      )

      if (result.success) {
        setSubmitted(true)
        setTimeout(() => {
          resetForm()
          onOpenChange(false)
        }, 2000)
      } else {
        setError(result.error || 'Error al enviar el reporte')
      }
    } catch (err) {
      setError('Error inesperado. Por favor intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTypeOptions = [
    { value: 'bug_report', label: '🐛 Reportar Error' },
    { value: 'feature_request', label: '💡 Sugerencia' },
    { value: 'general_feedback', label: '💬 Comentario' },
    { value: 'complaint', label: '⚠️ Queja' },
  ]

  const getSeverityOptions = [
    { value: 'low', label: 'Baja', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'Media', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical', label: 'Crítica', color: 'bg-red-100 text-red-800' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5" />
            Reportar Novedad
          </DialogTitle>
          <DialogDescription>
            Ayúdanos a mejorar reportando cualquier problema, sugerencia o
            comentario.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              ¡Reporte enviado!
            </h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              Gracias por tu feedback. Nos pondremos en contacto contigo pronto
              si es necesario.
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Reporte</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Breve descripción del problema"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe detalladamente el problema, sugerencia o comentario..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severidad</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona severidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getSeverityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <Badge className={option.color}>
                                {option.label}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Upload */}
              {/* <div className="space-y-2">
                <FormLabel>Archivos adjuntos (máximo 5)</FormLabel>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    disabled={uploadedFiles.length >= 5}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`flex flex-col items-center justify-center cursor-pointer ${
                      uploadedFiles.length >= 5
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      {uploadedFiles.length >= 5
                        ? 'Máximo de archivos alcanzado'
                        : 'Click para subir archivos o arrastra aquí'}
                    </span>
                    <span className="text-xs text-gray-400">
                      Imágenes, PDF, Word (máx. 5MB por archivo)
                    </span>
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      Archivos seleccionados:
                    </div>
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm truncate flex-1">
                          {file.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div> */}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm()
                    onOpenChange(false)
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loading className="text-white" />
                      Enviando
                    </span>
                  ) : (
                    'Enviar Reporte'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
