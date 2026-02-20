'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useUnifiedPermissionsStore } from '@/lib/store/unified-permissions-store'
import { useCurrentUser } from '@/hooks/use-current-user'
import { USER_ROLES } from '@/const/roles'
import {
  getAllFeaturePermissionsAction,
} from '@/lib/actions/plan'
import type { FeaturePermission, ModuleCode } from '@/lib/models/plan/feature-permissions'

export interface FeaturePermissionResult {
  hasPermission: boolean
  isLoading: boolean
}

export interface ModuleFeaturePermissions {
  [featureKey: string]: boolean
}

const FULL_PERMISSION: FeaturePermissionResult = {
  hasPermission: true,
  isLoading: false,
}

export function useFeaturePermission(
  moduleCode: ModuleCode,
  featureKey: FeaturePermission
): FeaturePermissionResult {
  const { hasFeaturePermission, isLoading } = useUnifiedPermissionsStore()
  const { role } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  // COMPANY_ADMIN tiene acceso completo
  if (isCompanyAdmin) {
    return FULL_PERMISSION
  }

  // Si no hay business activo, denegar acceso
  if (!activeBusiness?.business_account_id) {
    return { hasPermission: false, isLoading: false }
  }

  const hasPermission = hasFeaturePermission(moduleCode, featureKey)

  return {
    hasPermission,
    isLoading: isLoading,
  }
}

export function useModuleFeaturePermissions(
  moduleCode: ModuleCode
): {
  permissions: ModuleFeaturePermissions
  isLoading: boolean
  hasPermission: (featureKey: string) => boolean
} {
  const { activeBusiness } = useActiveBusinessStore()
  const { role } = useCurrentUser()
  const [permissions, setPermissions] = useState<ModuleFeaturePermissions>({})
  const [isLoading, setIsLoading] = useState(true)

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  useEffect(() => {
    if (isCompanyAdmin) {
      setPermissions({})
      setIsLoading(false)
      return
    }

    const fetchPermissions = async () => {
      if (!activeBusiness?.business_account_id) {
        setPermissions({})
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const fetchedPermissions = await getAllFeaturePermissionsAction(
          activeBusiness.business_account_id,
          moduleCode
        )

        setPermissions(fetchedPermissions)
      } catch (error) {
        console.error(
          `Error fetching feature permissions for ${moduleCode}:`,
          error
        )
        setPermissions({})
      } finally {
        setIsLoading(false)
      }
    }

    fetchPermissions()
  }, [activeBusiness?.business_account_id, moduleCode, isCompanyAdmin])

  const hasPermission = useCallback(
    (featureKey: string): boolean => {
      if (isCompanyAdmin) return true
      return permissions[featureKey] === true
    },
    [permissions, isCompanyAdmin]
  )

  return {
    permissions,
    isLoading,
    hasPermission,
  }
}

export function useMultipleFeaturePermissions(
  checks: Array<{ module: ModuleCode; feature: FeaturePermission }>
): {
  permissions: Record<string, boolean>
  isLoading: boolean
  hasAllPermissions: boolean
} {
  const { hasFeaturePermission, isLoading } = useUnifiedPermissionsStore()
  const { role } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  const permissions = useMemo(() => {
    if (isCompanyAdmin) {
      return checks.reduce(
        (acc, check) => ({
          ...acc,
          [`${check.module}.${check.feature}`]: true,
        }),
        {}
      )
    }

    if (!activeBusiness?.business_account_id) {
      return checks.reduce(
        (acc, check) => ({
          ...acc,
          [`${check.module}.${check.feature}`]: false,
        }),
        {}
      )
    }

    return checks.reduce((acc, check) => {
      const hasPermission = hasFeaturePermission(check.module, check.feature)
      return {
        ...acc,
        [`${check.module}.${check.feature}`]: hasPermission,
      }
    }, {})
  }, [checks, hasFeaturePermission, isCompanyAdmin, activeBusiness?.business_account_id])

  const hasAllPermissions = useMemo(() => {
    if (isCompanyAdmin) return true
    return Object.values(permissions).every((p) => p === true)
  }, [permissions, isCompanyAdmin])

  return {
    permissions,
    isLoading: isLoading && !isCompanyAdmin,
    hasAllPermissions,
  }
}

export interface FeatureMetadata {
  name: string
  description: string
  requiredPlan: string[]
}

export interface FeatureMetadataResult {
  metadata: FeatureMetadata | null
  isLoading: boolean
}



export function useFeatureMetadata(
  moduleCode: ModuleCode,
  featureKey: FeaturePermission
): FeatureMetadataResult {
  const { getFeatureMetadata, isLoading } = useUnifiedPermissionsStore()
  const { role } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  // COMPANY_ADMIN no necesita metadata pero se la proporcionamos por consistencia
  if (isCompanyAdmin) {
    return {
      metadata: {
        name: featureKey,
        description: '',
        requiredPlan: []
      },
      isLoading: false,
    }
  }

  // Si no hay business activo, no hay metadata
  if (!activeBusiness?.business_account_id) {
    return { metadata: null, isLoading: false }
  }

  const metadata = getFeatureMetadata(moduleCode, featureKey)

  return {
    metadata,
    isLoading: isLoading,
  }
}