'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Building2,
  Globe,
  Phone,
  Loader2,
  Plus,
  Trash2,
  MessageSquare,
} from 'lucide-react'
import { fetchBusinessAccountsAction } from '@/lib/actions/business-account'
import {
  fetchAllWhatsAppConfigsAction,
  deleteWhatsAppConfigAction,
} from '@/lib/actions/whatsapp'
import type { BusinessAccount } from '@/lib/models/business-account/business-account'
import type { WhatsAppConfig } from '@/lib/models/whatsapp/whatsapp-config'
import { WhatsAppConfigForm } from './WhatsAppConfigForm'

interface WhatsAppAccountsListProps {
  sharedConfig: WhatsAppConfig | null
}

interface AccountWithConfig {
  account: BusinessAccount
  config: WhatsAppConfig | null
  usesShared: boolean
}

export function WhatsAppAccountsList({ sharedConfig }: WhatsAppAccountsListProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [accounts, setAccounts] = useState<BusinessAccount[]>([])
  const [configs, setConfigs] = useState<WhatsAppConfig[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const [accountsResponse, configsData] = await Promise.all([
        fetchBusinessAccountsAction({ page_size: 100 }),
        fetchAllWhatsAppConfigsAction(),
      ])
      setAccounts(accountsResponse.data)
      setConfigs(configsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const accountsWithConfig = useMemo<AccountWithConfig[]>(() => {
    return accounts.map((account) => {
      const accountConfig = configs.find(
        (c) => c.business_account_id === account.id && !c.is_shared
      )
      return {
        account,
        config: accountConfig || null,
        usesShared: !accountConfig,
      }
    })
  }, [accounts, configs])

  const accountsWithCustomConfig = accountsWithConfig.filter((a) => !a.usesShared)
  const accountsUsingShared = accountsWithConfig.filter((a) => a.usesShared)

  const accountOptions = useMemo<ComboboxOption[]>(() => {
    return accountsUsingShared.map((a) => ({
      value: a.account.id,
      label: a.account.company_name,
      description: a.account.contact_email || undefined,
    }))
  }, [accountsUsingShared])

  const handleDeleteConfig = async (configId: string, accountName: string) => {
    if (!confirm(`Eliminar configuracion personalizada de "${accountName}"? La cuenta volvera a usar el numero compartido.`)) {
      return
    }

    setIsDeleting(configId)
    try {
      const result = await deleteWhatsAppConfigAction(configId)
      if (result.success) {
        toast.success('Configuracion eliminada')
        await loadData()
      } else {
        toast.error(result.error || 'Error al eliminar')
      }
    } catch (error) {
      toast.error('Error al eliminar')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleConfigCreated = () => {
    setIsDialogOpen(false)
    setSelectedAccountId(null)
    loadData()
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
              <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle>Cuentas de Negocio</CardTitle>
              <CardDescription>
                Gestiona que cuentas usan el numero compartido o tienen numero propio
              </CardDescription>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={!sharedConfig || accountsUsingShared.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Asignar numero propio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Asignar numero propio a cuenta</DialogTitle>
                <DialogDescription>
                  Selecciona una cuenta y configura su numero de WhatsApp exclusivo
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Cuenta de negocio</Label>
                  <Combobox
                    options={accountOptions}
                    value={selectedAccountId}
                    onChange={setSelectedAccountId}
                    placeholder="Buscar cuenta..."
                    searchPlaceholder="Buscar por nombre o email..."
                    emptyText="No hay cuentas disponibles"
                  />
                </div>
                {selectedAccountId && (
                  <WhatsAppConfigForm
                    businessAccountId={selectedAccountId}
                    onSuccess={handleConfigCreated}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!sharedConfig && (
          <div className="rounded-lg border border-dashed p-6 text-center mb-6">
            <Globe className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Primero configura el numero compartido para habilitar WhatsApp en las cuentas
            </p>
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No hay cuentas de negocio registradas
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {accountsWithCustomConfig.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Cuentas con numero propio ({accountsWithCustomConfig.length})
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Numero</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountsWithCustomConfig.map(({ account, config }) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">
                          {account.company_name}
                        </TableCell>
                        <TableCell>
                          {config?.display_phone_number || '-'}
                        </TableCell>
                        <TableCell>
                          {config?.is_enabled ? (
                            <Badge>Activo</Badge>
                          ) : (
                            <Badge variant="secondary">Inactivo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteConfig(config!.id, account.company_name)}
                            disabled={isDeleting === config?.id}
                          >
                            {isDeleting === config?.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Cuentas usando numero compartido ({accountsUsingShared.length})
              </h4>
              {accountsUsingShared.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Todas las cuentas tienen numero propio
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado WhatsApp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountsUsingShared.map(({ account }) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">
                          {account.company_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {account.contact_email || '-'}
                        </TableCell>
                        <TableCell>
                          {sharedConfig?.is_enabled ? (
                            <Badge variant="outline" className="gap-1">
                              <MessageSquare className="h-3 w-3" />
                              Via numero compartido
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Sin configurar</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
