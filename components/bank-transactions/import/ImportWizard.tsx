'use client'

import { useState, useEffect } from 'react'
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
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import {
  validateImportConfigAction,
  importBankTransactionsAction,
} from '@/lib/actions/bank-transactions/import'
import { FileUploadStep } from './FileUploadStep'
import { PreviewStep } from './PreviewStep'
import { ResultStep } from './ResultStep'
import {
  TRANSACTIONS_WIZARD_STEPS,
  type ImportFileData,
  type ImportResult,
} from './types'
import { StepIndicator } from '@/components/ui/step-indicator'
import Loading from '@/components/ui/loading'

export function ImportWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [fileData, setFileData] = useState<ImportFileData | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [configValid, setConfigValid] = useState(false)
  const [dateFormat, setDateFormat] = useState<string | null>(null)

  const { activeBusiness } = useActiveBusinessStore()

  useEffect(() => {
    const loadConfig = async () => {
      if (!activeBusiness?.id) return

      try {
        const result = await validateImportConfigAction(activeBusiness.id)
        setConfigValid(result.valid)
        setDateFormat(result.dateFormat || null)
      } catch (error) {
        console.error('Error loading config:', error)
        setConfigValid(false)
      } finally {
        setIsDataLoaded(true)
      }
    }

    loadConfig()
  }, [activeBusiness?.id])

  const handleNext = async () => {
    if (currentStep === 2) {
      await handleImport()
    } else if (currentStep < TRANSACTIONS_WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleImport = async () => {
    if (!fileData || !activeBusiness?.id) return

    setIsImporting(true)
    const loadingToast = toast.loading('Importando transacciones bancarias...')

    try {
      const result = await importBankTransactionsAction(
        fileData.fileName,
        fileData.sheets,
        activeBusiness.id
      )

      setImportResult(result)

      if (result.success) {
        toast.success('Importación completada exitosamente')
        setCurrentStep(3)
      } else {
        toast.error(result.errors?.[0] || 'Error en la importación')
      }
    } catch (error: any) {
      console.error('Import error:', error)
      toast.error('Error inesperado: ' + error.message)
      setImportResult({
        success: false,
        errors: [error.message],
      })
      setCurrentStep(3)
    } finally {
      toast.dismiss(loadingToast)
      setIsImporting(false)
    }
  }

  const handleFileDataUpdate = (data: ImportFileData | null) => {
    setFileData(data)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return fileData !== null && fileData.totalTransactions > 0 && configValid
      case 2:
        return true
      case 3:
        return false
      default:
        return true
    }
  }

  const handleNewImport = () => {
    setFileData(null)
    setImportResult(null)
    setCurrentStep(1)
  }

  const handleViewTransactions = () => {
    router.push('/admin/collection/transactions')
  }

  const progressPercentage =
    ((currentStep - 1) / (TRANSACTIONS_WIZARD_STEPS.length - 1)) * 100

  if (!isDataLoaded) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[60vh]">
        <Loading className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="font-medium text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 lg:max-w-5xl mx-auto">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Paso {currentStep} de {TRANSACTIONS_WIZARD_STEPS.length}
          </span>
          <span className="text-muted-foreground">
            {TRANSACTIONS_WIZARD_STEPS[currentStep - 1].title}
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      <StepIndicator currentStep={currentStep} steps={TRANSACTIONS_WIZARD_STEPS} />

      <Card>
        <CardHeader>
          <CardTitle>{TRANSACTIONS_WIZARD_STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>
            {TRANSACTIONS_WIZARD_STEPS[currentStep - 1].description}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[400px]">
          {currentStep === 1 && (
            <FileUploadStep
              fileData={fileData}
              onFileDataUpdate={handleFileDataUpdate}
              activeBusinessId={activeBusiness?.id || ''}
              configValid={configValid}
              dateFormat={dateFormat}
            />
          )}
          {currentStep === 2 && (
            <PreviewStep fileData={fileData} />
          )}
          {currentStep === 3 && (
            <ResultStep
              result={importResult}
              onNewImport={handleNewImport}
              onViewTransactions={handleViewTransactions}
            />
          )}
        </CardContent>
      </Card>

      {currentStep < 3 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : currentStep === 2 ? (
              'Confirmar Importación'
            ) : (
              <>
                Siguiente
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
