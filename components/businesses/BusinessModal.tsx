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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  Images,
  Clock,
} from 'lucide-react'
import BusinessStorageService from '@/lib/services/business/business-storage-service'
import { BusinessHoursEditor } from './BusinessHoursEditor'
import { BusinessType } from '@/lib/types/enums'
import { useCurrentUser } from '@/hooks/use-current-user'
import { BusinessGalleryImage } from '@/lib/models/business/business-gallery-image'
import {
  getBusinessGalleryImagesAction,
  createBusinessGalleryImageAction,
  deleteBusinessGalleryImageAction,
} from '@/lib/actions/business-gallery-image'
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
  type: z.enum([
    'AESTHETICS_CENTER',
    'BARBERSHOP',
    'HAIR_SALON',
    'MAKEUP_CENTER',
    'INDEPENDENT',
    'EYEBROWS_EYELASHES_SALON',
    'SPA',
    'MANICURE_PEDICURE_SALON',
    'BEAUTY_SALON',
    'PLASTIC_SURGERY_CENTER',
    'SALON',
    'BEAUTY_STUDIO',
    'CONSULTORY',
  ] as const),
})

type BusinessFormValues = z.infer<typeof formSchema>

interface BusinessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  business?: Business | BusinessWithAccount | null
  onSave: (data: BusinessInsert | BusinessUpdate) => Promise<void>
}

