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
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
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
import { CollectionTemplate } from '@/lib/models/collection'
import * as XLSX from 'xlsx'

// Import components
import { Step1Content } from './Step1Content'
import { Step2Content } from './Step2Content'
import { Step3Content } from './Step3Content'

// Import types
import {
  WizardStep,
  WIZARD_STEPS,
  REQUIRED_COLUMNS,
  FileData,
  EmailConfig,
  DatabaseStrategy,
} from './types'

// Import utilities
import { parseInvoiceFile } from './utils'

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
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | undefined>(undefined)
  const [senderDomain, setSenderDomain] = useState('')
  const [availableDomains, setAvailableDomains] = useState<string[]>([])
  const [customBatchSize, setCustomBatchSize] = useState<number | undefined>(
    undefined
  )
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { activeBusiness } = useActiveBusinessStore()

  // Load strategies, templates and thresholds from database
  useEffect(() => {
    const loadData = async () => {
      if (!activeBusiness?.id) return

      try {
        const [businessStrategies, businessDomains, emailTemplates, thresholdsResponse] = await Promise.all([
          getBusinessStrategiesAction(activeBusiness.id),
          getBusinessDomainsAction(activeBusiness.id),
          getActiveTemplatesByTypeAction(activeBusiness.id, 'email'),
          fetchThresholdsAction(activeBusiness.id),
        ])

        setStrategies(businessStrategies)
        setAvailableDomains(businessDomains)
        setTemplates(emailTemplates)

        // Determine default template from lowest threshold
        // thresholdsResponse.data is already sorted by days_from ASC (see fetchThresholdsAction)
        if (thresholdsResponse.data.length > 0) {
          const lowestThreshold = thresholdsResponse.data[0]
          if (lowestThreshold.email_template_id) {
            setDefaultTemplateId(lowestThreshold.email_template_id)
            // Pre-select this template if none selected yet
            setEmailConfig(prev => ({
              ...prev,
              templateId: prev.templateId || lowestThreshold.email_template_id
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
      }
    }

    loadData()
  }, [activeBusiness?.id])

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
        const scheduledDateTime = new Date(scheduledDate)
        scheduledDateTime.setHours(hours, minutes, 0, 0)
        finalScheduledAt = scheduledDateTime.toISOString()
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
      const data = await parseInvoiceFile(file)
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
              onTemplateChange={(templateId) => setEmailConfig(prev => ({ ...prev, templateId }))}
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
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id
        const isCompleted = currentStep > step.id

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                  isActive &&
                    'border-primary bg-primary text-primary-foreground',
                  isCompleted && 'border-green-500 bg-green-500 text-white',
                  !isActive &&
                    !isCompleted &&
                    'border-gray-300 bg-white text-gray-400'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="font-semibold">{step.id}</span>
                )}
              </div>
              <div className="text-center mt-2 hidden sm:block">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isActive && 'text-primary',
                    isCompleted && 'text-green-600',
                    !isActive && !isCompleted && 'text-gray-500'
                  )}
                >
                  {step.title}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2',
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
