'use client'

import { useState, useEffect } from 'react'
import { BuilderHeader } from './BuilderHeader'
import { VariablesSidebar } from './VariablesSidebar'
import { PreviewDialog } from './PreviewDialog'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { TemplateService } from '@/lib/services/collection'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { TemplateType } from '@/lib/models/collection/template'

const EmailEditor = dynamic(
    () => import('./EmailEditor').then((mod) => mod.EmailEditor),
    { ssr: false, loading: () => <div className="h-[500px] flex items-center justify-center border dark:border-gray-800 m-5 dark:bg-gray-950 dark:text-white">Cargando editor...</div> }
)

export function TemplateBuilder({ id }: { id?: string }) {
    const router = useRouter()
    const { activeBusiness } = useActiveBusinessStore()

    const [templateName, setTemplateName] = useState('')
    const [description, setDescription] = useState('')
    const [templateType, setTemplateType] = useState<TemplateType>('email')
    const [subject, setSubject] = useState('')
    const [content, setContent] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [editorInstance, setEditorInstance] = useState<any>(null)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(!!id)

    // Cargar datos si estamos editando
    useEffect(() => {
        if (!id) return

        const loadTemplate = async () => {
            try {
                const template = await TemplateService.getTemplate(id)
                setTemplateName(template.name)
                setDescription(template.description || '')
                setTemplateType(template.template_type)
                setSubject(template.subject || '')
                setContent(template.content_html || '')
            } catch (error) {
                toast.error('Error al cargar la plantilla')
                router.push('/admin/collection/templates')
            } finally {
                setIsLoading(false)
            }
        }

        loadTemplate()
    }, [id, router])

    const handleInsertVariable = (variable: string, isRaw: boolean = false) => {
        if (editorInstance) {
            const content = isRaw ? variable : `{{${variable}}} `
            editorInstance.chain().focus().insertContent(content).run()
        } else {
            toast.error('El editor no está listo')
        }
    }

    const handleSave = async () => {
        if (!templateName.trim()) {
            toast.error('Ingresa un nombre para la plantilla')
            return
        }
        if (!subject.trim()) {
            toast.error('Ingresa el asunto del correo')
            return
        }
        if (!content.trim() || content === '<p></p>') {
            toast.error('El contenido no puede estar vacío')
            return
        }
        if (!activeBusiness?.business_account_id) {
            toast.error('No se ha seleccionado una cuenta de negocio')
            return
        }

        try {
            setIsSaving(true)

            if (id) {
                // Actualizar plantilla existente
                await TemplateService.updateTemplate(id, {
                    name: templateName,
                    description,
                    template_type: templateType,
                    subject,
                    content_html: content,
                    content_plain: editorInstance?.getText() || '',
                })
                toast.success('Plantilla actualizada correctamente')
            } else {
                // Crear nueva plantilla
                await TemplateService.saveTemplate({
                    business_account_id: activeBusiness.business_account_id,
                    name: templateName,
                    description,
                    subject,
                    content_html: content,
                    content_plain: editorInstance?.getText() || '',
                    template_type: templateType,
                    is_active: true
                })
                toast.success('Plantilla guardada correctamente')
            }

            router.push('/admin/collection/templates')
        } catch (error: any) {
            console.error('Error saving template:', error)
            toast.error('Error al guardar la plantilla')
        } finally {
            setIsSaving(false)
        }
    }

    const handlePreview = () => {
        setPreviewOpen(true)
    }

    if (isLoading) {
        return <div className="h-screen flex items-center justify-center dark:bg-gray-950 dark:text-white">Cargando plantilla...</div>
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
            <BuilderHeader
                templateName={templateName}
                onNameChange={setTemplateName}
                onSave={handleSave}
                onPreview={handlePreview}
                isSaving={isSaving}
            />

            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto min-w-0">
                    <div className="max-w-5xl mx-auto p-6">
                        <EmailEditor
                            subject={subject}
                            content={content}
                            onSubjectChange={setSubject}
                            onContentChange={setContent}
                            onEditorReady={setEditorInstance}
                            businessId={activeBusiness?.business_account_id || ''}
                        />
                    </div>
                </div>
                <VariablesSidebar
                    onInsertVariable={handleInsertVariable}
                    content={content}
                    description={description}
                    onDescriptionChange={setDescription}
                    templateType={templateType}
                    onTemplateTypeChange={setTemplateType}
                />
            </div>

            <PreviewDialog
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                subject={subject}
                content={content}
            />
        </div>
    )
}
