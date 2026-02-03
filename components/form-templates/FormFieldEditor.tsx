'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { FormSection, FormField as FormFieldType, FormFieldType as FieldType } from '@/lib/models/form-template/form-template'

const fieldTypes: { value: FieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Texto', description: 'Campo de texto simple' },
  { value: 'textarea', label: 'Área de Texto', description: 'Texto multilínea' },
  { value: 'number', label: 'Número', description: 'Campo numérico' },
  { value: 'date', label: 'Fecha', description: 'Selector de fecha' },
  { value: 'email', label: 'Email', description: 'Campo de correo electrónico' },
  { value: 'select', label: 'Selección', description: 'Lista desplegable' },
  { value: 'checkbox', label: 'Casilla', description: 'Casilla de verificación' },
  { value: 'radio', label: 'Radio', description: 'Botones de radio' },
  { value: 'yes_no_observation', label: 'Sí/No con Observación', description: 'Respuesta Sí/No con campo de observación' },
  { value: 'frequency', label: 'Frecuencia', description: 'Sí/No/Ocasional con observación' },
  { value: 'measurement', label: 'Medición', description: 'Valor inicial y final' },
]

const sectionSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  condition: z.string().optional(),
})

const fieldSchema = z.object({
  field_id: z.string().min(1, 'El ID es requerido'),
  label: z.string().min(1, 'La etiqueta es requerida'),
  type: z.enum(['text', 'textarea', 'number', 'date', 'email', 'select', 'checkbox', 'radio', 'yes_no_observation', 'frequency', 'measurement']),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    message: z.string().optional(),
  }).optional(),
})

type SectionFormData = z.infer<typeof sectionSchema>
type FieldFormData = z.infer<typeof fieldSchema>

interface FormFieldEditorProps {
  type: 'section' | 'field'
  data: FormSection | FormFieldType
  onSave: (updates: Partial<FormSection | FormFieldType>) => void
  onCancel: () => void
}

export default function FormFieldEditor({
  type,
  data,
  onSave,
  onCancel,
}: FormFieldEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [options, setOptions] = useState<string[]>(
    type === 'field' && (data as FormFieldType).options ? (data as FormFieldType).options! : []
  )
  const [newOption, setNewOption] = useState('')

  const isSection = type === 'section'
  const form = useForm<any>({
    resolver: zodResolver(isSection ? sectionSchema : fieldSchema),
    defaultValues: {
      ...(isSection
        ? {
            title: (data as FormSection).title,
            description: (data as FormSection).description,
            condition: (data as FormSection).condition,
          }
        : {
            field_id: (data as FormFieldType).field_id,
            label: (data as FormFieldType).label,
            type: (data as FormFieldType).type,
            required: (data as FormFieldType).required,
            placeholder: (data as FormFieldType).placeholder,
            validation: (data as FormFieldType).validation,
          }),
    },
  })

  const watchedType = isSection ? null : form.watch('type')
  const requiresOptions = watchedType === 'select' || watchedType === 'radio'

  const handleAddOption = () => {
    if (newOption.trim()) {
      setOptions(prev => [...prev, newOption.trim()])
      setNewOption('')
    }
  }

  const handleRemoveOption = (index: number) => {
    setOptions(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async (values: any) => {
    setIsSubmitting(true)
    try {
      if (requiresOptions) {
        values.options = options
      }
      await onSave(values)
    } catch (error: any) {
      console.error('Error saving:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isSection ? 'Editar Sección' : 'Editar Campo'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            {isSection ? (
              <>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título de la Sección</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: Datos Personales" />
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
                      <FormLabel>Descripción (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Describe el propósito de esta sección"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condición de Visibilidad (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ej: age < 18"
                        />
                      </FormControl>
                      <FormDescription>
                        Expresión JavaScript que determina si esta sección se muestra.
                        Usa los IDs de los campos del formulario.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="field_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID del Campo</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ej: nombre_completo"
                          />
                        </FormControl>
                        <FormDescription>
                          Identificador único interno del campo. Usa snake_case.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Etiqueta</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ej: Nombre Completo"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Campo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fieldTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div>
                                  <div className="font-medium">{type.label}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {type.description}
                                  </div>
                                </div>
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
                    name="required"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Campo Requerido</FormLabel>
                          <FormDescription>
                            Este campo debe ser completado obligatoriamente
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="placeholder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placeholder (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Texto de ayuda para el usuario"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {requiresOptions && (
                  <>
                    <Separator />
                    <div>
                      <FormLabel>Opciones del Campo</FormLabel>
                      <FormDescription>
                        Agrega las opciones que aparecerán en la lista desplegable
                      </FormDescription>
                      <div className="mt-2 space-y-2">
                        {options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input value={option} readOnly />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveOption(index)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2">
                          <Input
                            value={newOption}
                            onChange={(e) => setNewOption(e.target.value)}
                            placeholder="Nueva opción"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddOption()
                              }
                            }}
                          />
                          <Button type="button" onClick={handleAddOption}>
                            Agregar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* TODO: Agregar validaciones avanzadas */}
              </>
            )}

            <Separator />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}