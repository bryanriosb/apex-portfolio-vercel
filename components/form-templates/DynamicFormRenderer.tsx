'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type {
  FormTemplateSchema,
  FormSection,
  FormField as FormFieldType,
} from '@/lib/models/form-template/form-template'

interface DynamicFormRendererProps {
  schema: FormTemplateSchema
  values: any
  onChange: (values: any) => void
  disabled?: boolean
}

export default function DynamicFormRenderer({
  schema,
  values,
  onChange,
  disabled = false,
}: DynamicFormRendererProps) {
  const handleInputChange = (fieldId: string, value: any) => {
    onChange({
      ...values,
      [fieldId]: value,
    })
  }

  const renderField = (field: FormFieldType) => {
    const fieldValue = values[field.field_id]

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'date':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.field_id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.field_id}
              type={field.type}
              placeholder={field.placeholder}
              disabled={disabled}
              value={fieldValue || ''}
              onChange={(e) =>
                handleInputChange(field.field_id, e.target.value)
              }
            />
          </div>
        )

      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.field_id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.field_id}
              placeholder={field.placeholder}
              rows={3}
              disabled={disabled}
              value={fieldValue || ''}
              onChange={(e) =>
                handleInputChange(field.field_id, e.target.value)
              }
            />
          </div>
        )

      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.field_id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={fieldValue || ''}
              onValueChange={(value) =>
                handleInputChange(field.field_id, value)
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={field.placeholder || `Selecciona ${field.label}`}
                />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case 'checkbox':
        return (
          <div className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-lg">
            <Checkbox
              id={field.field_id}
              checked={!!fieldValue}
              onCheckedChange={(checked) =>
                handleInputChange(field.field_id, checked)
              }
              disabled={disabled}
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor={field.field_id}>{field.label}</Label>
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </div>
          </div>
        )

      case 'radio':
        return (
          <div className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <RadioGroup
              value={fieldValue || ''}
              onValueChange={(value) =>
                handleInputChange(field.field_id, value)
              }
              className="flex flex-col space-y-1"
              disabled={disabled}
            >
              {field.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={option} />
                  <Label htmlFor={option}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      case 'yes_no_observation':
        const currentYesNo = fieldValue || {}
        return (
          <div className="space-y-3">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <RadioGroup
              value={currentYesNo.answer || ''}
              onValueChange={(answer) =>
                handleInputChange(field.field_id, { ...currentYesNo, answer })
              }
              className="flex flex-col space-y-2"
              disabled={disabled}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id={`${field.field_id}-yes`} />
                <Label htmlFor={`${field.field_id}-yes`}>Sí</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id={`${field.field_id}-no`} />
                <Label htmlFor={`${field.field_id}-no`}>No</Label>
              </div>
            </RadioGroup>

            {currentYesNo.answer === 'yes' && (
              <div className="grid gap-2 mt-2">
                <Label htmlFor={`${field.field_id}-obs`}>Observación</Label>
                <Textarea
                  id={`${field.field_id}-obs`}
                  placeholder="Agrega una observación si es necesario"
                  rows={2}
                  value={currentYesNo.observation || ''}
                  onChange={(e) =>
                    handleInputChange(field.field_id, {
                      ...currentYesNo,
                      observation: e.target.value,
                    })
                  }
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        )

      case 'frequency':
        const currentFreq = fieldValue || {}
        return (
          <div className="space-y-3">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <RadioGroup
              value={currentFreq.answer || ''}
              onValueChange={(answer) =>
                handleInputChange(field.field_id, { ...currentFreq, answer })
              }
              className="flex flex-col space-y-2"
              disabled={disabled}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id={`${field.field_id}-yes`} />
                <Label htmlFor={`${field.field_id}-yes`}>Sí</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id={`${field.field_id}-no`} />
                <Label htmlFor={`${field.field_id}-no`}>No</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="occasional"
                  id={`${field.field_id}-occasional`}
                />
                <Label htmlFor={`${field.field_id}-occasional`}>
                  Ocasional
                </Label>
              </div>
            </RadioGroup>

            {(currentFreq.answer === 'yes' ||
              currentFreq.answer === 'occasional') && (
              <div className="mt-2">
                <Label htmlFor={`${field.field_id}-obs`}>Observación</Label>
                <Textarea
                  id={`${field.field_id}-obs`}
                  placeholder="Agrega una observación si es necesario"
                  rows={2}
                  value={currentFreq.observation || ''}
                  onChange={(e) =>
                    handleInputChange(field.field_id, {
                      ...currentFreq,
                      observation: e.target.value,
                    })
                  }
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        )

      case 'measurement':
        const currentMeasurement = fieldValue || {}
        return (
          <div className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`${field.field_id}-initial`}>
                  Valor Inicial
                </Label>
                <Input
                  id={`${field.field_id}-initial`}
                  type="number"
                  placeholder="0.0"
                  value={currentMeasurement.initial || ''}
                  onChange={(e) =>
                    handleInputChange(field.field_id, {
                      ...currentMeasurement,
                      initial: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={disabled}
                />
              </div>
              <div>
                <Label htmlFor={`${field.field_id}-final`}>Valor Final</Label>
                <Input
                  id={`${field.field_id}-final`}
                  type="number"
                  placeholder="0.0"
                  value={currentMeasurement.final || ''}
                  onChange={(e) =>
                    handleInputChange(field.field_id, {
                      ...currentMeasurement,
                      final: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={field.field_id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.field_id}
              placeholder={field.placeholder}
              disabled={disabled}
              value={fieldValue || ''}
              onChange={(e) =>
                handleInputChange(field.field_id, e.target.value)
              }
            />
          </div>
        )
    }
  }

  if (!schema.sections || schema.sections.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay secciones configuradas en este template
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {schema.sections.map((section) => (
        <Card key={section.id} className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>{section.title}</span>
              {section.condition && (
                <Badge variant="outline" className="text-xs">
                  Condicional
                </Badge>
              )}
            </CardTitle>
            {section.description && (
              <p className="text-sm text-muted-foreground">
                {section.description}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.field_id}>{renderField(field)}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
