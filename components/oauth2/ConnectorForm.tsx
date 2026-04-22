'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2Icon } from 'lucide-react'
import { useCreateTool, useUpdateTool, useGetTool } from '@/hooks/use-tool-crud'
import { toast } from 'sonner'
import type {
  ToolWithAuthStatus,
  ToolDefinitionPayload,
} from '@/lib/types/oauth2-types'
import {
  type ConnectorAuthState,
  type ConnectorAuthType,
  createDefaultConnectorAuthState,
  getAuthFormStateFromExecutionConfig,
  buildExecutionAuthConfig,
  validateConnectorAuth,
} from '@/components/oauth2/connector-auth-config'

interface ConnectorFormProps {
  agentId: string
  apiBaseUrl: string
  mode: 'create' | 'edit'
  tool?: ToolWithAuthStatus
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ConnectorForm({
  agentId,
  apiBaseUrl,
  mode,
  tool,
  open,
  onOpenChange,
  onSuccess,
}: ConnectorFormProps) {
  const createTool = useCreateTool()
  const updateTool = useUpdateTool()
  const { fetch: fetchTool, isLoading: isGetToolLoading } = useGetTool()

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [toolType, setToolType] = useState('McpRemote')
  const [authType, setAuthType] = useState<ConnectorAuthType>('none')
  const [authState, setAuthState] = useState<ConnectorAuthState>(
    createDefaultConnectorAuthState()
  )
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({})

  const setAuthField = <K extends keyof ConnectorAuthState>(
    field: K,
    value: ConnectorAuthState[K]
  ) => {
    setAuthState((prev) => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    if (!open) return

    let isCurrentRequest = true
    setValidationErrors({})

    if (mode === 'edit' && tool) {
      fetchTool(tool.id, apiBaseUrl)
        .then((data) => {
          if (!isCurrentRequest) return

          setName(data.name || '')
          setUrl(data.url || '')
          setToolType(data.tool_type || 'McpRemote')
          const formState = getAuthFormStateFromExecutionConfig(
            data.execution_config
          )
          setAuthType(formState.authType)
          setAuthState(formState.authState)
        })
        .catch((err) => {
          if (!isCurrentRequest) return

          toast.error('Error al cargar conector', {
            description:
              err instanceof Error
                ? err.message
                : 'No se pudo obtener la configuración del conector',
          })
        })
    } else {
      setName('')
      setUrl('')
      setToolType('McpRemote')
      setAuthType('none')
      setAuthState(createDefaultConnectorAuthState())
    }

    return () => {
      isCurrentRequest = false
    }
  }, [open, mode, tool, fetchTool, apiBaseUrl])

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = 'El nombre es requerido'
    if (!url.trim()) errors.url = 'La URL es requerida'
    else {
      try {
        new URL(url)
      } catch {
        errors.url = 'URL inválida'
      }
    }

    Object.assign(errors, validateConnectorAuth(authType, authState))
    setValidationErrors(errors)

    return Object.keys(errors).length === 0
  }

  const buildPayload = (): ToolDefinitionPayload => {
    const payload: ToolDefinitionPayload = {
      name: name.trim(),
      url: url.trim(),
      tool_type: toolType,
      execution_config: {
        url: url.trim(),
      },
    }

    const authConfig = buildExecutionAuthConfig(authType, authState)
    if (authConfig) {
      payload.execution_config.auth = authConfig
    }

    return payload
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      if (mode === 'create') {
        await createTool.mutate(agentId, buildPayload(), apiBaseUrl)
      } else if (tool) {
        await updateTool.mutate(tool.id, buildPayload(), apiBaseUrl)
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error('Error al guardar', {
        description:
          err instanceof Error ? err.message : 'No se pudo guardar el conector',
      })
    }
  }

