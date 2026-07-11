'use client'

import { useParams } from 'next/navigation'
import { WorkflowFlowEditor } from '@/components/workflows/WorkflowFlowEditor'

export default function EditFlowPage() {
  const params = useParams()
  const id = params.id as string

  return <WorkflowFlowEditor id={id} />
}
