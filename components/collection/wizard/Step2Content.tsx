'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AttachmentManager } from '@/components/collection/attachments/AttachmentManager'
import { getActiveTemplatesByTypeAction } from '@/lib/actions/collection/template'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { CollectionTemplate } from '@/lib/models/collection'
import { toast } from 'sonner'
import { EmailConfig } from './types'

interface Step2ContentProps {
  config: EmailConfig
  onChange: React.Dispatch<React.SetStateAction<EmailConfig>>
}

export function Step2Content({ config, onChange }: Step2ContentProps) {
  const { activeBusiness } = useActiveBusinessStore()
  const [templates, setTemplates] = useState<CollectionTemplate[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!activeBusiness?.business_account_id) return

      setLoading(true)
      try {
        const data = await getActiveTemplatesByTypeAction(
          activeBusiness.business_account_id,
          'email'
        )
        setTemplates(data)
      } catch (error) {
        console.error('Error fetching templates:', error)
        toast.error('Error al cargar plantillas')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [activeBusiness?.business_account_id])

  const handleTemplateChange = (templateId: string) => {
    const selected = templates.find((t) => t.id === templateId)
    onChange((prev) => ({
      ...prev,
      templateId,
      selectedTemplate: selected,
    }))
  }

  return (
    <div className="space-y-8">
      {/* Template Selection */}
      <div className="space-y-4">
        <Label>Seleccionar Plantilla de Email</Label>
        <Select
          value={config.templateId}
          onValueChange={handleTemplateChange}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={loading ? 'Cargando...' : 'Seleccione una plantilla'}
            />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {config.selectedTemplate && (
          <div className="bg-muted/50 p-4 rounded-lg border text-sm space-y-2">
            <p>
              <strong>Asunto:</strong> {config.selectedTemplate.subject}
            </p>
            <div className="text-muted-foreground line-clamp-3">
              <span className="text-xs italic">
                Vista previa del contenido no disponible en resumen
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Attachments */}
      <div className="space-y-4">
        <Label>Archivos Adjuntos (Opcional)</Label>
        <AttachmentManager
          mode="select"
          selectedIds={config.attachmentIds}
          onSelectionChange={(ids) =>
            onChange((prev) => ({ ...prev, attachmentIds: ids }))
          }
        />
      </div>
    </div>
  )
}
