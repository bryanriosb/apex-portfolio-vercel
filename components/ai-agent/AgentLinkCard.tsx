'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Copy,
  ExternalLink,
  MoreVertical,
  Pencil,
  Trash2,
  Check,
  Clock,
  Users,
  Timer,
  Link2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { AgentLink } from '@/lib/models/ai-conversation'

interface AgentLinkCardProps {
  link: AgentLink
  onEdit: (link: AgentLink) => void
  onDelete: (link: AgentLink) => void
}

const typeLabels: Record<AgentLink['type'], string> = {
  single_use: 'Un solo uso',
  multi_use: 'Múltiples usos',
  time_limited: 'Con expiración',
  minute_limited: 'Límite de minutos',
}

const typeIcons: Record<AgentLink['type'], React.ReactNode> = {
  single_use: <Link2 className="h-4 w-4" />,
  multi_use: <Users className="h-4 w-4" />,
  time_limited: <Clock className="h-4 w-4" />,
  minute_limited: <Timer className="h-4 w-4" />,
}

const statusColors: Record<AgentLink['status'], string> = {
  active: 'bg-green-500/10 text-green-600 border-green-500/20',
  expired: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  exhausted: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  disabled: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
}

const statusLabels: Record<AgentLink['status'], string> = {
  active: 'Activo',
  expired: 'Expirado',
  exhausted: 'Agotado',
  disabled: 'Deshabilitado',
}

export function AgentLinkCard({ link, onEdit, onDelete }: AgentLinkCardProps) {
  const [copied, setCopied] = useState(false)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const chatUrl = `${baseUrl}/chat/${link.token}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(chatUrl)
      setCopied(true)
      toast.success('Enlace copiado al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Error al copiar enlace')
    }
  }

  const openInNewTab = () => {
    window.open(chatUrl, '_blank')
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="shrink-0">{typeIcons[link.type]}</span>
            <CardTitle className="text-base truncate">{link.name}</CardTitle>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className={`${statusColors[link.status]} text-xs`}>
              {statusLabels[link.status]}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(link)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openInNewTab}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(link)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
          {typeLabels[link.type]}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
          <div>
            <p className="text-muted-foreground">Usos</p>
            <p className="font-medium">
              {link.current_uses} / {link.max_uses || '∞'}
            </p>
          </div>

          {link.type === 'minute_limited' && (
            <div>
              <p className="text-muted-foreground">Minutos</p>
              <p className="font-medium">
                {Math.round(Number(link.minutes_used))} / {link.max_minutes || '∞'}
              </p>
            </div>
          )}

          {link.expires_at && (
            <div>
              <p className="text-muted-foreground">Expira</p>
              <p className="font-medium">
                {format(new Date(link.expires_at), "d MMM", { locale: es })}
              </p>
            </div>
          )}

          <div>
            <p className="text-muted-foreground">Creado</p>
            <p className="font-medium">
              {format(new Date(link.created_at), "d MMM", { locale: es })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 min-w-0 overflow-hidden rounded-md bg-muted px-2 sm:px-3 py-2 text-xs sm:text-sm font-mono">
            <p className="truncate">{chatUrl}</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={copyToClipboard}
            className="shrink-0 h-8 w-8 sm:h-9 sm:w-9"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
