'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Loading from '@/components/ui/loading'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Activity,
  Search,
  Plus,
  Pencil,
  Trash2,
  Play,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import type { IntegrationsService } from '@/lib/services/integrations/integrations-service'
import type { IntegrationConfig } from '@/lib/models/integrations/integration-config'
import type { ConnectorOperationResponse } from '@/lib/services/integrations/integrations-types'

type OperationMode = 'fetch' | 'create' | 'update' | 'delete'

interface ConnectorOperationsPanelProps {
  service: IntegrationsService | null
  configs: IntegrationConfig[]
  connectors: string[]
}

export function ConnectorOperationsPanel({
  service,
  configs,
  connectors,
}: ConnectorOperationsPanelProps) {
  const [selectedConnector, setSelectedConnector] = useState<string>('')
  const [mode, setMode] = useState<OperationMode>('fetch')
  const [table, setTable] = useState('')
  const [filters, setFilters] = useState('{}')
  const [records, setRecords] = useState('[]')
  const [ids, setIds] = useState('')
  const [updateData, setUpdateData] = useState('{}')
  const [limit, setLimit] = useState('10')
  const [offset, setOffset] = useState('0')
  const [order, setOrder] = useState('')
  const [result, setResult] = useState<ConnectorOperationResponse | null>(null)
  const [health, setHealth] = useState<{ healthy: boolean; message: string } | null>(null)
  const [loadingHealth, setLoadingHealth] = useState(false)
  const [loadingOperation, setLoadingOperation] = useState(false)

  const configuredConnectorIds = new Set(configs.map((c) => c.connector_id))
  const availableConnectors = connectors.filter((c) => configuredConnectorIds.has(c))

  const handleHealthCheck = async () => {
    if (!service) return
    if (!selectedConnector) {
      toast.error('Selecciona un conector primero')
      return
    }
    setLoadingHealth(true)
    setHealth(null)
    try {
      const response = await service.checkHealth(selectedConnector)
      setHealth(response)
      toast.success(response.healthy ? 'Conexión saludable' : 'Conexión con problemas')
    } catch (error) {
      setHealth({ healthy: false, message: 'Error al verificar conexión' })
      toast.error('Ocurrió un error al verificar la conexión con el conector')
    } finally {
      setLoadingHealth(false)
    }
  }

  const safeJsonParse = (value: string, fallback: unknown) => {
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }

  const parseIds = (value: string): string[] => {
    const parsed = safeJsonParse(value, [])
    if (Array.isArray(parsed)) return parsed.map(String)
    return value.split(',').map((s) => s.trim()).filter(Boolean)
  }

  const handleExecute = async () => {
    if (!service) return
    if (!selectedConnector) {
      toast.error('Selecciona un conector primero')
      return
    }
    if (!table.trim()) {
      toast.error('El campo tabla es obligatorio')
      return
    }

    setLoadingOperation(true)
    setResult(null)
    try {
      let response: ConnectorOperationResponse
      switch (mode) {
        case 'fetch':
          response = await service.fetchRecords(selectedConnector, {
            table,
            filters: safeJsonParse(filters, {}),
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
            order: order || undefined,
          })
          break
        case 'create':
          response = await service.createRecords(selectedConnector, {
            table,
            records: safeJsonParse(records, []),
          })
          break
        case 'update':
          response = await service.updateRecords(selectedConnector, {
            table,
            ids: parseIds(ids),
            data: safeJsonParse(updateData, {}),
          })
          break
        case 'delete':
          response = await service.deleteRecords(selectedConnector, {
            table,
            ids: parseIds(ids),
          })
          break
        default:
          throw new Error('Modo no soportado')
      }
      setResult(response)
      toast.success('Operación ejecutada')
    } catch (error) {
      toast.error('Ocurrió un error al ejecutar la operación')
    } finally {
      setLoadingOperation(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1 space-y-2">
          <Label>Conector</Label>
          <Select value={selectedConnector} onValueChange={setSelectedConnector}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un conector configurado" />
            </SelectTrigger>
            <SelectContent>
              {availableConnectors.length === 0 && (
                <div className="p-2 text-sm text-muted-foreground">
                  No hay conectores configurados
                </div>
              )}
              {availableConnectors.map((connector) => (
                <SelectItem key={connector} value={connector}>
                  {connector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          onClick={handleHealthCheck}
          disabled={loadingHealth || !selectedConnector}
        >
          {loadingHealth ? (
            <Loading className="mr-2 h-4 w-4" />
          ) : (
            <Activity className="mr-2 h-4 w-4" />
          )}
          Verificar conexión
        </Button>
      </div>

      {health && (
        <div
          className={`flex items-center gap-2 border p-3 text-sm ${
            health.healthy
              ? 'border-green-500/30 bg-green-500/10 text-green-600'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {health.healthy ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{health.message}</span>
        </div>
      )}

      <div className="space-y-4">
        <Tabs value={mode} onValueChange={(value) => setMode(value as OperationMode)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="fetch" className="gap-1">
              <Search className="h-3.5 w-3.5" />
              Leer
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Crear
            </TabsTrigger>
            <TabsTrigger value="update" className="gap-1">
              <Pencil className="h-3.5 w-3.5" />
              Actualizar
            </TabsTrigger>
            <TabsTrigger value="delete" className="gap-1">
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="table">Tabla / Recurso</Label>
          <Input
            id="table"
            placeholder="account.move"
            value={table}
            onChange={(e) => setTable(e.target.value)}
          />
        </div>

        {mode === 'fetch' && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Límite</Label>
                <Input
                  type="number"
                  placeholder="10"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Offset</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={offset}
                  onChange={(e) => setOffset(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Orden</Label>
                <Input
                  placeholder="id desc"
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filters">Filtros (JSON)</Label>
              <Textarea
                id="filters"
                placeholder='{"move_type": "out_invoice", "state": "posted"}'
                className="min-h-[100px] font-mono text-sm resize-none"
                value={filters}
                onChange={(e) => setFilters(e.target.value)}
              />
            </div>
          </>
        )}

        {mode === 'create' && (
          <div className="space-y-2">
            <Label htmlFor="records">Registros (JSON array)</Label>
            <Textarea
              id="records"
              placeholder='[{"name": "Cliente Nuevo", "email": "hola@ejemplo.com"}]'
              className="min-h-[160px] font-mono text-sm resize-none"
              value={records}
              onChange={(e) => setRecords(e.target.value)}
            />
          </div>
        )}

        {(mode === 'update' || mode === 'delete') && (
          <>
            <div className="space-y-2">
              <Label htmlFor="ids">IDs (array JSON o separados por coma)</Label>
              <Input
                id="ids"
                placeholder='["1501", "1502"]'
                value={ids}
                onChange={(e) => setIds(e.target.value)}
              />
            </div>
            {mode === 'update' && (
              <div className="space-y-2">
                <Label htmlFor="updateData">Datos a actualizar (JSON)</Label>
                <Textarea
                  id="updateData"
                  placeholder='{"phone": "+573009999999"}'
                  className="min-h-[120px] font-mono text-sm resize-none"
                  value={updateData}
                  onChange={(e) => setUpdateData(e.target.value)}
                />
              </div>
            )}
          </>
        )}

        <Button
          onClick={handleExecute}
          disabled={loadingOperation || !selectedConnector}
          className="w-full md:w-auto"
        >
          {loadingOperation ? (
            <>
              <Loading className="mr-2 h-4 w-4" />
              Ejecutando...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Ejecutar operación
            </>
          )}
        </Button>
      </div>

      {result && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Resultado</Label>
            {result.status && (
              <Badge variant={result.status === 'Success' ? 'default' : 'destructive'}>
                {result.status}
              </Badge>
            )}
          </div>
          <pre className="max-h-[400px] overflow-auto border bg-muted/50 p-4 text-xs font-mono">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
