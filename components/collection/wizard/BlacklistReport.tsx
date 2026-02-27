'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  MailX,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  UserX,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { BlacklistValidationResult } from './types'

interface BlacklistReportProps {
  results: BlacklistValidationResult[]
  onContinue: () => void
  onCancel: () => void
}

const bounceTypeLabels: Record<string, string> = {
  hard: 'Rebote Duro',
  soft: 'Rebote Suave',
  complaint: 'Queja',
  manual: 'Manual',
}

const bounceTypeColors: Record<string, string> = {
  hard: 'bg-red-100 text-red-800 border-red-200',
  soft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  complaint: 'bg-orange-100 text-orange-800 border-orange-200',
  manual: 'bg-blue-100 text-blue-800 border-blue-200',
}

export function BlacklistReport({
  results,
  onContinue,
  onCancel,
}: BlacklistReportProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())

  const fullyBlacklisted = results.filter((r) => r.isFullyBlacklisted)
  const partiallyBlacklisted = results.filter((r) => !r.isFullyBlacklisted)

  const toggleClient = (nit: string) => {
    const newSet = new Set(expandedClients)
    if (newSet.has(nit)) {
      newSet.delete(nit)
    } else {
      newSet.add(nit)
    }
    setExpandedClients(newSet)
  }

  return (
    <div className="border bg-amber-50/50">
      {/* Header */}
      <div className="p-4 border-b bg-amber-50/80">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-none">
            <ShieldAlert className="h-5 w-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900">
              Validación de Lista Negra
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              Se detectaron correos en lista negra que serán excluidos del
              proceso
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
            <Button size="sm" onClick={onContinue} className="bg-amber-700 hover:bg-amber-800">
              Continuar
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 border-b">
        <div className="p-4 border-r text-center">
          <div className="text-2xl font-bold text-amber-700">
            {results.length}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Clientes Afectados
          </div>
        </div>
        <div className="p-4 border-r text-center">
          <div className="text-2xl font-bold text-red-600">
            {fullyBlacklisted.length}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Clientes Descartados
          </div>
        </div>
        <div className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {partiallyBlacklisted.length}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Clientes Parciales
          </div>
        </div>
      </div>

      {/* Details */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 hover:bg-amber-50/50 transition-colors">
            <span className="text-sm font-medium text-amber-900">
              Ver detalles
            </span>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-amber-700" />
            ) : (
              <ChevronDown className="h-4 w-4 text-amber-700" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ScrollArea className="h-[300px]">
            <div className="p-4 space-y-3">
              {/* Fully Blacklisted Clients */}
              {fullyBlacklisted.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                    <UserX className="h-4 w-4" />
                    Clientes Descartados Completamente
                  </h4>
                  {fullyBlacklisted.map((result) => (
                    <div
                      key={result.clientNit}
                      className="bg-red-50 border border-red-200 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-red-900">
                            {result.clientName}
                          </div>
                          <div className="text-xs text-red-600 font-mono">
                            NIT: {result.clientNit}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-red-100 text-red-700 border-red-200"
                        >
                          Descartado
                        </Badge>
                      </div>
                      <div className="mt-2 space-y-1">
                        {result.blacklistedEmails.map((email, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm"
                          >
                            <MailX className="h-3 w-3 text-red-500" />
                            <span className="text-red-700">{email.email}</span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                bounceTypeColors[email.bounceType || 'hard']
                              }`}
                            >
                              {bounceTypeLabels[email.bounceType || 'hard']}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Partially Blacklisted Clients */}
              {partiallyBlacklisted.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Clientes con Correos Válidos Restantes
                  </h4>
                  {partiallyBlacklisted.map((result) => (
                    <div
                      key={result.clientNit}
                      className="bg-white border border-amber-200 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-amber-900">
                            {result.clientName}
                          </div>
                          <div className="text-xs text-amber-600 font-mono">
                            NIT: {result.clientNit}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-blue-100 text-blue-700 border-blue-200"
                        >
                          {result.validEmails.length} válido(s)
                        </Badge>
                      </div>

                      {/* Valid Emails */}
                      <div className="mt-2 space-y-1">
                        <div className="text-xs font-medium text-green-700">
                          Correos válidos:
                        </div>
                        {result.validEmails.map((email, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm pl-3"
                          >
                            <span className="text-green-700">{email}</span>
                          </div>
                        ))}
                      </div>

                      {/* Blacklisted Emails */}
                      <div className="mt-2 space-y-1">
                        <div className="text-xs font-medium text-red-600">
                          Correos en lista negra (serán omitidos):
                        </div>
                        {result.blacklistedEmails.map((email, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm pl-3"
                          >
                            <MailX className="h-3 w-3 text-red-400" />
                            <span className="text-red-600 line-through">
                              {email.email}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                bounceTypeColors[email.bounceType || 'hard']
                              }`}
                            >
                              {bounceTypeLabels[email.bounceType || 'hard']}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      {/* Footer Actions */}
      <div className="p-4 border-t bg-amber-50/30 flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancelar Carga
        </Button>
        <Button
          onClick={onContinue}
          className="bg-amber-700 hover:bg-amber-800 text-white"
        >
          Continuar sin Correos en Lista Negra
        </Button>
      </div>
    </div>
  )
}
