'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  initMercadoPago,
  CardNumber,
  ExpirationDate,
  SecurityCode,
  createCardToken,
} from '@mercadopago/sdk-react'
import {
  CreditCard,
  Lock,
  Loader2,
  AlertTriangle,
  Calendar,
  CalendarDays,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { createSubscriptionAction } from '@/lib/actions/subscription'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useCurrentUser } from '@/hooks/use-current-user'
import type { Plan } from '@/lib/models/plan/plan'
import type { BillingCycle } from '@/lib/models/subscription/subscription'
import { cn } from '@/lib/utils'

const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY
if (publicKey) {
  initMercadoPago(publicKey, { locale: 'es-CO' })
}

const checkoutFormSchema = z.object({
  cardholderEmail: z.string().email('Email inválido'),
  cardholderName: z.string().min(3, 'Nombre debe tener al menos 3 caracteres'),
  identificationType: z.string().min(1, 'Selecciona un tipo de documento'),
  identificationNumber: z.string().min(1, 'Número de documento requerido'),
  saveCard: z.boolean(),
})

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>

interface CheckoutFormProps {
  plan: Plan
  billingCycle: BillingCycle
  onSuccess: () => void
  onCancel: () => void
}

export function CheckoutForm({
  plan,
  billingCycle: initialBillingCycle,
  onSuccess,
  onCancel,
}: CheckoutFormProps) {
  const { activeBusiness } = useActiveBusinessStore()
  const { user } = useCurrentUser()
  const [isLoading, setIsLoading] = useState(false)
  const [billingCycle, setBillingCycle] =
    useState<BillingCycle>(initialBillingCycle)

  const isSandbox = process.env.NEXT_PUBLIC_MP_SANDBOX === 'true'

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      cardholderEmail: user?.email || '',
      cardholderName: isSandbox ? 'APRO' : '',
      identificationType: isSandbox ? 'CC' : '',
      identificationNumber: isSandbox ? '12345678' : '',
      saveCard: true,
    },
  })

  const monthlyPrice = plan.monthly_price_cents / 100
  const yearlyPrice = plan.yearly_price_cents / 100
  const yearlyMonthlyEquivalent = yearlyPrice / 12
  const discountPercent = plan.yearly_discount_percent || 20
  const price = billingCycle === 'yearly' ? yearlyPrice : monthlyPrice

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const onSubmit = async (values: CheckoutFormValues) => {
    if (!activeBusiness?.business_account_id) {
      toast.error('Error de configuración')
      return
    }

    setIsLoading(true)

    try {
      const cardToken = await createCardToken({
        cardholderName: values.cardholderName,
        identificationType: values.identificationType,
        identificationNumber: values.identificationNumber,
      })

      if (!cardToken || !cardToken.id) {
        throw new Error('No se pudo generar el token de la tarjeta')
      }

      const result = await createSubscriptionAction(
        activeBusiness.business_account_id,
        plan.id,
        billingCycle,
        values.cardholderEmail,
        cardToken.id,
        values.saveCard,
        values.cardholderName
      )

      if (result.success) {
        toast.success('¡Suscripción activada exitosamente!')
        onSuccess()
      } else {
        throw new Error(result.error || 'Error al crear la suscripción')
      }
    } catch (error: any) {
      console.error('Checkout error:', error)
      toast.error(error.message || 'Error al procesar el pago')
    } finally {
      setIsLoading(false)
    }
  }

  if (!publicKey) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Configuración de pago no disponible. Por favor contacta al
            administrador.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Suscripción - {plan.name}
        </CardTitle>
        <CardDescription>
          Suscripción {billingCycle === 'yearly' ? 'anual' : 'mensual'} con
          renovación automática
        </CardDescription>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {isSandbox && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                <p className="text-yellow-800 text-xs">
                  <strong>Modo Sandbox:</strong> Tarjeta de prueba: 5254 1336
                  7440 3564 - CVV: 123 - Vencimiento: 11/25
                </p>
              </div>
            )}

            <BillingCycleSelector
              billingCycle={billingCycle}
              onBillingCycleChange={setBillingCycle}
              monthlyPrice={monthlyPrice}
              yearlyPrice={yearlyPrice}
              yearlyMonthlyEquivalent={yearlyMonthlyEquivalent}
              discountPercent={discountPercent}
              formatCurrency={formatCurrency}
            />

            <PriceSummary
              price={price}
              billingCycle={billingCycle}
              formatCurrency={formatCurrency}
            />

            <FormField
              control={form.control}
              name="cardholderEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="usuario@correo.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cardholderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Titular</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Número de Tarjeta</FormLabel>
              <div className="mp-field-wrapper !border !border-[#e1ddde] px-2">
                <CardNumber placeholder="1234 5678 9012 3456" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-3">
                  <FormLabel>Vencimiento</FormLabel>
                  <div className="mp-field-wrapper !border !border-[#e1ddde] px-2">
                    <ExpirationDate placeholder="MM/YY" />
                  </div>
                </div>
                <div className="grid gap-3">
                  <FormLabel>CVV</FormLabel>
                  <div className="mp-field-wrapper !border !border-[#e1ddde] px-2">
                    <SecurityCode placeholder="123" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="identificationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Documento</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                        <SelectItem value="CE">
                          Cédula de Extranjería
                        </SelectItem>
                        <SelectItem value="NIT">NIT</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="identificationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Documento</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="saveCard"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm text-muted-foreground cursor-pointer">
                      Guardar tarjeta para futuros pagos
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <Lock className="h-3 w-3" />
              <span>Pago seguro procesado por Mercado Pago</span>
            </div>
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>Suscribirse - {formatCurrency(price)}</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>

      <style jsx global>{`
        .mp-field-wrapper {
          position: relative;
          background-color: white;
          border: 1px solid hsl(var(--input));
          border-radius: calc(var(--radius) - 2px);
          transition: all 0.2s;
          overflow: hidden;
        }

        .dark .mp-field-wrapper {
          background-color: #1a1a1a;
        }

        .mp-field-wrapper:focus-within {
          outline: 2px solid hsl(var(--ring));
          outline-offset: 2px;
          border-color: hsl(var(--ring));
        }

        .mp-field-wrapper iframe {
          border: none !important;
          border-radius: 0 !important;
          width: 100%;
          height: 40px;
          background: transparent !important;
          display: block;
        }
      `}</style>
    </Card>
  )
}