export function BusinessModal({
  open,
  onOpenChange,
  business,
  onSave,
}: BusinessModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

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
  const [existingGalleryImages, setExistingGalleryImages] = useState<
    BusinessGalleryImage[]
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
      type: 'SALON',
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
        })
        setLogoPreview(business.logo_url)
        setGalleryCoverPreview(business.gallery_cover_image_url)

        // Cargar imágenes existentes de galería
        if (business.id) {
          const galleryImages = await getBusinessGalleryImagesAction(
            business.id
          )
          setExistingGalleryImages(galleryImages)
        }
      } else {
        // Para business_admin, establecer el business_account_id automáticamente
        // Para company_admin, mantener vacío para que seleccione
        form.reset({
          business_account_id: isBusinessAdmin && businessAccountId ? businessAccountId : '',
          name: '',
          description: '',
          address: '',
          city: '',
          state: '',
          phone_number: '',
          type: 'SALON',
        })
        setLogoPreview(null)
        setGalleryCoverPreview(null)
        setExistingGalleryImages([])
      }
      setLogoFile(null)
      setGalleryCoverFile(null)
      setGalleryImages([])
      setUploadError(null)
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

    if (!file.type.startsWith('image/')) {
      setUploadError('El archivo debe ser una imagen')
      return
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadError('La imagen no debe superar los 5MB')
      return
    }

    if (imageType === 'logo') {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setLogoPreview(reader.result as string)
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
      if (logoInputRef.current) logoInputRef.current.value = ''
    } else {
      setGalleryCoverFile(null)
      setGalleryCoverPreview(business?.gallery_cover_image_url || null)
      if (galleryCoverInputRef.current) galleryCoverInputRef.current.value = ''
    }
    setUploadError(null)
  }

  const handleGalleryImagesSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setUploadError(null)

    const totalImages =
      existingGalleryImages.length + galleryImages.length + files.length
    if (totalImages > MAX_GALLERY_IMAGES) {
      setUploadError(`Puedes subir máximo ${MAX_GALLERY_IMAGES} imágenes`)
      return
    }

    const validFiles: { file: File; preview: string }[] = []

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setUploadError('Todos los archivos deben ser imágenes')
        return
      }

      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        setUploadError('Las imágenes no deben superar los 5MB')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        validFiles.push({ file, preview: reader.result as string })
        if (validFiles.length === files.length) {
          setGalleryImages((prev) => [...prev, ...validFiles])
        }
      }
      reader.readAsDataURL(file)
    })

    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleRemoveExistingGalleryImage = async (
    imageId: string,
    imageUrl: string
  ) => {
    try {
      // Eliminar de storage
      await storageService.current.deleteImage(imageUrl)

      // Eliminar de la base de datos
      const result = await deleteBusinessGalleryImageAction(imageId)

      if (!result.success) {
        setUploadError(result.error || 'Error al eliminar la imagen')
        return
      }

      setExistingGalleryImages((prev) =>
        prev.filter((img) => img.id !== imageId)
      )
    } catch (error) {
      console.error('Error deleting gallery image:', error)
      setUploadError('Error al eliminar la imagen')
    }
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

        // Subir imágenes de galería
        if (galleryImages.length > 0) {
          setIsUploadingGallery(true)
          let sortOrder = existingGalleryImages.length

          for (const { file } of galleryImages) {
            const uploadResult =
              await storageService.current.uploadGalleryImage(file, business.id)
            if (!uploadResult.success) {
              setUploadError(
                uploadResult.error || 'Error al subir imagen de galería'
              )
              setIsUploadingGallery(false)
              return
            }

            // Guardar la URL en la base de datos
            const createResult = await createBusinessGalleryImageAction({
              business_id: business.id,
              image_url: uploadResult.url!,
              sort_order: sortOrder++,
            })

            if (!createResult.success) {
              setUploadError(
                createResult.error || 'Error al guardar imagen de galería'
              )
              setIsUploadingGallery(false)
              return
            }
          }
          setIsUploadingGallery(false)
          setGalleryImages([]) // Limpiar después de subir
        }
      }

      const saveData: BusinessInsert | BusinessUpdate = {
        ...data,
        description: data.description || null,
        phone_number: data.phone_number || null,
        logo_url: finalLogoUrl,
        gallery_cover_image_url: finalGalleryCoverUrl,
      }

      await onSave(saveData)
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

            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="hours" disabled={!business?.id}>
                  <Clock className="h-4 w-4 mr-1" />
                  Horarios
                </TabsTrigger>
                <TabsTrigger
                  value="gallery"
                  disabled={
                    !business?.id || (!isCompanyAdmin && !isBusinessAdmin)
                  }
                >
                  Galería
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6 mt-4">
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
                      render={({ field }) => (
                        <input type="hidden" {...field} />
                      )}
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

                  {/* Logo del Negocio */}
                  {business?.id && (
                    <div className="space-y-2">
                      <FormLabel>Logo del Negocio</FormLabel>
                      <div className="flex items-start gap-2">
                        <div className="relative w-24 h-24">
                          {logoPreview ? (
                            <>
                              <div
                                className="w-full h-full border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => logoInputRef.current?.click()}
                              >
                                <img
                                  src={logoPreview}
                                  alt="Logo preview"
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md z-10"
                                onClick={() => handleRemoveImage('logo')}
                                disabled={isSubmitting}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <div
                              className="w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => logoInputRef.current?.click()}
                            >
                              <ImageIcon className="h-8 w-8 mb-1" />
                              <span className="text-xs">Subir logo</span>
                            </div>
                          )}
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageSelect(e, 'logo')}
                            className="hidden"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Haz click para {logoPreview ? 'cambiar' : 'subir'} el
                          logo. Tamaño máximo: 5MB
                        </p>
                      </div>
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
              </TabsContent>

              <TabsContent value="hours" className="mt-4">
                <BusinessHoursEditor
                  businessId={business?.id || null}
                  disabled={isSubmitting}
                />
              </TabsContent>

              <TabsContent value="gallery" className="space-y-6 mt-4">
                {!business?.id ? (
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">
                      Guarda la sucursal primero para poder gestionar las
                      imágenes
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Gallery Cover */}
                    <div className="space-y-2">
                      <FormLabel>Imagen de Portada</FormLabel>
                      <div className="flex items-center gap-4">
                        {galleryCoverPreview ? (
                          <div className="relative w-32 h-24 border rounded-lg overflow-hidden">
                            <img
                              src={galleryCoverPreview}
                              alt="Gallery cover preview"
                              className="w-full h-full object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                              onClick={() => handleRemoveImage('galleryCover')}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="w-32 h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-8 w-8" />
                          </div>
                        )}
                        <input
                          ref={galleryCoverInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageSelect(e, 'galleryCover')}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => galleryCoverInputRef.current?.click()}
                          disabled={isSubmitting}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {galleryCoverPreview
                            ? 'Cambiar Portada'
                            : 'Subir Portada'}
                        </Button>
                      </div>
                    </div>

                    {/* Gallery Images */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <FormLabel>Galería de Imágenes</FormLabel>
                        <span className="text-xs text-muted-foreground">
                          {existingGalleryImages.length + galleryImages.length}/
                          {MAX_GALLERY_IMAGES} imágenes
                        </span>
                      </div>

                      {/* Grid de imágenes */}
                      <div className="grid grid-cols-3 gap-4">
                        {/* Imágenes existentes */}
                        {existingGalleryImages.map((img) => (
                          <div
                            key={img.id}
                            className="relative aspect-square border rounded-lg overflow-hidden"
                          >
                            <img
                              src={img.image_url}
                              alt={img.caption || 'Gallery image'}
                              className="w-full h-full object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                              onClick={() =>
                                handleRemoveExistingGalleryImage(
                                  img.id,
                                  img.image_url
                                )
                              }
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}

                        {/* Imágenes nuevas (pendientes de subir) */}
                        {galleryImages.map((img, idx) => (
                          <div
                            key={`new-${idx}`}
                            className="relative aspect-square border rounded-lg overflow-hidden"
                          >
                            <img
                              src={img.preview}
                              alt="New gallery image"
                              className="w-full h-full object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                              onClick={() => handleRemoveGalleryImage(idx)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}

                        {/* Botón para agregar más imágenes */}
                        {existingGalleryImages.length + galleryImages.length <
                          MAX_GALLERY_IMAGES && (
                          <div
                            className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => galleryInputRef.current?.click()}
                          >
                            <Images className="h-8 w-8 mb-1" />
                            <span className="text-xs">Agregar</span>
                          </div>
                        )}
                      </div>

                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryImagesSelect}
                        className="hidden"
                      />

                      <p className="text-xs text-muted-foreground">
                        Puedes subir hasta {MAX_GALLERY_IMAGES} imágenes para la
                        galería. Las imágenes deben ser menores a 5MB.
                      </p>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
            <small>
              Para definir horario e imagenes debes primero crear la sucursal
            </small>

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
