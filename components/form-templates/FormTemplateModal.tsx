'use client'

import { useState, useCallback } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Plus, GripVertical, Trash2, Edit } from 'lucide-react'
import { toast } from 'sonner'
import type { FormTemplate, FormTemplateInsert, FormTemplateUpdate, FormTemplateSchema, FormSection, FormField as FormFieldType } from '@/lib/models/form-template/form-template'
import FormFieldEditor from '@/components/form-templates/FormFieldEditor'

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  is_default: z.boolean(),
  requires_signature: z.boolean(),
  toon_schema: z.any().optional(), // Se maneja por separado
})

type FormData = z.infer<typeof formSchema>

interface FormTemplateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: FormTemplate | null
  businessId: string
  onSave: (data: FormTemplateInsert | FormTemplateUpdate, templateId?: string) => Promise<void>
}

const DEFAULT_SCHEMA: FormTemplateSchema = {
  sections: [
    {
      id: 'datos_personales',
      title: 'Datos Personales',
      fields: [
        {
          field_id: 'nombre_completo',
          label: 'Nombre Completo',
          type: 'text',
          required: true,
        },
        {
          field_id: 'documento',
          label: 'Documento de Identidad',
          type: 'text',
          required: true,
        },
        {
          field_id: 'telefono',
          label: 'Teléfono',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      id: 'datos_clinicos',
      title: 'Datos Clínicos',
      fields: [
        {
          field_id: 'motivo_consulta',
          label: 'Motivo de Consulta',
          type: 'textarea',
          required: true,
        },
        {
          field_id: 'alergias',
          label: '¿Tiene alergias conocidas?',
          type: 'yes_no_observation',
          required: true,
        },
      ],
    },
  ],
}

export default function FormTemplateModal({
  open,
  onOpenChange,
  template,
  businessId,
  onSave,
}: FormTemplateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [schema, setSchema] = useState<FormTemplateSchema>(
    template?.toon_schema || DEFAULT_SCHEMA
  )
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<{ sectionId: string; field: FormFieldType } | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: template?.name || '',
      description: template?.description || '',
      is_default: template?.is_default || false,
      requires_signature: template?.requires_signature ?? true,
    },
  })

  const handleSave = async (values: FormData) => {
    setIsSubmitting(true)
    try {
      const templateData: FormTemplateInsert | FormTemplateUpdate = {
        ...values,
        business_id: businessId,
        toon_schema: schema,
      }

      await onSave(templateData, template?.id)
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el template')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addSection = () => {
    const newSection: FormSection = {
      id: `section_${Date.now()}`,
      title: 'Nueva Sección',
      fields: [],
    }
    setSchema(prev => ({
      sections: [...prev.sections, newSection],
    }))
  }

  const updateSection = (sectionId: string, updates: Partial<FormSection>) => {
    setSchema(prev => ({
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      ),
    }))
  }

  const deleteSection = (sectionId: string) => {
    setSchema(prev => ({
      sections: prev.sections.filter(section => section.id !== sectionId),
    }))
  }

  const addField = (sectionId: string) => {
    const newField: FormFieldType = {
      field_id: `field_${Date.now()}`,
      label: 'Nuevo Campo',
      type: 'text',
      required: false,
    }
    setSchema(prev => ({
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, fields: [...section.fields, newField] }
          : section
      ),
    }))
  }

  const updateField = (sectionId: string, fieldId: string, updates: Partial<FormFieldType>) => {
    setSchema(prev => ({
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.map(field =>
                field.field_id === fieldId ? { ...field, ...updates } : field
              ),
            }
          : section
      ),
    }))
  }

  const deleteField = (sectionId: string, fieldId: string) => {
    setSchema(prev => ({
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.filter(field => field.field_id !== fieldId),
            }
          : section
      ),
    }))
  }

  const moveField = (sectionId: string, fromIndex: number, toIndex: number) => {
    setSchema(prev => ({
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              fields: (() => {
                const newFields = [...section.fields]
                const [movedField] = newFields.splice(fromIndex, 1)
                newFields.splice(toIndex, 0, movedField)
                return newFields
              })(),
            }
          : section
      ),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Editar Template' : 'Crear Template'}
          </DialogTitle>
          <DialogDescription>
            {template
              ? 'Edita la configuración del template de historia clínica'
              : 'Crea un nuevo template para tus historias clínicas'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Información Básica</TabsTrigger>
            <TabsTrigger value="schema">Estructura del Formulario</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Form {...form}>
              <form className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: Historia Clínica Estética" />
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
                          {...field}
                          placeholder="Describe para qué tipo de procedimientos es este template"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="is_default"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Template por Defecto</FormLabel>
                          <FormDescription>
                            Este será el template usado automáticamente al crear nuevas historias
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

                  <FormField
                    control={form.control}
                    name="requires_signature"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Requiere Firma</FormLabel>
                          <FormDescription>
                            Las historias creadas con este template requerirán firma del paciente
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
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="schema" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Secciones del Formulario</h3>
              <Button onClick={addSection} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Sección
              </Button>
            </div>

            <div className="space-y-4">
              {schema.sections.map((section, sectionIndex) => (
                <Card key={section.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <CardTitle className="text-base">{section.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSection(section.id)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSection(section.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium">Campos</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addField(section.id)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Agregar Campo
                        </Button>
                      </div>

                      {section.fields.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No hay campos en esta sección
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {section.fields.map((field, fieldIndex) => (
                            <div
                              key={field.field_id}
                              className="flex items-center justify-between p-3 border rounded-md bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                                <div>
                                  <p className="font-medium text-sm">{field.label}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {field.type}
                                    </Badge>
                                    {field.required && (
                                      <Badge variant="secondary" className="text-xs">
                                        Requerido
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingField({ sectionId: section.id, field })}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteField(section.id, field.field_id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={form.handleSubmit(handleSave)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : template ? 'Actualizar' : 'Crear'}
          </Button>
        </div>

        {/* Modales de edición */}
        {editingSection && (
          <FormFieldEditor
            type="section"
            data={schema.sections.find(s => s.id === editingSection)!}
            onSave={(updates: any) => {
              updateSection(editingSection, updates)
              setEditingSection(null)
            }}
            onCancel={() => setEditingSection(null)}
          />
        )}

        {editingField && (
          <FormFieldEditor
            type="field"
            data={editingField.field}
            onSave={(updates: any) => {
              updateField(editingField.sectionId, editingField.field.field_id, updates)
              setEditingField(null)
            }}
            onCancel={() => setEditingField(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}