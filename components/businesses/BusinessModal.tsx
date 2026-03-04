'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Business,
  BusinessInsert,
  BusinessUpdate,
  BusinessWithAccount,
} from '@/lib/models/business/business'
import { BusinessType } from '@/lib/types/enums'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StateComboBox } from '@/components/ui/state-combobox'
import { CityComboBox } from '@/components/ui/city-combobox'
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
import { Textarea } from '@/components/ui/textarea'
import { X, Image as ImageIcon } from 'lucide-react'
import BusinessStorageService from '@/lib/services/business/business-storage-service'
import { useCurrentUser } from '@/hooks/use-current-user'
import BusinessAccountService from '@/lib/services/business-account/business-account-service'
import { BusinessAccount } from '@/lib/models/business-account/business-account'
import { BUSINESS_TYPES_OPTIONS } from '@/lib/services/business/const/business-type-labels'
import Loading from '../ui/loading'
import PhoneInput from 'react-phone-number-input'

const formSchema = z.object({
  business_account_id: z.string().min(1, 'La cuenta de negocio es requerida'),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional().or(z.literal('')),
  address: z.string().min(1, 'La dirección es requerida'),
  city: z.string().min(1, 'La ciudad es requerida'),
  state: z.string().min(1, 'El departamento es requerido'),
  phone_number: z.string().optional().or(z.literal('')),
  type: z.custom<BusinessType>(),
  timezone: z.string().min(1, 'La zona horaria es requerida'),
})

type BusinessFormValues = z.infer<typeof formSchema>

interface BusinessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  business?: Business | BusinessWithAccount | null
  onSave: (
    data: BusinessInsert | BusinessUpdate,
    logoUrl?: string | null
  ) => Promise<void>
}

