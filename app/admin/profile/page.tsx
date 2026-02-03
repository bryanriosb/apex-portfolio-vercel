'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { USER_ROLES } from '@/const/roles'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Camera, Clock, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import type {
  Specialist,
  SpecialistAvailability,
} from '@/lib/models/specialist/specialist'
import type { BusinessHours } from '@/lib/models/business/business-hours'
import type { ServiceCategory } from '@/lib/models/service/service'
import type { DayOfWeek } from '@/lib/types/enums'
import SpecialistService from '@/lib/services/specialist/specialist-service'
import {
  updateSpecialistServiceCategoriesAction,
  syncSpecialistProfilePictureAction,
  fetchSpecialistServiceCategoriesAction,
} from '@/lib/actions/specialist'
import { fetchBusinessHoursAction } from '@/lib/actions/business-hours'
import { fetchServiceCategoriesAction } from '@/lib/actions/service'
import { ServiceCategorySelector } from '@/components/specialists/ServiceCategorySelector'

const profileSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido'),
  last_name: z.string().optional(),
  bio: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface DaySchedule {
  enabled: boolean
  start_time: string
  end_time: string
}

type WeekSchedule = Record<DayOfWeek, DaySchedule>

const DAYS_CONFIG: { key: DayOfWeek; label: string }[] = [
  { key: '1', label: 'Lunes' },
  { key: '2', label: 'Martes' },
  { key: '3', label: 'Miércoles' },
  { key: '4', label: 'Jueves' },
  { key: '5', label: 'Viernes' },
  { key: '6', label: 'Sábado' },
  { key: '0', label: 'Domingo' },
]

const DEFAULT_SCHEDULE: WeekSchedule = {
  '0': { enabled: false, start_time: '09:00', end_time: '18:00' },
  '1': { enabled: true, start_time: '09:00', end_time: '18:00' },
  '2': { enabled: true, start_time: '09:00', end_time: '18:00' },
  '3': { enabled: true, start_time: '09:00', end_time: '18:00' },
  '4': { enabled: true, start_time: '09:00', end_time: '18:00' },
  '5': { enabled: true, start_time: '09:00', end_time: '18:00' },
  '6': { enabled: true, start_time: '09:00', end_time: '13:00' },
}

