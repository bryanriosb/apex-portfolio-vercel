'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { createExecutionWithClientsAction } from '@/lib/actions/collection/execution-workflow'
import { getCurrentUser } from '@/lib/services/auth/supabase-auth'
import {
  getBusinessStrategiesAction,
  getBusinessDomainsAction,
} from '@/lib/actions/collection/email-strategies'
import { getActiveTemplatesByTypeAction } from '@/lib/actions/collection/template'
import { fetchThresholdsAction } from '@/lib/actions/collection/notification-threshold'
import { getCollectionConfigAction } from '@/lib/actions/collection/config'
import { getCustomerCountAction } from '@/lib/actions/business-customer'
import { CollectionTemplate } from '@/lib/models/collection'
import { CollectionConfig } from '@/lib/models/collection/config'
import * as XLSX from 'xlsx'
import Link from 'next/link'

// Import components
import { Step1Content } from './Step1Content'
import { Step2Content } from './Step2Content'
import { Step3Content } from './Step3Content'

// Import types
import {
  WizardStep,
  WIZARD_STEPS,
  FileData,
  EmailConfig,
  DatabaseStrategy,
} from './types'

// Import utilities
import { parseInvoiceFile } from './utils'
import Loading from '@/components/ui/loading'

export function CreationWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [fileData, setFileData] = useState<FileData | null>(null)
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    attachmentIds: [],
  })
  const [campaignName, setCampaignName] = useState('')
  const [campaignDescription, setCampaignDescription] = useState('')

  // Step 3 State
  const [executionMode, setExecutionMode] = useState<'immediate' | 'scheduled'>(
    'immediate'
  )
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    undefined
  )
  const [scheduledTime, setScheduledTime] = useState('08:00')

  // Strategy Configuration
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(
    null
  )
  const [strategies, setStrategies] = useState<DatabaseStrategy[]>([])
  const [templates, setTemplates] = useState<CollectionTemplate[]>([])
  const [defaultTemplateId, setDefaultTemplateId] = useState<
    string | undefined
  >(undefined)
  const [senderDomain, setSenderDomain] = useState('')
  const [availableDomains, setAvailableDomains] = useState<string[]>([])
  const [customBatchSize, setCustomBatchSize] = useState<number | undefined>(
    undefined
  )
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  // Validation State
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [hasCustomers, setHasCustomers] = useState(false)
  const [hasThresholds, setHasThresholds] = useState(false)
  const [collectionConfig, setCollectionConfig] =
    useState<CollectionConfig | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { activeBusiness } = useActiveBusinessStore()

  // Load strategies, templates and thresholds from database
  useEffect(() => {
    const loadData = async () => {
      if (!activeBusiness?.id || !activeBusiness?.business_account_id) return

      try {
        const [
          businessStrategies,
          businessDomains,
          emailTemplates,
          thresholdsResponse,
          configResponse,
          customerCount,
        ] = await Promise.all([
          getBusinessStrategiesAction(activeBusiness.id),
          getBusinessDomainsAction(activeBusiness.id),
          getActiveTemplatesByTypeAction(
            activeBusiness.business_account_id,
            'email'
          ),
          fetchThresholdsAction(activeBusiness.id),
          getCollectionConfigAction(activeBusiness.id),
          getCustomerCountAction(activeBusiness.id),
        ])

        setStrategies(businessStrategies)
        setAvailableDomains(businessDomains)
        setTemplates(emailTemplates)
        setHasCustomers(customerCount > 0)
        setHasThresholds(
          thresholdsResponse.data && thresholdsResponse.data.length > 0
        )
        if (configResponse.success && configResponse.data) {
          setCollectionConfig(configResponse.data)
        }

        // Determine default template from lowest threshold
        // thresholdsResponse.data is already sorted by days_from ASC (see fetchThresholdsAction)
        if (thresholdsResponse.data && thresholdsResponse.data.length > 0) {
          const lowestThreshold = thresholdsResponse.data[0]
          if (lowestThreshold.email_template_id) {
            setDefaultTemplateId(lowestThreshold.email_template_id)
            // Pre-select this template if none selected yet
            setEmailConfig((prev) => ({
              ...prev,
              templateId: prev.templateId || lowestThreshold.email_template_id,
            }))
          }
        }

        // Select default strategy if available
        const defaultStrategy = businessStrategies.find((s) => s.is_default)
        if (defaultStrategy) {
          setSelectedStrategyId(defaultStrategy.id)
        } else if (businessStrategies.length > 0) {
          setSelectedStrategyId(businessStrategies[0].id)
        }

        // Pre-select domain if available
        if (businessDomains.length > 0 && !senderDomain) {
          setSenderDomain(businessDomains[0])
        }
      } catch (error) {
        console.error('Error loading strategies/domains/templates:', error)
        toast.error('Error al cargar configuración de envío')
      } finally {
        setIsDataLoaded(true)
      }
    }

    loadData()
  }, [activeBusiness?.id, activeBusiness?.business_account_id])

  const handleNext = async () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1)
    } else {
      await handleFinish()
    }
  }

  const handleFinish = async () => {
    if (!fileData || !activeBusiness?.id) return

    const loadingToast = toast.loading('Creando ejecución de cobro...')

    try {
      const validClients = Array.from(fileData.groupedClients.values()).filter(
        (client) => client.status === 'found'
      )

      if (validClients.length === 0) {
        toast.error('No hay clientes válidos para procesar')
        toast.dismiss(loadingToast)
        return
      }

      const user = await getCurrentUser()
      let finalScheduledAt = null

      if (executionMode === 'scheduled' && scheduledDate) {
        const [hours, minutes] = scheduledTime.split(':').map(Number)

        console.log(`[CreationWizard] User selected time: ${scheduledTime}`)
        console.log(
          `[CreationWizard] Parsed hours: ${hours}, minutes: ${minutes}`
        )
        console.log(`[CreationWizard] Selected date object: ${scheduledDate}`)
        console.log(
          `[CreationWizard] Selected date ISO: ${scheduledDate.toISOString()}`
        )
        console.log(
          `[CreationWizard] Selected date local string: ${scheduledDate.toString()}`
        )

        // Get date components in America/Bogota timezone
        // Use toLocaleString to ensure we get the correct day/month/year in Bogota
        const bogotaDateStr = scheduledDate.toLocaleString('en-US', {
          timeZone: 'America/Bogota',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        const [bogotaMonth, bogotaDay, bogotaYear] = bogotaDateStr.split('/')

        console.log(
          `[CreationWizard] Bogota date components: ${bogotaYear}-${bogotaMonth}-${bogotaDay}`
        )
        console.log(
          `[CreationWizard] Bogota time components: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
        )

        // Format: YYYY-MM-DDTHH:mm:ss-05:00 (Bogota timezone)
        finalScheduledAt = `${bogotaYear}-${bogotaMonth}-${bogotaDay}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00-05:00`

        // Verify the parsed date
        const verifyDate = new Date(finalScheduledAt)
        console.log(
          `[CreationWizard] Constructed ISO string: ${finalScheduledAt}`
        )
        console.log(
          `[CreationWizard] Parsed to UTC: ${verifyDate.toISOString()}`
        )
        console.log(
          `[CreationWizard] This equals: ${verifyDate.getUTCHours()}:${String(verifyDate.getUTCMinutes()).padStart(2, '0')} UTC`
        )
        console.log(
          `[CreationWizard] Which is: ${verifyDate.getUTCHours() - 5}:${String(verifyDate.getUTCMinutes()).padStart(2, '0')} Bogota time`
        )
      }

      const executionData = {
        business_id: activeBusiness.id,
        name: campaignName || `Campaña ${new Date().toLocaleDateString()}`,
        description:
          campaignDescription ||
          `Importado desde archivo: ${fileData.fileName}`,
        status: 'pending' as const,
        // Las plantillas se asignan por umbral, pero usamos un fallback si se seleccionó uno
        // Si no se seleccionó, usamos el del umbral más bajo por defecto
        email_template_id: emailConfig.templateId || defaultTemplateId || null,
        created_by: user?.id || 'system',
        execution_mode: executionMode,
        scheduled_at: finalScheduledAt,
        attachment_ids: emailConfig.attachmentIds,
      }

      const selectedStrategy = strategies.find(
        (s) => s.id === selectedStrategyId
      )

      const strategyConfig = {
        strategyId: selectedStrategyId || undefined,
        strategyType: selectedStrategy?.strategy_type || 'batch',
        domain: senderDomain || 'bore.com',
        startImmediately: executionMode === 'immediate',
        ...(customBatchSize && { customBatchSize }),
      }

      const result = await createExecutionWithClientsAction({
        executionData,
        clients: validClients,
        strategyConfig,
      })

      if (result.success) {
        toast.success('Ejecución creada exitosamente')
        router.push('/admin/collection/executions')
      } else {
        toast.error('Error al crear ejecución: ' + result.error)
      }
    } catch (error: any) {
      console.error('Error in handleFinish:', error)
      toast.error('Error inesperado: ' + error.message)
    } finally {
      toast.dismiss(loadingToast)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        if (!fileData?.valid || fileData.groupedClients.size === 0) return false
        if (!campaignName.trim()) return false
        return Array.from(fileData.groupedClients.values()).some(
          (c) => c.status === 'found'
        )
      case 2:
        // Paso 2 solo configura adjuntos opcionales
        return true
      case 3:
        if (!senderDomain.trim()) return false
        if (!selectedStrategyId) return false
        if (executionMode === 'scheduled') {
          return !!scheduledDate && !!scheduledTime
        }
        return true
      default:
        return true
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileExtension = file.name.split('.').pop()?.toLowerCase()

    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      toast.error('Formato de archivo no válido. Use CSV o Excel (.xlsx, .xls)')
      return
    }

    try {
      const inputFormat = collectionConfig?.input_date_format || 'DD-MM-AAAA'
      const outputFormat = collectionConfig?.output_date_format || 'DD-MM-AAAA'
      const data = await parseInvoiceFile(file, inputFormat, outputFormat)
      setFileData(data)

      if (data.valid) {
        toast.success(
          `Archivo procesado: ${data.groupedClients.size} clientes identificados`
        )
      } else {
        toast.error(
          `Faltan columnas requeridas: ${data.missingColumns.join(', ')}`
        )
      }
    } catch (error: any) {
      console.error('Error parsing file:', error)
      toast.error('Error al procesar el archivo: ' + error.message)
      setFileData(null)
    }
  }

  const progressPercentage =
    ((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100

  const isMissingRequirements =
    !hasCustomers ||
    !hasThresholds ||
    templates.length === 0 ||
    !collectionConfig?.input_date_format

  if (!isDataLoaded) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[60vh]">
        <Loading className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="font-medium text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (isDataLoaded && isMissingRequirements) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[65vh] lg:max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-none bg-card w-full">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Configuración Incompleta
          </h2>
          <p className="text-muted-foreground max-w-lg mb-6">
            Para crear una campaña de cobro, debes completar la configuración
            básica del módulo. Asegúrate de tener formatos de fecha, umbrales de
            notificación y plantillas configuradas.
          </p>
          <div className="grid gap-4 w-full max-w-2xl text-left mb-8">
            <div className="flex items-start gap-3 p-4 border rounded-none">
              <div
                className={cn(
                  'h-3 w-3 mt-1.5 shrink-0',
                  hasCustomers ? 'bg-primary' : 'bg-muted-foreground'
                )}
              />
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center">
                  <Link
                    href="/admin/customers"
                    className="font-semibold text-base text-primary hover:underline"
                  >
                    Clientes Registrados
                  </Link>
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      hasCustomers
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {hasCustomers ? 'Listo' : 'Pendiente'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Debes tener al menos un cliente registrado. Los clientes son
                  usados para cruzar la información de tus facturas al
                  importarlas.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 border rounded-none">
              <div
                className={cn(
                  'h-3 w-3 mt-1.5 shrink-0',
                  collectionConfig?.input_date_format
                    ? 'bg-primary'
                    : 'bg-muted-foreground'
                )}
              />
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center">
                  <Link
                    href="/admin/settings/collection?tab=general"
                    className="font-semibold text-base text-primary hover:underline"
                  >
                    Formatos de Fecha
                  </Link>
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      collectionConfig?.input_date_format
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {collectionConfig?.input_date_format
                      ? 'Configurado'
                      : 'Pendiente'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Necesarios para que el sistema sepa cómo leer las fechas en tu
                  archivo de importación y homogeneizarlas.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 border rounded-none">
              <div
                className={cn(
                  'h-3 w-3 mt-1.5 shrink-0',
                  templates.length > 0 ? 'bg-primary' : 'bg-muted-foreground'
                )}
              />
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center">
                  <Link
                    href="/admin/collection/templates"
                    className="font-semibold text-base text-primary hover:underline"
                  >
                    Plantillas de Correo
                  </Link>
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      templates.length > 0
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {templates.length > 0
                      ? `${templates.length} activas`
                      : 'Pendiente'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Requeridas para predefinir el asunto y el mensaje que
                  recibirán tus clientes cuando se envíe una notificación.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 border rounded-none">
              <div
                className={cn(
                  'h-3 w-3 mt-1.5 shrink-0',
                  hasThresholds ? 'bg-primary' : 'bg-muted-foreground'
                )}
              />
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center">
                  <Link
                    href="/admin/settings/collection?tab=thresholds"
                    className="font-semibold text-base text-primary hover:underline"
                  >
                    Umbrales de Notificación
                  </Link>
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      hasThresholds
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {hasThresholds ? 'Configurado' : 'Pendiente'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Son los días de mora que se asocian a reglas automáticas que
                  permiten seleccionar la plantilla de correo a enviar en la
                  campaña correspondiente a cada cliente.
                </p>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Haz clic en cualquier título resaltado para ir directamente a la
            configuración correspondiente.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 lg:max-w-5xl mx-auto">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Paso {currentStep} de {WIZARD_STEPS.length}
          </span>
          <span className="text-muted-foreground">
            {WIZARD_STEPS[currentStep - 1].title}
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Steps Indicator */}
      <StepIndicator currentStep={currentStep} steps={WIZARD_STEPS} />

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{WIZARD_STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>
            {WIZARD_STEPS[currentStep - 1].description}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[400px]">
          {currentStep === 1 && (
            <Step1Content
              fileData={fileData}
              onFileSelect={handleFileSelect}
              fileInputRef={fileInputRef}
              activeBusinessId={activeBusiness?.id}
              onDataUpdate={setFileData}
              campaignName={campaignName}
              campaignDescription={campaignDescription}
              onCampaignNameChange={setCampaignName}
              onCampaignDescriptionChange={setCampaignDescription}
            />
          )}
          {currentStep === 2 && (
            <Step2Content
              fileData={fileData}
              config={emailConfig}
              onChange={setEmailConfig}
            />
          )}
          {currentStep === 3 && (
            <Step3Content
              fileData={fileData}
              emailConfig={emailConfig}
              onTemplateChange={(templateId) =>
                setEmailConfig((prev) => ({ ...prev, templateId }))
              }
              executionMode={executionMode}
              onExecutionModeChange={setExecutionMode}
              scheduledDate={scheduledDate}
              onScheduledDateChange={setScheduledDate}
              scheduledTime={scheduledTime}
              onScheduledTimeChange={setScheduledTime}
              selectedStrategyId={selectedStrategyId}
              onStrategyChange={setSelectedStrategyId}
              strategies={strategies}
              templates={templates}
              senderDomain={senderDomain}
              onDomainChange={setSenderDomain}
              showAdvancedOptions={showAdvancedOptions}
              onAdvancedOptionsChange={setShowAdvancedOptions}
              customBatchSize={customBatchSize}
              onCustomBatchSizeChange={setCustomBatchSize}
              availableDomains={availableDomains}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>
        <Button onClick={handleNext} disabled={!canProceed()}>
          {currentStep === WIZARD_STEPS.length ? 'Crear Campaña' : 'Siguiente'}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Sub-component: Step Indicator
function StepIndicator({
  currentStep,
  steps,
}: {
  currentStep: number
  steps: WizardStep[]
}) {
  return (
    <div className="flex items-center justify-center gap-4">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id
        const isCompleted = currentStep > step.id
        const isLast = index === steps.length - 1

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors text-xs',
                  isActive &&
                    'border-primary bg-primary text-primary-foreground',
                  isCompleted && 'border-green-500 bg-green-500 text-white',
                  !isActive &&
                    !isCompleted &&
                    'border-gray-300 bg-white text-gray-400'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  <span className="font-semibold">{step.id}</span>
                )}
              </div>
              <div className="text-center mt-1.5 hidden sm:block">
                <p
                  className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    isActive && 'text-primary',
                    isCompleted && 'text-green-600',
                    !isActive && !isCompleted && 'text-gray-500'
                  )}
                >
                  {step.title}
                </p>
              </div>
            </div>
            {!isLast && (
              <div
                className={cn(
                  'h-0.5 w-12 mx-3',
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