export function BusinessModal({
  open,
  onOpenChange,
  business,
  onSave,
}: BusinessModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)

  // Image states
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [galleryCoverFile, setGalleryCoverFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [galleryCoverPreview, setGalleryCoverPreview] = useState<string | null>(
    null
  )

  // Gallery images states
  const [galleryImages, setGalleryImages] = useState<
    { file: File; preview: string }[]
  >([])
  const [isUploadingGallery, setIsUploadingGallery] = useState(false)

  // Business accounts state
  const [businessAccounts, setBusinessAccounts] = useState<BusinessAccount[]>(
    []
  )
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const galleryCoverInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const storageService = useRef(new BusinessStorageService())
  const businessAccountService = useRef(new BusinessAccountService())
  const { role, businessAccountId } = useCurrentUser()

  const isBusinessAdmin = role === 'business_admin'
  const isCompanyAdmin = role === 'company_admin'

  const MAX_GALLERY_IMAGES = 6

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      business_account_id: '',
      name: '',
      description: '',
      address: '',
      city: '',
      state: '',
      phone_number: '',
      type: 'BEAUTY',
      timezone: 'America/Bogota',
    },
  })

  useEffect(() => {
    const loadBusinessData = async () => {
      // Cargar business accounts si es company_admin
      if (isCompanyAdmin) {
        setLoadingAccounts(true)
        const accountsResult = await businessAccountService.current.fetchItems()
        setBusinessAccounts(accountsResult.data)
        setLoadingAccounts(false)
      }

      if (business) {
        // Si el business viene con business_account (BusinessWithAccount), agregarlo a la lista
        // para que el select pueda mostrar el nombre aunque esté deshabilitado
        const businessWithAccount = business as BusinessWithAccount
        if (businessWithAccount.business_account && isCompanyAdmin) {
          const accountName = businessWithAccount.business_account.company_name
          setBusinessAccounts((prev) => {
            // Verificar si la cuenta ya está en la lista
            const exists = prev.some(
              (acc) => acc.id === business.business_account_id
            )
            if (!exists) {
              // Crear un objeto BusinessAccount parcial solo para mostrar en el select
              const partialAccount: BusinessAccount = {
                id: business.business_account_id,
                company_name: accountName,
              } as BusinessAccount
              return [...prev, partialAccount]
            }
            return prev
          })
        }

        form.reset({
          business_account_id: business.business_account_id,
          name: business.name,
          description: business.description || '',
          address: business.address,
          city: business.city,
          state: business.state,
          phone_number: business.phone_number || '',
          type: business.type,
          timezone: business.timezone || 'America/Bogota',
        })
        setLogoPreview(business.logo_url)
        setGalleryCoverPreview(business.gallery_cover_image_url)
      } else {
        // Para business_admin, establecer el business_account_id automáticamente
        // Para company_admin, mantener vacío para que seleccione
        form.reset({
          business_account_id:
            isBusinessAdmin && businessAccountId ? businessAccountId : '',
          name: '',
          description: '',
          address: '',
          city: '',
          state: '',
          phone_number: '',
          type: 'BEAUTY',
          timezone: 'America/Bogota',
        })
        setLogoPreview(null)
      }
      setLogoFile(null)
      setGalleryCoverFile(null)
      setGalleryImages([])
      setUploadError(null)
      setLogoError(null)
    }

    if (open) {
      loadBusinessData()
    }
  }, [business, form, open, isCompanyAdmin, isBusinessAdmin, businessAccountId])

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    imageType: 'logo' | 'galleryCover'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)
    setLogoError(null)

    if (!file.type.startsWith('image/')) {
      setLogoError('El archivo debe ser una imagen')
      return
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setLogoError('La imagen no debe superar los 5MB')
      return
    }

    // Validación de dimensiones para logo
    if (imageType === 'logo') {
      const img = new Image()
      img.onload = () => {
        // Proporción ideal: ~2.67:1 (187x70px)
        const aspectRatio = img.width / img.height
        const idealRatio = 187 / 70 // ~2.67
        const tolerance = 0.5 // Tolerancia de 50%

        if (
          aspectRatio < idealRatio * (1 - tolerance) ||
          aspectRatio > idealRatio * (1 + tolerance)
        ) {
          setLogoError(
            `El logo debe tener proporción horizontal (~2.7:1). Tu imagen es ${img.width}x${img.height} (${aspectRatio.toFixed(1)}:1). Recomendado: 187x70px`
          )
          // No permitir la carga si la proporción es incorrecta
          return
        }

        setLogoFile(file)
        setLogoPreview(img.src)
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        img.src = reader.result as string
      }
      reader.readAsDataURL(file)
    } else {
      setGalleryCoverFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setGalleryCoverPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = (imageType: 'logo' | 'galleryCover') => {
    if (imageType === 'logo') {
      setLogoFile(null)
      setLogoPreview(business?.logo_url || null)
      setLogoError(null)
      if (logoInputRef.current) logoInputRef.current.value = ''
    } else {
      setGalleryCoverFile(null)
      setGalleryCoverPreview(business?.gallery_cover_image_url || null)
      if (galleryCoverInputRef.current) galleryCoverInputRef.current.value = ''
    }
    setUploadError(null)
  }

  const onSubmit = async (data: BusinessFormValues) => {
    setIsSubmitting(true)
    setUploadError(null)

    try {
      let finalLogoUrl = business?.logo_url || null
      let finalGalleryCoverUrl = business?.gallery_cover_image_url || null

      // Solo subir imágenes si estamos editando (ya existe el business.id)
      if (business?.id) {
        if (logoFile) {
          const uploadResult = await storageService.current.uploadLogo(
            logoFile,
            business.id
          )
          if (!uploadResult.success) {
            setUploadError(uploadResult.error || 'Error al subir el logo')
            return
          }
          finalLogoUrl = uploadResult.url || null
        }

        if (galleryCoverFile) {
          const uploadResult = await storageService.current.uploadGalleryCover(
            galleryCoverFile,
            business.id
          )
          if (!uploadResult.success) {
            setUploadError(uploadResult.error || 'Error al subir la portada')
            return
          }
          finalGalleryCoverUrl = uploadResult.url || null
        }
      }

      const saveData: BusinessInsert | BusinessUpdate = {
        ...data,
        description: data.description || null,
        phone_number: data.phone_number || null,
        logo_url: finalLogoUrl,
        timezone: data.timezone,
      }

      await onSave(saveData, finalLogoUrl)
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving business:', error)
      setUploadError('Error al guardar la sucursal')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {business ? 'Editar Sucursal' : 'Crear Sucursal'}
          </DialogTitle>
          <DialogDescription>
            {business
              ? 'Modifica la información de la sucursal'
              : 'Completa la información de la nueva sucursal'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {uploadError && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                <p className="text-sm text-destructive">{uploadError}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Información básica */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Información Básica</h3>

                {/* Selector de Business Account (solo para company_admin) */}
                {isCompanyAdmin && (
                  <FormField
                    control={form.control}
                    name="business_account_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Cuenta de Negocio{' '}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={
                            isSubmitting || loadingAccounts || !!business
                          }
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue
                                placeholder={
                                  loadingAccounts ? (
                                    <Loading />
                                  ) : (
                                    'Selecciona una cuenta'
                                  )
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {businessAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.company_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Campo hidden para business_account_id (solo para business_admin) */}
                {isBusinessAdmin && (
                  <FormField
                    control={form.control}
                    name="business_account_id"
                    render={({ field }) => <input type="hidden" {...field} />}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2 sm:col-span-1">
                        <FormLabel>
                          Nombre <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nombre del salón"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="col-span-2 sm:col-span-1">
                        <FormLabel>
                          Tipo <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BUSINESS_TYPES_OPTIONS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción del salón"
                          rows={3}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <PhoneInput
                          defaultCountry="CO"
                          international
                          countryCallingCodeEditable={false}
                          placeholder="300 123 4567"
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isSubmitting}
                          className="phone-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Zona Horaria <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una zona horaria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="America/Bogota">
                            Bogotá (GMT-5)
                          </SelectItem>
                          <SelectItem value="America/Mexico_City">
                            Ciudad de México (GMT-6)
                          </SelectItem>
                          <SelectItem value="America/New_York">
                            Nueva York (GMT-5)
                          </SelectItem>
                          <SelectItem value="America/Santiago">
                            Santiago (GMT-4)
                          </SelectItem>
                          <SelectItem value="America/Lima">
                            Lima (GMT-5)
                          </SelectItem>
                          <SelectItem value="America/Caracas">
                            Caracas (GMT-4)
                          </SelectItem>
                          <SelectItem value="America/Argentina/Buenos_Aires">
                            Buenos Aires (GMT-3)
                          </SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Logo del Negocio */}
                {business?.id && (
                  <div className="space-y-2">
                    <FormLabel className="text-sm font-medium">
                      Logo Empresarial
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Tamaño recomendado: <strong>187 x 70 px</strong>{' '}
                      (proporción 2.7:1). Se mostrará en la cabecera del menu de
                      la aplicación.
                    </p>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageSelect(e, 'logo')}
                      className="hidden"
                    />
                    <div
                      className="border-2 border-dashed p-4 transition-colors cursor-pointer hover:border-primary"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {logoPreview ? (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Preview con proporción correcta 187x70 */}
                            <div className="w-[94px] h-[35px] rounded overflow-hidden bg-muted/30 flex items-center justify-center flex-shrink-0">
                              <img
                                src={logoPreview}
                                alt="Logo preview"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                Logo cargado
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Click para cambiar la imagen
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                logoInputRef.current?.click()
                              }}
                            >
                              Cambiar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive px-2"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveImage('logo')
                              }}
                              disabled={isSubmitting}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                Seleccionar logo
                              </p>
                              <p className="text-xs text-muted-foreground">
                                PNG, JPG o WEBP • Máx 5MB • 187x70px
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              logoInputRef.current?.click()
                            }}
                          >
                            Examinar
                          </Button>
                        </div>
                      )}
                    </div>
                    {logoError && (
                      <p className="text-xs text-destructive mt-1">
                        {logoError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Ubicación */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Ubicación</h3>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Dirección <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Calle 123 #45-67"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
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
                        <FormLabel>
                          Departamento{' '}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <StateComboBox
                            value={field.value}
                            onChange={(value) => {
                              field.onChange(value)
                              // Reset city when state changes
                              form.setValue('city', '')
                            }}
                            disabled={isSubmitting}
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
                        <FormLabel>
                          Ciudad <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <CityComboBox
                            value={field.value}
                            onChange={field.onChange}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || isUploadingGallery}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isUploadingGallery}
              >
                {(isSubmitting || isUploadingGallery) && <Loading />}
                {isUploadingGallery
                  ? 'Subiendo imágenes...'
                  : business
                    ? 'Actualizar'
                    : 'Crear'}{' '}
                {!isUploadingGallery && 'Sucursal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
