'use client'

import { useState, useEffect } from 'react'
import { Mail, AlertTriangle, Infinity, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getAccountEmailLimitInfoAction } from '@/lib/actions/business-account'

interface EmailLimitIndicatorProps {
  businessAccountId: string
}

interface LimitInfo {
  maxEmails: number | null
  emailsSent: number
  emailsRemaining: number | null
  hasReachedLimit: boolean
  isOverridden: boolean
  periodStart: Date
  periodEnd: Date
}

export function EmailLimitIndicator({ businessAccountId }: EmailLimitIndicatorProps) {
  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadLimitInfo()
  }, [businessAccountId])

  const loadLimitInfo = async () => {
    if (!businessAccountId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error: actionError } = await getAccountEmailLimitInfoAction(businessAccountId)
      
      if (actionError) {
        setError(actionError)
        return
      }

      if (data) {
        setLimitInfo(data)
      }
    } catch (err) {
      console.error('Error loading email limit:', err)
      setError('Error al cargar información')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Cargando límite de emails...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!limitInfo) {
    return null
  }

  // Si no hay límite configurado (ilimitado)
  if (limitInfo.maxEmails === null) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Infinity className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Envíos Ilimitados</span>
                <Badge variant="secondary" className="text-xs">Plan Pro</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {limitInfo.emailsSent} emails enviados este período
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const percentage = Math.min(100, (limitInfo.emailsSent / limitInfo.maxEmails) * 100)
  const isNearLimit = percentage >= 80 && percentage < 100
  const isCritical = percentage >= 90

  return (
    <Card className={`${limitInfo.hasReachedLimit ? 'border-destructive' : isCritical ? 'border-orange-400' : isNearLimit ? 'border-yellow-400' : 'border-primary/30'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Límite de Emails
          </CardTitle>
          {limitInfo.isOverridden && (
            <Badge variant="outline" className="text-xs">Personalizado</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Barra de progreso */}
        <div className="space-y-1.5">
          <Progress 
            value={percentage} 
            className="h-2"
            style={{
              backgroundColor: limitInfo.hasReachedLimit ? 'var(--destructive-foreground)' : undefined
            }}
          />
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {limitInfo.emailsSent} usados
            </span>
            <span className={`font-medium ${
              limitInfo.hasReachedLimit ? 'text-destructive' : 
              isCritical ? 'text-orange-600' : 
              isNearLimit ? 'text-yellow-600' : 
              'text-primary'
            }`}>
              {limitInfo.emailsRemaining} disponibles
            </span>
          </div>
        </div>

        {/* Info de límite */}
        <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md">
          <div>
            <p className="text-xs text-muted-foreground">Límite total</p>
            <p className="text-lg font-semibold">{limitInfo.maxEmails}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Disponibles</p>
            <p className={`text-lg font-semibold ${
              limitInfo.hasReachedLimit ? 'text-destructive' : 
              isCritical ? 'text-orange-600' : 
              'text-primary'
            }`}>
              {limitInfo.emailsRemaining}
            </p>
          </div>
        </div>

        {/* Alertas */}
        {limitInfo.hasReachedLimit && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Has alcanzado el límite de emails. Contacta a soporte para aumentar tu límite.
            </AlertDescription>
          </Alert>
        )}

        {isCritical && !limitInfo.hasReachedLimit && (
          <Alert className="py-2 border-orange-400 bg-orange-50 text-orange-900">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-xs text-orange-800">
              Quedan menos del 10% de emails disponibles.
            </AlertDescription>
          </Alert>
        )}

        {isNearLimit && !isCritical && !limitInfo.hasReachedLimit && (
          <Alert className="py-2 border-yellow-400 bg-yellow-50 text-yellow-900">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-xs text-yellow-800">
              Quedan menos del 20% de emails disponibles.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}