  const isLoading =
    createTool.isLoading || updateTool.isLoading || isGetToolLoading

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto px-6"
      >
        <SheetHeader>
          <SheetTitle>
            {mode === 'create' ? 'Agregar Conector' : 'Editar Conector'}
          </SheetTitle>
          <SheetDescription>
            {mode === 'create'
              ? 'Configura un nuevo conector MCP para tu agente.'
              : 'Modifica la configuración del conector.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="connector-name">Nombre</Label>
            <Input
              id="connector-name"
              placeholder="Mi Conector"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {validationErrors.name && (
              <p className="text-xs text-destructive">
                {validationErrors.name}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="connector-url">URL</Label>
            <Input
              id="connector-url"
              placeholder="https://api.example.com/mcp"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            {validationErrors.url && (
              <p className="text-xs text-destructive">{validationErrors.url}</p>
            )}
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <Label>Tipo de Autenticación</Label>
            <Select
              value={authType}
              onValueChange={(value) => setAuthType(value as ConnectorAuthType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  Sin autenticación (Público)
                </SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="api_key">API Key (Header)</SelectItem>
                <SelectItem value="oauth2">OAuth 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {authType === 'bearer' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="connector-bearer-token">Bearer Token</Label>
              <Input
                id="connector-bearer-token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={authState.bearerToken}
                onChange={(e) => setAuthField('bearerToken', e.target.value)}
              />
              {validationErrors.bearerToken && (
                <p className="text-xs text-destructive">
                  {validationErrors.bearerToken}
                </p>
              )}
            </div>
          )}

          {authType === 'api_key' && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="connector-api-key-header">Header</Label>
                <Input
                  id="connector-api-key-header"
                  placeholder="X-API-Key"
                  value={authState.apiKeyHeader}
                  onChange={(e) => setAuthField('apiKeyHeader', e.target.value)}
                />
                {validationErrors.apiKeyHeader && (
                  <p className="text-xs text-destructive">
                    {validationErrors.apiKeyHeader}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="connector-api-key-value">API Key</Label>
                <Input
                  id="connector-api-key-value"
                  type="password"
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
                  value={authState.apiKeyValue}
                  onChange={(e) => setAuthField('apiKeyValue', e.target.value)}
                />
                {validationErrors.apiKeyValue && (
                  <p className="text-xs text-destructive">
                    {validationErrors.apiKeyValue}
                  </p>
                )}
              </div>
            </>
          )}

          {authType === 'oauth2' && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="connector-discovery">OAuth Discovery</Label>
                <Switch
                  id="connector-discovery"
                  checked={authState.discovery}
                  onCheckedChange={(value) => setAuthField('discovery', value)}
                  size="sm"
                />
              </div>

              {!authState.discovery && (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="connector-client-id">Client ID</Label>
                    <Input
                      id="connector-client-id"
                      placeholder="client-id"
                      value={authState.clientId}
                      onChange={(e) => setAuthField('clientId', e.target.value)}
                    />
                    {validationErrors.clientId && (
                      <p className="text-xs text-destructive">
                        {validationErrors.clientId}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="connector-client-secret">
                      Client Secret
                    </Label>
                    <Input
                      id="connector-client-secret"
                      type="password"
                      placeholder="client-secret"
                      value={authState.clientSecret}
                      onChange={(e) =>
                        setAuthField('clientSecret', e.target.value)
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="connector-authorize-url">
                      Authorize URL
                    </Label>
                    <Input
                      id="connector-authorize-url"
                      placeholder="https://auth.example.com/authorize"
                      value={authState.authorizeUrl}
                      onChange={(e) =>
                        setAuthField('authorizeUrl', e.target.value)
                      }
                    />
                    {validationErrors.authorizeUrl && (
                      <p className="text-xs text-destructive">
                        {validationErrors.authorizeUrl}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="connector-token-url">Token URL</Label>
                    <Input
                      id="connector-token-url"
                      placeholder="https://auth.example.com/token"
                      value={authState.tokenUrl}
                      onChange={(e) => setAuthField('tokenUrl', e.target.value)}
                    />
                    {validationErrors.tokenUrl && (
                      <p className="text-xs text-destructive">
                        {validationErrors.tokenUrl}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="connector-scopes">
                  Scopes (separados por coma)
                </Label>
                <Input
                  id="connector-scopes"
                  placeholder="read, write"
                  value={authState.scopes}
                  onChange={(e) => setAuthField('scopes', e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="connector-redirect-uri">Redirect URI</Label>
                <Input
                  id="connector-redirect-uri"
                  placeholder="https://your-app.com/callback"
                  value={authState.redirectUri}
                  onChange={(e) => setAuthField('redirectUri', e.target.value)}
                />
                {validationErrors.redirectUri && (
                  <p className="text-xs text-destructive">
                    {validationErrors.redirectUri}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label>Token Scope</Label>
                <Select
                  value={authState.tokenScope}
                  onValueChange={(value) =>
                    setAuthField(
                      'tokenScope',
                      value as ConnectorAuthState['tokenScope']
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shared">Compartido</SelectItem>
                    <SelectItem value="user">Por usuario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
