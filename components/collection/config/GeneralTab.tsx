'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import {
  getCollectionConfigAction,
  updateCollectionConfigAction,
} from '@/lib/actions/collection/config'
import { CollectionConfigUpdate } from '@/lib/models/collection/config'

const INPUT_DATE_FORMATS = [
  { value: 'DD-MM-AAAA', label: 'Día-Mes-Año (ej: 31-12-2023)' },
  { value: 'MM-DD-AAAA', label: 'Mes-Día-Año (ej: 12-31-2023)' },
  { value: 'AAAA-MM-DD', label: 'Año-Mes-Día (ej: 2023-12-31)' },
  { value: 'DD/MM/AAAA', label: 'Día/Mes/Año (ej: 31/12/2023)' },
  { value: 'MM/DD/AAAA', label: 'Mes/Día/Año (ej: 12/31/2023)' },
]

const OUTPUT_DATE_FORMATS = [
  { value: 'same_as_input', label: 'Mismo que el formato de entrada' },
  { value: 'DD-MM-AAAA', label: 'Día-Mes-Año (ej: 31-12-2023)' },
  { value: 'AAAA-MM-DD', label: 'Año-Mes-Día (ej: 2023-12-31)' },
]

export function GeneralTab() {
  const { activeBusiness } = useActiveBusinessStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [inputFormat, setInputFormat] = useState<string>('DD-MM-AAAA')
  const [outputFormat, setOutputFormat] = useState<string>('DD-MM-AAAA')
  const [customInputFormat, setCustomInputFormat] = useState<string>('')
  const [customOutputFormat, setCustomOutputFormat] = useState<string>('')

  useEffect(() => {
    const loadConfig = async () => {
      if (!activeBusiness?.id) return

      setIsLoading(true)
      try {
        const result = await getCollectionConfigAction(activeBusiness.id)

        if (result.success && result.data) {
          const loadedInput = result.data.input_date_format || 'DD-MM-AAAA'
          const isKnownInput = INPUT_DATE_FORMATS.some(
            (f) => f.value === loadedInput
          )

          if (isKnownInput) {
            setInputFormat(loadedInput)
          } else {
            setInputFormat('custom')
            setCustomInputFormat(loadedInput)
          }

          const loadedOutput = result.data.output_date_format || 'DD-MM-AAAA'
          const isKnownOutput = OUTPUT_DATE_FORMATS.some(
            (f) => f.value === loadedOutput
          )

          if (isKnownOutput) {
            setOutputFormat(loadedOutput)
          } else {
            setOutputFormat('custom')
            setCustomOutputFormat(loadedOutput)
          }
        }
      } catch (error) {
        console.error('Error loading general config:', error)
        toast.error('Error al cargar configuración general')
      } finally {
        setIsLoading(false)
      }
    }

    loadConfig()
  }, [activeBusiness?.id])

  const handleSave = async () => {
    if (!activeBusiness?.id) return

    setIsSaving(true)
    try {
      const finalInputFormat =
        inputFormat === 'custom' ? customInputFormat : inputFormat
      const finalOutputFormat =
        outputFormat === 'custom' ? customOutputFormat : outputFormat

      if (inputFormat === 'custom' && !customInputFormat.trim()) {
        toast.error(
          'Debe especificar un formato de entrada personalizado or volver a una opcion predeterminada'
        )
        setIsSaving(false)
        return
      }

      if (outputFormat === 'custom' && !customOutputFormat.trim()) {
        toast.error(
          'Debe especificar un formato de salida personalizado or volver a una opcion predeterminada'
        )
        setIsSaving(false)
        return
      }

      const updateData: CollectionConfigUpdate = {
        input_date_format: finalInputFormat,
        output_date_format: finalOutputFormat,
      }

      const result = await updateCollectionConfigAction(
        activeBusiness.id,
        updateData
      )

      if (result.success) {
        toast.success('Configuración guardada exitosamente')
      } else {
        toast.error('Error al guardar: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving general config:', error)
      toast.error('Error inesperado al guardar la configuración')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground delay-150 duration-500" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formatos de Fecha en Facturas</CardTitle>
        <CardDescription>
          Configura cómo el sistema debe interpretar las fechas en tus archivos
          CSV/Excel de facturas y cómo quieres que se muestren.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label htmlFor="input-format" className="font-semibold text-base">
              Formato de Entrada (Tus archivos)
            </Label>
            <p className="text-sm text-muted-foreground">
              Selecciona el formato que usualmente tienen las fechas
              (`invoice_date`, `due_date`) en tus archivos. Si seleccionas
              "Detectar automáticamente", intentaremos inferir el formato.
            </p>
            <Select value={inputFormat} onValueChange={setInputFormat}>
              <SelectTrigger id="input-format" className="w-full sm:w-[350px]">
                <SelectValue placeholder="DD-MM-AAAA" />
              </SelectTrigger>
              <SelectContent>
                {INPUT_DATE_FORMATS.map((fmt) => (
                  <SelectItem key={fmt.value} value={fmt.value}>
                    {fmt.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Personalizado (Otro)</SelectItem>
              </SelectContent>
            </Select>

            {inputFormat === 'custom' && (
              <div className="mt-2 text-sm">
                <Label htmlFor="custom-input-format" className="mb-2 block">
                  Formato de `date-fns` (ej: dd/MM/yyyy)
                </Label>
                <Input
                  id="custom-input-format"
                  value={customInputFormat}
                  onChange={(e) => setCustomInputFormat(e.target.value)}
                  placeholder="dd-MM-yyyy"
                  className="w-full sm:w-[350px]"
                />
                <p className="text-xs text-muted-foreground mt-1 text-wrap sm:w-[350px]">
                  Use símbolos de{' '}
                  <a
                    href="https://date-fns.org/v3.6.0/docs/format"
                    target="_blank"
                    className="underline text-blue-500 hover:text-blue-700"
                  >
                    date-fns format
                  </a>
                  .
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-4">
            <Label htmlFor="output-format" className="font-semibold text-base">
              Formato de Salida (Sistema)
            </Label>
            <p className="text-sm text-muted-foreground">
              Así se mostrarán las fechas en el sistema y correos (ej.
              plantillas y previsualización).
            </p>
            <Select value={outputFormat} onValueChange={setOutputFormat}>
              <SelectTrigger id="output-format" className="w-full sm:w-[350px]">
                <SelectValue placeholder="DD-MM-AAAA" />
              </SelectTrigger>
              <SelectContent>
                {OUTPUT_DATE_FORMATS.map((fmt) => (
                  <SelectItem key={fmt.value} value={fmt.value}>
                    {fmt.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Personalizado (Otro)</SelectItem>
              </SelectContent>
            </Select>

            {outputFormat === 'custom' && (
              <div className="mt-2 text-sm">
                <Label htmlFor="custom-output-format" className="mb-2 block">
                  Formato de `date-fns` (ej: dd/MM/yyyy)
                </Label>
                <Input
                  id="custom-output-format"
                  value={customOutputFormat}
                  onChange={(e) => setCustomOutputFormat(e.target.value)}
                  placeholder="dd-MM-yyyy"
                  className="w-full sm:w-[350px]"
                />
                <p className="text-xs text-muted-foreground mt-1 text-wrap sm:w-[350px]">
                  Use símbolos de{' '}
                  <a
                    href="https://date-fns.org/v3.6.0/docs/format"
                    target="_blank"
                    className="underline text-blue-500 hover:text-blue-700"
                  >
                    date-fns format
                  </a>
                  .
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/50 border-t flex justify-end py-4">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar Cambios
        </Button>
      </CardFooter>
    </Card>
  )
}
