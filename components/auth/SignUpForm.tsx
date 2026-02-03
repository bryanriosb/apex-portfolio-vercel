'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  UserPlus,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { registerBusinessAction } from '@/lib/actions/registration'
import type { BusinessType } from '@/lib/types/enums'
import PhoneInput from 'react-phone-number-input'
import {
  sendEmailVerificationAction,
  sendSMSVerificationAction,
  verifyEmailCodeAction,
  verifySMSCodeAction,
} from '@/lib/actions/verification'
import { VerificationCodeDialog } from './VerificationCodeDialog'
import { ShieldCheck, CheckCircle2 } from 'lucide-react'
import Loading from '../ui/loading'
import { StateComboBox } from '@/components/ui/state-combobox'
import { CityComboBox } from '@/components/ui/city-combobox'

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: 'BEAUTY_SALON', label: 'Salón de Belleza' },
  { value: 'HAIR_SALON', label: 'Peluquería' },
  { value: 'BARBERSHOP', label: 'Barbería' },
  { value: 'SPA', label: 'Spa' },
  { value: 'AESTHETICS_CENTER', label: 'Centro de Estética' },
  { value: 'MANICURE_PEDICURE_SALON', label: 'Salón de Manicure y Pedicure' },
  { value: 'EYEBROWS_EYELASHES_SALON', label: 'Salón de Cejas y Pestañas' },
  { value: 'MAKEUP_CENTER', label: 'Centro de Maquillaje' },
  { value: 'PLASTIC_SURGERY_CENTER', label: 'Centro de Cirugía Plástica' },
  { value: 'INDEPENDENT', label: 'Profesional Independiente' },
  { value: 'CONSULTORY', label: 'Consultorio' },
]

