'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Upload,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  Download,
  Loader2,
  BrushCleaning,
  ShieldAlert,
  MailX,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { fetchCustomersByNitsAction } from '@/lib/actions/collection/wizard'
import { getCollectionConfigAction } from '@/lib/actions/collection/config'
import { filterBlacklistedEmailsAction } from '@/lib/actions/blacklist'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { CampaignInfoSidebar } from './CampaignInfoSidebar'
import { FileData, TEMPLATE_DATA, GroupedClient } from './types'

interface Step1ContentProps {
  fileData: FileData | null
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  fileInputRef: React.RefObject<HTMLInputElement>
  activeBusinessId?: string
  onDataUpdate: (data: FileData | null) => void
  campaignName: string
  campaignDescription: string
  onCampaignNameChange: (value: string) => void
  onCampaignDescriptionChange: (value: string) => void
}

// Componente para mostrar correos con vista expandible
function EmailCell({ client }: { client: GroupedClient }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Cliente completamente descartado (blacklisted)
  if (client.status === 'blacklisted') {
    const blacklistedEmails = client.emailValidation?.blacklistedEmails ?? []
    const blacklistedCount = blacklistedEmails.length

    return (
      <div className="flex flex-col gap-1.5">
        {/* Contador + Botón */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <MailX className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {blacklistedCount}{' '}
              {blacklistedCount === 1 ? 'descartado' : 'descartados'}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                <span>Ver menos</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                <span>Ver todos</span>
              </>
            )}
          </button>
        </div>

        {/* Correos (solo cuando está expandido) */}
        {isExpanded && (
          <div className="flex flex-wrap gap-1">
            {blacklistedEmails.map((item, idx) => (
              <span
                key={idx}
                className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 border border-gray-200"
                title="En lista negra"
              >
                {item.email}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Cliente normal
  const validEmails = client.customer?.emails ?? []
  const blacklistedEmails = client.emailValidation?.blacklistedEmails ?? []
  const validCount = validEmails.length
  const blacklistedCount = blacklistedEmails.length
  const totalEmails = validCount + blacklistedCount

  if (totalEmails === 0) {
    return <span className="text-muted-foreground text-xs">-</span>
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Contadores + Botón */}
      <div className="flex items-center gap-2 flex-wrap">
        {validCount > 0 && (
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-primary" />
            <span className="text-xs text-primary font-medium">
              {validCount} válido{validCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {blacklistedCount > 0 && (
          <div className="flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {blacklistedCount} descartado{blacklistedCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              <span>Ver menos</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              <span>Ver todos</span>
            </>
          )}
        </button>
      </div>

      {/* Correos (solo cuando está expandido) */}
      {isExpanded && (
        <div className="flex flex-col gap-2 pt-1">
          {/* Válidos */}
          {validCount > 0 && (
            <div className="flex flex-wrap gap-1">
              {validEmails.map((email, idx) => (
                <span
                  key={idx}
                  className="text-xs text-primary bg-blue-50 px-2 py-0.5 border border-blue-200"
                  title={email}
                >
                  {email}
                </span>
              ))}
            </div>
          )}
          {/* Descartados */}
          {blacklistedCount > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-dashed border-gray-200">
              {blacklistedEmails.map((item, idx) => (
                <span
                  key={idx}
                  className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 border border-gray-200"
                  title={`${item.email} - En lista negra`}
                >
                  {item.email}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function Step1Content({
  fileData,
  onFileSelect,
  fileInputRef,
  activeBusinessId,
  onDataUpdate,
  campaignName,
  campaignDescription,
  onCampaignNameChange,
  onCampaignDescriptionChange,
}: Step1ContentProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [blacklistedCount, setBlacklistedCount] = useState(0)
  const { activeBusiness } = useActiveBusinessStore()

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet(TEMPLATE_DATA)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla de Cobros')
    XLSX.writeFile(workbook, 'plantilla_cobros.xlsx')
    toast.success('Plantilla descargada correctamente')
  }

  const validateEmailsAgainstBlacklist = async (
    clients: Map<string, GroupedClient>
  ): Promise<number> => {
    if (!activeBusinessId) return 0

    const clientsWithEmails: Array<{ nit: string; client: GroupedClient }> = []

    // Collect all clients that have emails
    clients.forEach((client, nit) => {
      if (
        client.customer &&
        client.customer.emails &&
        client.customer.emails.length > 0
      ) {
        clientsWithEmails.push({ nit, client })
      }
    })

    if (clientsWithEmails.length === 0) return 0

    // Get all unique emails
    const allEmails: string[] = []
    clientsWithEmails.forEach(({ client }) => {
      allEmails.push(...client.customer!.emails)
    })

    // Check against blacklist
    const blacklistCheck = await filterBlacklistedEmailsAction(
      activeBusinessId,
      allEmails
    )

    // Create a set of blacklisted emails for quick lookup
    const blacklistedSet = new Set(
      blacklistCheck.filter((e) => e.is_blacklisted).map((e) => e.email)
    )

    let fullyBlacklistedCount = 0

    // Process each client
    clientsWithEmails.forEach(({ nit, client }) => {
      const customer = client.customer!
      const validEmails: string[] = []
      const blacklistedEmails: string[] = []

      customer.emails.forEach((email) => {
        if (blacklistedSet.has(email)) {
          blacklistedEmails.push(email)
        } else {
          validEmails.push(email)
        }
      })

      if (blacklistedEmails.length > 0) {
        if (validEmails.length === 0) {
          // Fully blacklisted - mark for removal
          client.status = 'blacklisted'
          client.emailValidation = {
            validEmails: [],
            blacklistedEmails: blacklistedEmails.map((email) => ({ email })),
          }
          fullyBlacklistedCount++
        } else {
          // Partially blacklisted - keep only valid emails
          if (client.customer) {
            client.customer.emails = validEmails
          }
          client.emailValidation = {
            validEmails,
            blacklistedEmails: blacklistedEmails.map((email) => ({ email })),
          }
        }
      }
    })

    return fullyBlacklistedCount
  }

  const processCustomers = async () => {
    if (!fileData || !activeBusinessId || fileData.groupedClients.size === 0)
      return

    setIsProcessing(true)
    setProcessingProgress(10)

    try {
      const nits = Array.from(fileData.groupedClients.keys())
      const result = await fetchCustomersByNitsAction(activeBusinessId, nits)

      if (result.success) {
        let updatedGroupedClients = new Map(fileData.groupedClients)
        let foundCount = 0

        updatedGroupedClients.forEach((client, nit) => {
          const customer = result.data.get(nit)
          if (customer) {
            client.customer = customer
            client.status = 'found'
            foundCount++
          } else {
            client.status = 'not_found'
          }
        })

        setProcessingProgress(60)

        // Validate emails against blacklist
        const fullyBlacklisted = await validateEmailsAgainstBlacklist(
          updatedGroupedClients
        )
        setBlacklistedCount(fullyBlacklisted)

        setProcessingProgress(80)

        // Count filtered clients (but keep all in the map for display)
        let partiallyFilteredCount = 0
        updatedGroupedClients.forEach((client) => {
          if (
            client.status !== 'blacklisted' &&
            (client.emailValidation?.blacklistedEmails?.length ?? 0) > 0
          ) {
            partiallyFilteredCount++
          }
        })

        onDataUpdate({
          ...fileData,
          groupedClients: updatedGroupedClients,
        })

        // Show summary toast
        if (fullyBlacklisted > 0 || partiallyFilteredCount > 0) {
          toast.success(
            `${foundCount} clientes encontrados. ${fullyBlacklisted} descartados (lista negra), ${partiallyFilteredCount} con correos filtrados.`
          )
        } else {
          toast.success(
            `Datos de contacto sincronizados: ${foundCount} encontrados de ${nits.length}`
          )
        }
      } else {
        toast.error('Error al obtener datos de clientes: ' + result.error)
      }
    } catch (error) {
      console.error('Processing error:', error)
      toast.error('Error durante el procesamiento de clientes')
    } finally {
      setProcessingProgress(100)
      setTimeout(() => setIsProcessing(false), 500)
    }
  }

  // Auto-process when file is loaded and valid
  useEffect(() => {
    if (fileData?.valid && !isProcessing && fileData.groupedClients.size > 0) {
      const hasPending = Array.from(fileData.groupedClients.values()).some(
        (c) => c.status === 'pending'
      )
      if (hasPending) {
        processCustomers()
      }
    }
  }, [fileData?.valid])

  // Calculate counts for display
  const foundCount = fileData
    ? Array.from(fileData.groupedClients.values()).filter(
        (c) => c.status === 'found'
      ).length
    : 0
  const notFoundCount = fileData
    ? Array.from(fileData.groupedClients.values()).filter(
        (c) => c.status === 'not_found'
      ).length
    : 0
  const discardedCount = fileData
    ? Array.from(fileData.groupedClients.values()).filter(
        (c) => c.status === 'blacklisted'
      ).length
    : 0
  const withFilteredEmails = fileData
    ? Array.from(fileData.groupedClients.values()).filter(
        (c) =>
          c.status !== 'blacklisted' &&
          (c.emailValidation?.blacklistedEmails?.length ?? 0) > 0
      ).length
    : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content area - file upload */}
      <div className="lg:col-span-2 space-y-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={onFileSelect}
          className="hidden"
        />

        {/* Download Template Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar Plantilla
          </Button>
        </div>

        {/* File Upload Area */}
        <div
          className="border-2 border-dashed p-4 transition-colors cursor-pointer hover:border-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          {fileData ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <FileSpreadsheet className="h-8 w-8 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-base font-medium truncate">
                    {fileData.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fileData.groupedClients.size} clientes •{' '}
                    {fileData.valid ? (
                      <span className="text-primary">Formato válido</span>
                    ) : (
                      <span className="text-muted-foreground">
                        Faltan columnas
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                >
                  Cambiar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive px-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDataUpdate(null)
                    setBlacklistedCount(0)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  <BrushCleaning className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-base font-medium">Seleccionar archivo</p>
                  <p className="text-xs text-muted-foreground">
                    CSV o Excel (.xlsx, .xls)
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                Examinar archivos
              </Button>
            </div>
          )}
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Obteniendo información de contacto...
              </span>
              <span>{processingProgress}%</span>
            </div>
            <Progress value={processingProgress} className="h-2" />
          </div>
        )}

        {/* Missing Columns Error */}
        {fileData && !fileData.valid && (
          <div className="bg-red-50 border border-red-200 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Columnas faltantes:</p>
                <p className="text-sm text-red-700">
                  {fileData.missingColumns.join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Processing Summary */}
        {fileData && fileData.valid && !isProcessing && (
          <div className="border p-4">
            <h4 className="font-medium mb-4 text-muted-foreground flex justify-between items-center">
              <span className="text-sm">Resumen de Procesamiento</span>
              <div className="flex gap-4 text-xs">
                <span className="text-primary flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {foundCount} Encontrados
                </span>
                {notFoundCount > 0 && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {notFoundCount} Sin Contacto
                  </span>
                )}
                {discardedCount > 0 && (
                  <span className="text-red-600 flex items-center gap-1">
                    <MailX className="h-3 w-3" />
                    {discardedCount} Descartados
                  </span>
                )}
                {withFilteredEmails > 0 && (
                  <span className="text-amber-600 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" />
                    {withFilteredEmails} Con correos filtrados
                  </span>
                )}
              </div>
            </h4>

            <div className="max-h-[300px] overflow-y-auto pr-2">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-background z-10">
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">NIT</th>
                    <th className="text-left p-2 font-medium">Cliente</th>
                    <th className="text-center p-2 font-medium">Facturas</th>
                    <th className="text-left p-2 font-medium">Correos</th>
                    <th className="text-right p-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(fileData.groupedClients.values())
                    .slice(0, 50)
                    .map((client, idx) => (
                      <tr
                        key={idx}
                        className={`border-b ${
                          client.status === 'blacklisted' ? 'bg-red-50/50' : ''
                        }`}
                      >
                        <td className="p-2 font-mono text-xs">{client.nit}</td>
                        <td className="p-2">
                          {client.customer ? (
                            <span className="font-medium">
                              {client.customer.full_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">
                              No esta activo en el directorio
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-secondary px-2 py-0.5 text-xs">
                            {client.invoices.length}
                          </span>
                        </td>
                        <td className="p-2">
                          {client.customer ? (
                            <EmailCell client={client} />
                          ) : (
                            <span className="text-muted-foreground italic text-xs">
                              -
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          {client.status === 'blacklisted' ? (
                            <span className="text-red-600 text-xs font-medium flex items-center justify-end gap-1">
                              <MailX className="h-3 w-3" />
                              Descartado
                            </span>
                          ) : client.status === 'found' ? (
                            (client.emailValidation?.blacklistedEmails
                              ?.length ?? 0) > 0 ? (
                              <span className="text-amber-600 text-xs font-medium flex items-center justify-end gap-1">
                                <ShieldAlert className="h-3 w-3" />
                                Filtrado
                              </span>
                            ) : (
                              <span className="text-primary text-xs font-medium">
                                Listo
                              </span>
                            )
                          ) : (
                            <span className="text-muted-foreground text-xs font-medium">
                              Sin datos
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {fileData.groupedClients.size > 50 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Mostrando 50 de {fileData.groupedClients.size} registros...
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar - Campaign Info */}
      <div className="lg:col-span-1">
        <CampaignInfoSidebar
          campaignName={campaignName}
          campaignDescription={campaignDescription}
          onCampaignNameChange={onCampaignNameChange}
          onCampaignDescriptionChange={onCampaignDescriptionChange}
        />
      </div>
    </div>
  )
}
