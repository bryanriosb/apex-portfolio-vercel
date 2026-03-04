'use server'

export type ExportFormat = 'csv' | 'excel'

export interface DataTableExportResult {
  success: boolean
  data?: string
  filename?: string
  error?: string
}

// NOTA: Este archivo ya no se usa para la exportación principal
// La exportación se maneja directamente en el componente DataTable
// reutilizando el service existente del DataTable
// Esto evita problemas con axios/crud y sigue el patrón de la aplicación

// Mantengo esta acción por si se necesita para casos especiales en el futuro
export async function exportDataTableLegacyAction(): Promise<DataTableExportResult> {
  return {
    success: false,
    error: 'Esta función está deprecada. Use la exportación integrada en DataTable.'
  }
}