const userSchema = z
  .object({
    fullName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    email: z.string().email('Ingresa un correo electrónico válido'),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

const businessSchema = z.object({
  businessName: z.string().min(2, 'El nombre del negocio es requerido'),
  businessType: z.string().min(1, 'Selecciona el tipo de negocio'),
  professionalCount: z.string().min(1, 'Indica cuántos profesionales'),
  city: z.string().min(1, 'La ciudad es requerida'),
  state: z.string().min(1, 'El departamento es requerido'),
  address: z.string().min(5, 'La dirección es requerida'),
})

const formSchema = userSchema.and(businessSchema)

type FormValues = z.infer<typeof formSchema>

export function SignUpForm() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Estados de verificación
  const [emailVerified, setEmailVerified] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false)
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [showPhoneDialog, setShowPhoneDialog] = useState(false)
  const [lastVerifiedPhone, setLastVerifiedPhone] = useState<string>('')

  // Estados para sessionStorage (solo cliente)
  const [storedEmail, setStoredEmail] = useState<string | null>(null)
  const [storedPhone, setStoredPhone] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      businessName: '',
      businessType: '',
      professionalCount: '',
      city: '',
      state: '',
      address: '',
    },
  })

  // Cargar valores de sessionStorage solo en el cliente
  useEffect(() => {
    const email = sessionStorage.getItem('email')
    const phone = sessionStorage.getItem('phone')

    setStoredEmail(email)
    setStoredPhone(phone)

    // Si hay datos verificados en sessionStorage, establecer las verificaciones como true
    // y cargar los valores en el formulario
    if (email) {
      setEmailVerified(true)
      form.setValue('email', email)
    }
    if (phone) {
      setPhoneVerified(true)
      setLastVerifiedPhone(phone)
      form.setValue('phone', phone)
    }
  }, [form])

  // Observar cambios en el campo de teléfono
  const phoneValue = form.watch('phone')

  // Resetear verificación si el teléfono cambia
  useEffect(() => {
    if (phoneValue && phoneValue !== lastVerifiedPhone && phoneVerified) {
      setPhoneVerified(false)
    }
    // Si no hay teléfono en el formulario, resetear verificación
    if (!phoneValue && phoneVerified) {
      setPhoneVerified(false)
    }
  }, [phoneValue, lastVerifiedPhone, phoneVerified])

  const validateStep1 = async () => {
    const result = await form.trigger([
      'fullName',
      'email',
      'phone',
      'password',
      'confirmPassword',
    ])
    if (result) {
      setStep(2)
    }
  }

  const toCamelCase = (str: string): string => {
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Enviar código de verificación de email
  const handleSendEmailCode = async () => {
    const email = form.getValues('email')
    if (!email) {
      toast.error('Ingresa tu correo electrónico primero')
      return
    }

    setIsVerifyingEmail(true)
    const result = await sendEmailVerificationAction(email)
    setIsVerifyingEmail(false)

    if (result.success) {
      toast.success('Código enviado a tu correo')
      setShowEmailDialog(true)
    } else {
      toast.error(result.error || 'Error al enviar código')
    }
  }

  // Enviar código de verificación de teléfono
  const handleSendPhoneCode = async () => {
    const phone = form.getValues('phone')
    if (!phone) {
      toast.error('Ingresa tu teléfono primero')
      return
    }

    setIsVerifyingPhone(true)
    const result = await sendSMSVerificationAction(phone)
    setIsVerifyingPhone(false)

    if (result.success) {
      toast.success('Código enviado a tu teléfono')
      setShowPhoneDialog(true)
    } else {
      toast.error(result.error || 'Error al enviar código')
    }
  }

  // Verificar código de email
  const handleVerifyEmail = async (code: string) => {
    const email = form.getValues('email')
    const result = await verifyEmailCodeAction(email, code)

    if (result.success) {
      sessionStorage.setItem('email', email)
      setStoredEmail(email)
      setEmailVerified(true)
      setShowEmailDialog(false)
      toast.success('Email verificado correctamente')
    } else {
      toast.error(result.error || 'Código incorrecto')
    }
  }

  // Verificar código de teléfono
  const handleVerifyPhone = async (code: string) => {
    const phone = form.getValues('phone')
    if (!phone) return

    const result = await verifySMSCodeAction(phone, code)

    if (result.success) {
      sessionStorage.setItem('phone', phone)
      setStoredPhone(phone)
      setPhoneVerified(true)
      setLastVerifiedPhone(phone)
      setShowPhoneDialog(false)
      toast.success('Teléfono verificado correctamente')
    } else {
      toast.error(result.error || 'Código incorrecto')
    }
  }

  const onSubmit = async (values: FormValues) => {
    // Validar que email esté verificado
    if (!emailVerified) {
      toast.error('Debes verificar tu correo electrónico')
      return
    }

    // Validar teléfono si fue proporcionado
    if (values.phone && !phoneVerified) {
      toast.error('Debes verificar tu teléfono')
      return
    }
    setIsLoading(true)

    try {
      const result = await registerBusinessAction({
        fullName: toCamelCase(values.fullName),
        email: values.email,
        password: values.password,
        phone: values.phone,
        businessName: toCamelCase(values.businessName),
        businessType: values.businessType as BusinessType,
        professionalCount: parseInt(values.professionalCount),
        city: values.city,
        state: values.state,
        address: toCamelCase(values.address),
      })

      if (result.success) {
        toast.success('¡Cuenta creada exitosamente!', {
          description: 'Ahora puedes iniciar sesión',
          duration: 5000,
          style: {
            background: '#22c55e',
            color: '#ffffff',
            border: 'none',
          },
          className: 'font-medium',
        })
        router.push('/auth/sign-in')
      } else {
        toast.error(result.error || 'Error al crear la cuenta')
      }
    } catch {
      toast.error('Ocurrió un error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <StepIndicator step={1} currentStep={step} label="Tu cuenta" />
          <div className="w-8 h-px bg-border" />
          <StepIndicator step={2} currentStep={step} label="Tu negocio" />
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Juan Pérez"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="tu@email.com"
                        autoComplete="email"
                        disabled={isLoading}
                        className="pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-primary hover:text-primary-foreground"
                        onClick={handleSendEmailCode}
                        disabled={
                          isLoading ||
                          isVerifyingEmail ||
                          emailVerified ||
                          storedEmail === field.value ||
                          !field.value
                        }
                        title="Verificar email"
                      >
                        {emailVerified || storedEmail === field.value ? (
                          <span className="flex gap-2 text-xs">
                            Verificado
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </span>
                        ) : isVerifyingEmail ? (
                          <span className="flex gap-2 text-xs">
                            Enviando...
                            <Loading className="h-3 w-3" />
                          </span>
                        ) : (
                          <span className="flex gap-2">
                            Verificar
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                          </span>
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Es requerida para la verificación del correo.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="[&_.PhoneInput]:outline-none [&_.PhoneInput]:ring-0 [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:ring-0 [&_.PhoneInputInput:focus]:outline-none [&_.PhoneInputInput:focus]:ring-0 [&_.PhoneInputInput:focus-visible]:outline-none [&_.PhoneInputInput:focus-visible]:ring-0">
                        <PhoneInput
                          defaultCountry="CO"
                          international
                          countryCallingCodeEditable={false}
                          placeholder="300 123 4567"
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isLoading}
                          className="phone-input"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-primary hover:text-primary-foreground"
                        onClick={handleSendPhoneCode}
                        disabled={
                          isLoading ||
                          isVerifyingPhone ||
                          phoneVerified ||
                          storedPhone === field.value ||
                          !field.value
                        }
                        title="Verificar teléfono"
                      >
                        {phoneVerified || storedPhone === field.value ? (
                          <span className="flex gap-2 text-xs">
                            Verificado
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </span>
                        ) : isVerifyingPhone ? (
                          <span className="flex gap-2">
                            Enviando...
                            <Loading className="h-3 w-3" />
                          </span>
                        ) : (
                          <span className="flex gap-2">
                            Verificar
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                          </span>
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Es requerida para la verificación del teléfono para
                    continuar
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        disabled={isLoading}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>Mínimo 8 caracteres</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        disabled={isLoading}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="button"
              className="w-full gap-2"
              onClick={validateStep1}
              disabled={isLoading || !emailVerified || !phoneVerified}
            >
              Continuar
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de tu negocio</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Salón de Belleza XYZ"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="businessType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de negocio</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BUSINESS_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="professionalCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    ¿Cuántos profesionales trabajan en tu negocio?
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Solo yo</SelectItem>
                      <SelectItem value="2">2 profesionales</SelectItem>
                      <SelectItem value="3">3 profesionales</SelectItem>
                      <SelectItem value="4">4 profesionales</SelectItem>
                      <SelectItem value="5">5 profesionales</SelectItem>
                      <SelectItem value="10">6-10 profesionales</SelectItem>
                      <SelectItem value="20">11-20 profesionales</SelectItem>
                      <SelectItem value="50">
                        Más de 20 profesionales
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Esto nos ayuda a personalizar tu experiencia
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <FormControl>
                      <StateComboBox
                        value={field.value}
                        onChange={(value, selectedState) => {
                          field.onChange(value)
                          // Reset city when state changes
                          form.setValue('city', '')
                        }}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <CityComboBox
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Calle 123 #45-67"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => setStep(1)}
                disabled={isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                Atrás
              </Button>

              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Diálogo de verificación de email */}
      <VerificationCodeDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        type="email"
        value={form.getValues('email')}
        onVerify={handleVerifyEmail}
      />

      {/* Diálogo de verificación de teléfono */}
      <VerificationCodeDialog
        open={showPhoneDialog}
        onOpenChange={setShowPhoneDialog}
        type="phone"
        value={form.getValues('phone') || ''}
        onVerify={handleVerifyPhone}
      />
    </Form>
  )
}

function StepIndicator({
  step,
  currentStep,
  label,
}: {
  step: number
  currentStep: number
  label: string
}) {
  const isActive = currentStep === step
  const isCompleted = currentStep > step

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary text-primary-foreground'
            : isCompleted
            ? 'bg-primary/20 text-primary'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {isCompleted ? '✓' : step}
      </div>
      <span
        className={`text-xs ${
          isActive ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {label}
      </span>
    </div>
  )
}
