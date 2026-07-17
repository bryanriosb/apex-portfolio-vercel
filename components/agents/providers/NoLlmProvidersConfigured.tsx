'use client'

import Link from 'next/link'
import { BrainCircuit, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LLM_PROVIDERS_ROUTE } from '@/lib/models/agents/llm-provider-policy'

interface NoLlmProvidersConfiguredProps {
  /** Ruta de configuración; por defecto la sección de proveedores IA. */
  href?: string
  /** Variante compacta para espacios reducidos (p. ej. el chat global). */
  compact?: boolean
  className?: string
}

/**
 * Estado vacío compartido: se muestra cuando la cuenta bloquea los
 * proveedores de plataforma y aún no ha configurado ninguno propio. Ofrece un
 * acceso directo a `/admin/agentic/settings/llm-providers`.
 */
export function NoLlmProvidersConfigured({
  href = LLM_PROVIDERS_ROUTE,
  compact = false,
  className,
}: NoLlmProvidersConfiguredProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 border border-dashed border-muted-foreground/40 bg-muted/30 text-left transition-colors hover:border-primary hover:bg-muted/60 rounded-none',
        compact ? 'p-1.5' : 'p-4',
        className
      )}
    >
      <BrainCircuit className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className={cn('font-medium', compact ? 'text-sm' : 'text-sm')}>
          Debes definir un proveedor
        </p>
        {!compact && (
          <p className="text-xs text-muted-foreground">
            No hay proveedores LLM configurados para esta cuenta. Configura uno
            para habilitar los modelos.
          </p>
        )}
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  )
}