export default function ProfilePage() {
  const router = useRouter()
  const { role, specialistId, isLoading: isSessionLoading } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [specialist, setSpecialist] = useState<Specialist | null>(null)
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([])
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(
    []
  )
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const isProfessional = role === USER_ROLES.PROFESSIONAL

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      bio: '',
    },
  })

  const loadData = useCallback(async () => {
    if (!specialistId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const service = new SpecialistService()
      const [specialistResult, categories] = await Promise.all([
        service.fetchItem(specialistId),
        fetchServiceCategoriesAction(),
      ])

      if (!specialistResult.success || !specialistResult.data) {
        toast.error('Error al cargar el perfil')
        return
      }

      const specialistData = specialistResult.data
      setSpecialist(specialistData)
      setServiceCategories(categories)

      form.reset({
        first_name: specialistData.first_name,
        last_name: specialistData.last_name || '',
        bio: specialistData.bio || '',
      })

      const businessId = specialistData.business_id || activeBusiness?.id

      const [avail, catIds, hours] = await Promise.all([
        service.getAvailability(specialistData.id),
        fetchSpecialistServiceCategoriesAction(specialistData.id),
        businessId ? fetchBusinessHoursAction(businessId) : Promise.resolve([]),
      ])

      setSelectedCategoryIds(catIds)
      setBusinessHours(hours)

      if (avail.length > 0) {
        const newSchedule = { ...DEFAULT_SCHEDULE }
        Object.keys(newSchedule).forEach((day) => {
          newSchedule[day as DayOfWeek] = {
            enabled: false,
            start_time: '09:00',
            end_time: '18:00',
          }
        })
        avail.forEach((a) => {
          newSchedule[a.day_of_week] = {
            enabled: a.is_available,
            start_time: a.start_time.slice(0, 5),
            end_time: a.end_time.slice(0, 5),
          }
        })
        setSchedule(newSchedule)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Error al cargar el perfil')
    } finally {
      setIsLoading(false)
    }
  }, [specialistId, activeBusiness?.id, form])

  useEffect(() => {
    if (isSessionLoading) return

    if (!isProfessional) {
      router.push('/admin')
      return
    }
    loadData()
  }, [isSessionLoading, isProfessional, router, loadData])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const updateDaySchedule = (day: DayOfWeek, updates: Partial<DaySchedule>) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...updates },
    }))
  }

  const getBusinessHoursForDay = useCallback(
    (day: DayOfWeek) => businessHours.find((bh) => bh.day === day),
    [businessHours]
  )

  const isBusinessOpenOnDay = useCallback(
    (day: DayOfWeek) => {
      const bh = getBusinessHoursForDay(day)
      return bh ? !bh.is_closed : true
    },
    [getBusinessHoursForDay]
  )

  const onSubmit = async (data: ProfileFormData) => {
    if (!specialist) return

    setIsSaving(true)
    try {
      const service = new SpecialistService()

      let avatarUrl = specialist.profile_picture_url

      if (avatarFile) {
        const uploadResult = await service.uploadAvatar(
          specialist.id,
          avatarFile
        )
        if (uploadResult.success && uploadResult.data) {
          avatarUrl = uploadResult.data
        }
      }

      const updateData: Partial<Specialist> = {
        id: specialist.id,
        first_name: data.first_name,
        last_name: data.last_name || null,
        bio: data.bio || null,
        profile_picture_url: avatarUrl,
      }

      const result = await service.updateItem(updateData)
      if (!result.success) {
        throw new Error(result.error)
      }

      if (avatarUrl !== specialist.profile_picture_url) {
        await syncSpecialistProfilePictureAction(specialist.id, avatarUrl)
      }

      const availabilityData: Omit<
        SpecialistAvailability,
        'id' | 'specialist_id'
      >[] = Object.entries(schedule).map(([day, config]) => ({
        day_of_week: day as DayOfWeek,
        start_time: config.start_time,
        end_time: config.end_time,
        is_available: config.enabled,
      }))

      await Promise.all([
        service.updateAvailability(specialist.id, availabilityData),
        updateSpecialistServiceCategoriesAction(
          specialist.id,
          selectedCategoryIds
        ),
      ])

      setSpecialist({
        ...specialist,
        ...updateData,
      })
      setAvatarFile(null)
      setAvatarPreview(null)

      toast.success('Perfil actualizado correctamente')
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el perfil')
    } finally {
      setIsSaving(false)
    }
  }

  const LoadingSkeleton = () => (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-24 hidden sm:block" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-center mb-6">
                <Skeleton className="h-24 w-24 rounded-full" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:block">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="space-y-2">
                {[...Array(7)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Skeleton className="h-12 w-full sm:hidden" />
    </div>
  )

  if (isSessionLoading || isLoading) {
    return <LoadingSkeleton />
  }

  if (!isProfessional) {
    return null
  }

  if (!specialist) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              No se pudo cargar el perfil.
              {!specialistId &&
                ' No se encontró un especialista asociado a tu cuenta.'}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => loadData()}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const displayName = `${specialist.first_name} ${
    specialist.last_name || ''
  }`.trim()
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="p-6 space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Mi Perfil
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Gestiona tu información profesional
              </p>
            </div>
            <Button type="submit" disabled={isSaving} className="hidden sm:flex">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna izquierda - Info y Servicios */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Información Personal</CardTitle>
                  <CardDescription>
                    Actualiza tu foto, nombre y biografía
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative">
                      <Avatar className="h-24 w-24">
                        {(avatarPreview || specialist.profile_picture_url) && (
                          <AvatarImage
                            src={avatarPreview || specialist.profile_picture_url || ''}
                            alt={displayName}
                          />
                        )}
                        <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                      </Avatar>
                      <label
                        htmlFor="avatar-upload"
                        className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                      >
                        <Camera className="h-4 w-4" />
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Correo electrónico
                    </label>
                    <Input value={specialist.email || ''} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">
                      Para cambiar tu correo, contacta al administrador
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isSaving} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apellido</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isSaving} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biografía</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Cuéntanos sobre ti y tu experiencia..."
                            rows={3}
                            disabled={isSaving}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Servicios que realizo
                  </CardTitle>
                  <CardDescription>
                    Selecciona las categorías de servicios que ofreces
                    {selectedCategoryIds.length > 0 && (
                      <span className="ml-1">({selectedCategoryIds.length} seleccionados)</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ServiceCategorySelector
                    categories={serviceCategories}
                    selectedCategoryIds={selectedCategoryIds}
                    onChange={setSelectedCategoryIds}
                    disabled={isSaving}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Columna derecha - Horario */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Mi horario de trabajo
                  </CardTitle>
                  <CardDescription>
                    {Object.values(schedule).filter((d) => d.enabled).length} días activos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {DAYS_CONFIG.map(({ key, label }) => {
                    const businessDay = getBusinessHoursForDay(key)
                    const businessIsOpen = isBusinessOpenOnDay(key)
                    const businessOpenTime = businessDay?.open_time?.slice(0, 5) || '09:00'
                    const businessCloseTime = businessDay?.close_time?.slice(0, 5) || '18:00'

                    return (
                      <div
                        key={key}
                        className={`rounded-lg border p-3 ${
                          !businessIsOpen ? 'opacity-50 bg-muted/50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={schedule[key].enabled && businessIsOpen}
                            onCheckedChange={(checked) => updateDaySchedule(key, { enabled: checked })}
                            disabled={isSaving || !businessIsOpen}
                          />
                          <span className="text-sm font-medium flex-1">{label}</span>
                          {!businessIsOpen && (
                            <span className="text-xs text-muted-foreground">Cerrado</span>
                          )}
                          {businessIsOpen && !schedule[key].enabled && (
                            <span className="text-xs text-muted-foreground">No trabajo</span>
                          )}
                        </div>
                        {businessIsOpen && schedule[key].enabled && (
                          <div className="flex items-center gap-2 mt-2 pl-12">
                            <Input
                              type="time"
                              value={schedule[key].start_time}
                              min={businessOpenTime}
                              max={businessCloseTime}
                              onChange={(e) => updateDaySchedule(key, { start_time: e.target.value })}
                              disabled={isSaving}
                              className="h-8 text-sm"
                            />
                            <span className="text-muted-foreground text-xs">a</span>
                            <Input
                              type="time"
                              value={schedule[key].end_time}
                              min={businessOpenTime}
                              max={businessCloseTime}
                              onChange={(e) => updateDaySchedule(key, { end_time: e.target.value })}
                              disabled={isSaving}
                              className="h-8 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Botón mobile - ancho total */}
          <div className="mt-6 sm:hidden">
            <Button type="submit" disabled={isSaving} className="w-full" size="lg">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
