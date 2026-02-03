'use client'

import { TemplateBuilder } from '@/components/collection/templates/builder/TemplateBuilder'
import { useParams } from 'next/navigation'

export default function EditTemplatePage() {
    const params = useParams()
    const id = params.id as string

    return (
        <TemplateBuilder id={id} />
    )
}
