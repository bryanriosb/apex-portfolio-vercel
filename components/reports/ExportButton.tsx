'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { type ExportFormat } from '@/lib/actions/report-export'

interface ExportButtonProps {
  onExport: (format: ExportFormat) => Promise<{
    success: boolean
    data?: string
    filename?: string
    error?: string
  }>
  disabled?: boolean
}

export function ExportButton({ onExport, disabled }: ExportButtonProps) {
  const [loading, setLoading] = useState<ExportFormat | null>(null)

  const handleExport = async (format: ExportFormat) => {
    setLoading(format)
    try {
      const result = await onExport(format)

      if (result.success && result.data && result.filename) {
        const blob = new Blob([result.data], {
          type: format === 'csv' 
            ? 'text/csv;charset=utf-8' 
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = result.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        console.error('Export error:', result.error)
      }
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || loading !== null}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleExport('csv')}
          disabled={loading !== null}
        >
          <FileText className="h-4 w-4 mr-2" />
          CSV
          {loading === 'csv' && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('excel')}
          disabled={loading !== null}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
          {loading === 'excel' && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