function BillingCycleSelector({
  billingCycle,
  onBillingCycleChange,
  monthlyPrice,
  yearlyPrice,
  yearlyMonthlyEquivalent,
  discountPercent,
  formatCurrency,
}: {
  billingCycle: BillingCycle
  onBillingCycleChange: (cycle: BillingCycle) => void
  monthlyPrice: number
  yearlyPrice: number
  yearlyMonthlyEquivalent: number
  discountPercent: number
  formatCurrency: (value: number) => string
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Ciclo de Facturación
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onBillingCycleChange('monthly')}
          className={cn(
            'relative flex flex-col items-start p-3 rounded-lg border-2 transition-colors text-left',
            billingCycle === 'monthly'
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-muted-foreground/50'
          )}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Mensual</span>
          </div>
          <p className="text-lg font-bold mt-1">
            {formatCurrency(monthlyPrice)}
          </p>
          <p className="text-xs text-muted-foreground">por mes</p>
          {billingCycle === 'monthly' && (
            <div className="absolute top-2 right-2">
              <Check className="h-4 w-4 text-primary" />
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={() => onBillingCycleChange('yearly')}
          className={cn(
            'relative flex flex-col items-start p-3 rounded-lg border-2 transition-colors text-left',
            billingCycle === 'yearly'
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-muted-foreground/50'
          )}
        >
          <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            -{discountPercent}%
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="text-sm font-medium">Anual</span>
          </div>
          <p className="text-lg font-bold mt-1">
            {formatCurrency(yearlyPrice)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(yearlyMonthlyEquivalent)}/mes
          </p>
          {billingCycle === 'yearly' && (
            <div className="absolute top-2 right-2">
              <Check className="h-4 w-4 text-primary" />
            </div>
          )}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Se cobrará automáticamente cada{' '}
        {billingCycle === 'yearly' ? 'año' : 'mes'}. Puedes cancelar cuando
        quieras.
      </p>
      {billingCycle === 'yearly' && (
        <p className="text-xs text-green-600 font-medium">
          Ahorras {formatCurrency(monthlyPrice * 12 - yearlyPrice)} al año
        </p>
      )}
    </div>
  )
}

function PriceSummary({
  price,
  billingCycle,
  formatCurrency,
}: {
  price: number
  billingCycle: BillingCycle
  formatCurrency: (value: number) => string
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Total a pagar:</span>
        <span className="text-xl font-bold">{formatCurrency(price)}</span>
      </div>
      {billingCycle === 'yearly' && (
        <p className="text-xs text-muted-foreground mt-1">
          Facturado anualmente
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1">
        Renovación automática cada {billingCycle === 'yearly' ? 'año' : 'mes'}
      </p>
    </div>
  )
}
