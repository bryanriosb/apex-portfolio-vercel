'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type {
  Plan,
  PlanModule,
  PlanModuleAccess,
  PlanModuleAccessInsert,
} from '@/lib/models/plan/plan'
import {
  Loader2,
  Package,
  ChevronDown,
  Settings2,
  Plus,
  X,
  Pencil,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import PlanService from '@/lib/services/plan/plan-service'
import { toast } from 'sonner'

interface PlanModulesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: Plan | null
}

interface FeatureMetadata {
  name: string
  description: string
  requiredPlan: string[]
}

interface ModuleAccessState {
  moduleId: string
  enabled: boolean
  canRead: boolean
  canWrite: boolean
  canDelete: boolean
  customPermissions: Record<string, boolean>
  featuresMetadata: Record<string, FeatureMetadata>
}

interface NewPermissionState {
  [moduleId: string]: {
    key: string
    name: string
    description: string
    requiredPlan: string | string[]
  }
}

export function PlanModulesModal({
  open,
  onOpenChange,
  plan,
}: PlanModulesModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [modules, setModules] = useState<PlanModule[]>([])
  const [moduleAccess, setModuleAccess] = useState<ModuleAccessState[]>([])
  const [newPermissions, setNewPermissions] = useState<NewPermissionState>({})
  const [editingPermission, setEditingPermission] = useState<{
    moduleId: string
    featureKey: string
  } | null>(null)
  const planService = new PlanService()

  const loadData = useCallback(async () => {
    if (!plan) return

    setIsLoading(true)
    try {
      const [allModules, currentAccess] = await Promise.all([
        planService.fetchActiveModules(),
        planService.fetchModuleAccess(plan.id),
      ])

      setModules(allModules)

      const accessState: ModuleAccessState[] = allModules.map((module) => {
        const existing = currentAccess.find((a) => a.module_id === module.id)
        return {
          moduleId: module.id,
          enabled: !!existing,
          canRead: existing?.can_read ?? true,
          canWrite: existing?.can_write ?? true,
          canDelete: existing?.can_delete ?? true,
          customPermissions:
            (existing?.custom_permissions as Record<string, boolean>) || {},
          featuresMetadata:
            (existing?.features_metadata as Record<string, FeatureMetadata>) ||
            {},
        }
      })

      setModuleAccess(accessState)
    } catch (error) {
      console.error('Error loading modules:', error)
      toast.error('Error al cargar los módulos')
    } finally {
      setIsLoading(false)
    }
  }, [plan])

  useEffect(() => {
    if (open && plan) {
      loadData()
    }
  }, [open, plan, loadData])

  const toggleModule = (moduleId: string) => {
    setModuleAccess((prev) =>
      prev.map((access) =>
        access.moduleId === moduleId
          ? { ...access, enabled: !access.enabled }
          : access
      )
    )
  }

  const updatePermission = (
    moduleId: string,
    permission: 'canRead' | 'canWrite' | 'canDelete',
    value: boolean
  ) => {
    setModuleAccess((prev) =>
      prev.map((access) =>
        access.moduleId === moduleId
          ? { ...access, [permission]: value }
          : access
      )
    )
  }

  const updateCustomPermission = (
    moduleId: string,
    featureKey: string,
    value: boolean
  ) => {
    setModuleAccess((prev) =>
      prev.map((access) =>
        access.moduleId === moduleId
          ? {
            ...access,
            customPermissions: {
              ...access.customPermissions,
              [featureKey]: value,
            },
          }
          : access
      )
    )
  }

  const addCustomPermission = (moduleId: string) => {
    const newPerm = newPermissions[moduleId]
    if (!newPerm?.key.trim()) {
      toast.error('Debes ingresar una clave para el permiso')
      return
    }

    if (!newPerm?.name.trim()) {
      toast.error('Debes ingresar un nombre para el permiso')
      return
    }

    // Validate key format (snake_case)
    if (!/^[a-z][a-z0-9_]*$/.test(newPerm.key)) {
      toast.error('La clave debe estar en formato snake_case (ej: mi_permiso)')
      return
    }

    const access = moduleAccess.find((a) => a.moduleId === moduleId)
    if (access?.customPermissions[newPerm.key] !== undefined) {
      toast.error('Ya existe un permiso con esa clave')
      return
    }

    // Convert string to array if needed
    const requiredPlanArray =
      typeof newPerm.requiredPlan === 'string'
        ? newPerm.requiredPlan
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
        : newPerm.requiredPlan || []

    setModuleAccess((prev) =>
      prev.map((access) =>
        access.moduleId === moduleId
          ? {
            ...access,
            customPermissions: {
              ...access.customPermissions,
              [newPerm.key]: false,
            },
            featuresMetadata: {
              ...access.featuresMetadata,
              [newPerm.key]: {
                name: newPerm.name,
                description: newPerm.description || '',
                requiredPlan: requiredPlanArray,
              },
            },
          }
          : access
      )
    )

    // Clear input
    setNewPermissions((prev) => ({
      ...prev,
      [moduleId]: { key: '', name: '', description: '', requiredPlan: '' },
    }))

    toast.success('Permiso personalizado agregado')
  }

  const removeCustomPermission = (moduleId: string, featureKey: string) => {
    setModuleAccess((prev) =>
      prev.map((access) => {
        if (access.moduleId === moduleId) {
          const { [featureKey]: removedPerm, ...restPermissions } =
            access.customPermissions
          const { [featureKey]: removedMeta, ...restMetadata } =
            access.featuresMetadata
          return {
            ...access,
            customPermissions: restPermissions,
            featuresMetadata: restMetadata,
          }
        }
        return access
      })
    )

    toast.success('Permiso eliminado')
  }

  const updateNewPermissionInput = (
    moduleId: string,
    field: 'key' | 'name' | 'description' | 'requiredPlan',
    value: string | string[]
  ) => {
    setNewPermissions((prev) => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || {
          key: '',
          name: '',
          description: '',
          requiredPlan: '',
        }),
        [field]: value,
      },
    }))
  }

  const updateFeatureMetadata = (
    moduleId: string,
    featureKey: string,
    metadata: FeatureMetadata
  ) => {
    setModuleAccess((prev) =>
      prev.map((access) =>
        access.moduleId === moduleId
          ? {
            ...access,
            featuresMetadata: {
              ...access.featuresMetadata,
              [featureKey]: metadata,
            },
          }
          : access
      )
    )
  }

  const startEditingPermission = (moduleId: string, featureKey: string) => {
    const access = moduleAccess.find((a) => a.moduleId === moduleId)
    const metadata = access?.featuresMetadata[featureKey]

    if (metadata) {
      setEditingPermission({ moduleId, featureKey })
      setNewPermissions((prev) => ({
        ...prev,
        [moduleId]: {
          key: featureKey,
          name: metadata.name,
          description: metadata.description,
          requiredPlan: metadata.requiredPlan.join(', '),
        },
      }))

      // Scroll to form after state update
      setTimeout(() => {
        const formElement = document.getElementById(
          `permission-form-${moduleId}`
        )
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 100)
    }
  }

  const saveEditedPermission = (moduleId: string) => {
    if (!editingPermission) return

    const newPerm = newPermissions[moduleId]
    if (!newPerm?.name.trim()) {
      toast.error('Debes ingresar un nombre para el permiso')
      return
    }

    const requiredPlanArray =
      typeof newPerm.requiredPlan === 'string'
        ? newPerm.requiredPlan
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
        : newPerm.requiredPlan || []

    updateFeatureMetadata(moduleId, editingPermission.featureKey, {
      name: newPerm.name,
      description: newPerm.description || '',
      requiredPlan: requiredPlanArray,
    })

    setEditingPermission(null)
    setNewPermissions((prev) => ({
      ...prev,
      [moduleId]: { key: '', name: '', description: '', requiredPlan: '' },
    }))

    toast.success('Permiso actualizado correctamente')
  }

  const cancelEditingPermission = (moduleId: string) => {
    setEditingPermission(null)
    setNewPermissions((prev) => ({
      ...prev,
      [moduleId]: { key: '', name: '', description: '', requiredPlan: '' },
    }))
  }

  const handleSave = async () => {
    if (!plan) return

    setIsSaving(true)
    try {
      const accessData: PlanModuleAccessInsert[] = moduleAccess
        .filter((access) => access.enabled)
        .map((access) => ({
          plan_id: plan.id,
          module_id: access.moduleId,
          can_read: access.canRead,
          can_write: access.canWrite,
          can_delete: access.canDelete,
          custom_permissions:
            Object.keys(access.customPermissions).length > 0
              ? access.customPermissions
              : null,
          features_metadata:
            Object.keys(access.featuresMetadata).length > 0
              ? access.featuresMetadata
              : null,
        }))

      const result = await planService.setModuleAccess(plan.id, accessData)
      if (result.success) {
        toast.success('Módulos actualizados correctamente')
        onOpenChange(false)
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar los módulos')
    } finally {
      setIsSaving(false)
    }
  }

  const getModuleAccess = (moduleId: string) =>
    moduleAccess.find((a) => a.moduleId === moduleId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Configurar Módulos</DialogTitle>
          <DialogDescription>
            {plan
              ? `Selecciona los módulos disponibles para el plan "${plan.name}"`
              : 'Cargando...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-4">
              {modules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay módulos disponibles</p>
                  <p className="text-sm">
                    Crea módulos primero desde la configuración
                  </p>
                </div>
              ) : (
                modules.map((module) => {
                  const access = getModuleAccess(module.id)
                  const isEnabled = access?.enabled ?? false

                  console.log('access', access)

                  return (
                    <div
                      key={module.id}
                      className="rounded-lg border p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`module-${module.id}`}
                            checked={isEnabled}
                            onCheckedChange={() => toggleModule(module.id)}
                          />
                          <div>
                            <Label
                              htmlFor={`module-${module.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {module.name}
                            </Label>
                            {module.description && (
                              <p className="text-xs text-muted-foreground">
                                {module.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {module.code}
                        </code>
                      </div>

                      {isEnabled && (
                        <>
                          <Separator />
                          <div className="grid grid-cols-3 gap-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`read-${module.id}`}
                                checked={access?.canRead ?? true}
                                onCheckedChange={(v) =>
                                  updatePermission(module.id, 'canRead', v)
                                }
                              />
                              <Label
                                htmlFor={`read-${module.id}`}
                                className="text-sm"
                              >
                                Lectura
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`write-${module.id}`}
                                checked={access?.canWrite ?? true}
                                onCheckedChange={(v) =>
                                  updatePermission(module.id, 'canWrite', v)
                                }
                              />
                              <Label
                                htmlFor={`write-${module.id}`}
                                className="text-sm"
                              >
                                Escritura
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`delete-${module.id}`}
                                checked={access?.canDelete ?? true}
                                onCheckedChange={(v) =>
                                  updatePermission(module.id, 'canDelete', v)
                                }
                              />
                              <Label
                                htmlFor={`delete-${module.id}`}
                                className="text-sm"
                              >
                                Eliminar
                              </Label>
                            </div>
                          </div>

                          {/* Permisos Granulares - Disponible para TODOS los módulos */}
                          <Collapsible>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-between mt-2"
                              >
                                <span className="flex items-center gap-2">
                                  <Settings2 className="h-4 w-4" />
                                  Permisos Granulares
                                  {access?.customPermissions &&
                                    Object.keys(access.customPermissions)
                                      .length > 0 && (
                                      <span className="ml-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                        {
                                          Object.keys(access.customPermissions)
                                            .length
                                        }
                                      </span>
                                    )}
                                </span>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-3 space-y-3">
                              <p className="text-xs text-muted-foreground">
                                Controla el acceso a funcionalidades específicas
                                dentro del módulo
                              </p>

                              {/* Todos los permisos configurados */}
                              {access?.featuresMetadata &&
                                Object.keys(access.featuresMetadata).length >
                                0 && (
                                  <>
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">
                                        Permisos Configurados
                                      </p>
                                      {Object.entries(
                                        access.featuresMetadata
                                      ).map(([featureKey, metadata]) => (
                                        <div
                                          key={featureKey}
                                          className="flex items-start justify-between py-2 px-3 rounded bg-muted/50"
                                        >
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <Label
                                                htmlFor={`${module.id}-${featureKey}`}
                                                className="text-sm font-medium cursor-pointer"
                                              >
                                                {metadata.name}
                                              </Label>
                                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded border">
                                                {featureKey}
                                              </code>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                              {metadata.description}
                                            </p>
                                            {metadata.requiredPlan &&
                                              metadata.requiredPlan.length >
                                              0 && (
                                                <p className="text-xs text-primary mt-1">
                                                  Planes:{' '}
                                                  {metadata.requiredPlan.join(
                                                    ', '
                                                  )}
                                                </p>
                                              )}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Switch
                                              id={`${module.id}-${featureKey}`}
                                              checked={
                                                access?.customPermissions?.[
                                                featureKey
                                                ] ?? false
                                              }
                                              onCheckedChange={(v) =>
                                                updateCustomPermission(
                                                  module.id,
                                                  featureKey,
                                                  v
                                                )
                                              }
                                            />
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8"
                                              onClick={() =>
                                                startEditingPermission(
                                                  module.id,
                                                  featureKey
                                                )
                                              }
                                              title="Editar permiso"
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8"
                                              onClick={() =>
                                                removeCustomPermission(
                                                  module.id,
                                                  featureKey
                                                )
                                              }
                                              title="Eliminar permiso"
                                            >
                                              <X className="h-4 w-4 text-destructive" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <Separator />
                                  </>
                                )}

                              {/* Formulario para agregar/edit permiso */}
                              <div
                                id={`permission-form-${module.id}`}
                                className="space-y-3 pt-2"
                              >
                                <p className="text-xs font-medium text-muted-foreground">
                                  {editingPermission?.moduleId === module.id
                                    ? 'Editar Permiso'
                                    : 'Agregar Nuevo Permiso'}
                                </p>
                                <div className="space-y-3">
                                  {editingPermission?.moduleId !==
                                    module.id && (
                                      <div>
                                        <Label
                                          htmlFor={`new-key-${module.id}`}
                                          className="text-xs"
                                        >
                                          Clave (requerido)
                                        </Label>
                                        <Input
                                          id={`new-key-${module.id}`}
                                          placeholder="clave_del_permiso"
                                          value={
                                            newPermissions[module.id]?.key || ''
                                          }
                                          onChange={(e) =>
                                            updateNewPermissionInput(
                                              module.id,
                                              'key',
                                              e.target.value
                                            )
                                          }
                                          className="text-sm mt-1"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Formato snake_case (ej: enviar_reportes)
                                        </p>
                                      </div>
                                    )}
                                  {editingPermission?.moduleId ===
                                    module.id && (
                                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded p-2">
                                        <p className="text-xs text-muted-foreground mb-1">
                                          Editando permiso:
                                        </p>
                                        <code className="text-xs font-medium">
                                          {editingPermission.featureKey}
                                        </code>
                                      </div>
                                    )}
                                  <div>
                                    <Label
                                      htmlFor={`new-name-${module.id}`}
                                      className="text-xs"
                                    >
                                      Nombre (requerido)
                                    </Label>
                                    <Input
                                      id={`new-name-${module.id}`}
                                      placeholder="Nombre del permiso"
                                      value={
                                        newPermissions[module.id]?.name || ''
                                      }
                                      onChange={(e) =>
                                        updateNewPermissionInput(
                                          module.id,
                                          'name',
                                          e.target.value
                                        )
                                      }
                                      className="text-sm mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label
                                      htmlFor={`new-description-${module.id}`}
                                      className="text-xs"
                                    >
                                      Descripción (opcional)
                                    </Label>
                                    <Input
                                      id={`new-description-${module.id}`}
                                      placeholder="Descripción del permiso"
                                      value={
                                        newPermissions[module.id]
                                          ?.description || ''
                                      }
                                      onChange={(e) =>
                                        updateNewPermissionInput(
                                          module.id,
                                          'description',
                                          e.target.value
                                        )
                                      }
                                      className="text-sm mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label
                                      htmlFor={`new-plans-${module.id}`}
                                      className="text-xs"
                                    >
                                      Planes requeridos (opcional)
                                    </Label>
                                    <Input
                                      id={`new-plans-${module.id}`}
                                      placeholder="free, basic, pro, enterprise (separados por coma)"
                                      value={(() => {
                                        const plans =
                                          newPermissions[module.id]
                                            ?.requiredPlan
                                        if (Array.isArray(plans)) {
                                          return plans.join(', ')
                                        }
                                        return plans || ''
                                      })()}
                                      onChange={(e) =>
                                        updateNewPermissionInput(
                                          module.id,
                                          'requiredPlan',
                                          e.target.value
                                        )
                                      }
                                      className="text-sm mt-1"
                                    />
                                  </div>
                                  {editingPermission?.moduleId === module.id ? (
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() =>
                                          cancelEditingPermission(module.id)
                                        }
                                      >
                                        Cancelar
                                      </Button>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() =>
                                          saveEditedPermission(module.id)
                                        }
                                      >
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Guardar Cambios
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full"
                                      onClick={() =>
                                        addCustomPermission(module.id)
                                      }
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      Agregar Permiso
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
