import type {
  MedicalRecordWithCustomer,
  MedicalRecordStatus,
  MedicalRecordType,
} from '@/lib/models/medical-record/medical-record'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  FileText, 
  Paperclip, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User,
  PenTool 
} from 'lucide-react'

const statusLabels: Record<MedicalRecordStatus, string> = {
  active: 'Activo',
  archived: 'Archivado',
  deleted: 'Eliminado',
}

const statusVariants: Record<MedicalRecordStatus, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  archived: 'secondary',
  deleted: 'destructive',
}

const recordTypeLabels: Record<MedicalRecordType, string> = {
  initial_assessment: 'Evaluación inicial',
  follow_up: 'Seguimiento',
  procedure: 'Procedimiento',
  consultation: 'Consulta',
  pre_operative: 'Pre-operatorio',
  post_operative: 'Post-operatorio',
}

const recordTypeVariants: Record<MedicalRecordType, 'default' | 'secondary' | 'outline'> = {
  initial_assessment: 'default',
  follow_up: 'secondary',
  procedure: 'default',
  consultation: 'outline',
  pre_operative: 'secondary',
  post_operative: 'secondary',
}

export const MEDICAL_RECORD_COLUMNS: ColumnDef<MedicalRecordWithCustomer>[] = [
  {
    accessorKey: 'customer',
    header: 'Paciente',
    cell: ({ row }) => {
      const customer = row.original.customer
      if (!customer) return <div className="text-muted-foreground">-</div>
      const fullName = `${customer.first_name} ${customer.last_name || ''}`.trim()
      const hasAllergies =
        row.original.allergies &&
        ((row.original.allergies.medications?.length ?? 0) > 0 ||
          (row.original.allergies.products?.length ?? 0) > 0 ||
          (row.original.allergies.other?.length ?? 0) > 0)
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{fullName}</span>
          {hasAllergies && (
            <span title="Tiene alergias">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'record_date',
    header: 'Fecha',
    cell: ({ row }) => {
      const date = row.getValue('record_date') as string
      return (
        <div className="text-sm">
          {format(new Date(date), 'dd MMM yyyy', { locale: es })}
        </div>
      )
    },
  },
  {
    accessorKey: 'record_type',
    header: 'Tipo',
    cell: ({ row }) => {
      const type = row.getValue('record_type') as MedicalRecordType
      return (
        <Badge variant={recordTypeVariants[type]}>
          {recordTypeLabels[type]}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'chief_complaint',
    header: 'Motivo de consulta',
    cell: ({ row }) => {
      const complaint = row.getValue('chief_complaint') as string | null
      if (!complaint) return <div className="text-muted-foreground">-</div>
      const truncated = complaint.length > 50 ? `${complaint.slice(0, 50)}...` : complaint
      return <div className="text-sm">{truncated}</div>
    },
  },
  {
    accessorKey: 'attachments',
    header: 'Adjuntos',
    cell: ({ row }) => {
      const attachments = row.original.attachments
      const count = attachments?.length ?? 0
      if (count === 0) return <div className="text-muted-foreground">-</div>
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Paperclip className="h-4 w-4" />
          <span>{count}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'patient_signature',
    header: 'Firma Paciente',
    cell: ({ row }) => {
      const isSigned = !!row.original.signature_data
      return (
        <div className="flex items-center gap-2">
          <Badge 
            variant={isSigned ? "default" : "secondary"} 
            className="gap-1"
          >
            {isSigned ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Firmado
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" />
                Pendiente
              </>
            )}
          </Badge>
          {isSigned && row.original.signed_by_name && (
            <span className="text-xs text-muted-foreground max-w-24 truncate" title={row.original.signed_by_name}>
              {row.original.signed_by_name}
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'specialist_signature',
    header: 'Firma Profesional',
    cell: ({ row }) => {
      const hasSpecialistSignature = !!row.original.specialist_signature_data
      return (
        <div className="flex items-center gap-2">
          <Badge 
            variant={hasSpecialistSignature ? "default" : "secondary"} 
            className="gap-1"
          >
            {hasSpecialistSignature ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Firmado
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" />
                Pendiente
              </>
            )}
          </Badge>
          {hasSpecialistSignature && row.original.specialist_signature_date && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(row.original.specialist_signature_date), 'dd/MM/yy', { locale: es })}
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.getValue('status') as MedicalRecordStatus
      return (
        <Badge variant={statusVariants[status]}>
          {statusLabels[status]}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row, table }) => {
      const record = row.original
      // Las acciones se manejarán desde el componente padre
      return (
        <div 
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {/* El componente padre inyectará las acciones aquí */}
        </div>
      )
    },
  },
]

export { recordTypeLabels, statusLabels }
