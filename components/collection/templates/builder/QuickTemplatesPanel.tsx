'use client'

import {
  QUICK_TEMPLATES,
  type QuickTemplate,
} from '@/lib/data-templates/const/quick-templates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Zap } from 'lucide-react'

interface QuickTemplatesPanelProps {
  onSelect: (template: QuickTemplate) => void
  onStartBlank: () => void
}

const BADGE_STYLES: Record<QuickTemplate['badgeColor'], string> = {
  green:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export function QuickTemplatesPanel({
  onSelect,
  onStartBlank,
}: QuickTemplatesPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)] bg-gray-50 dark:bg-gray-950 p-6">
      <div className="w-full max-w-5xl">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Comenzar desde una plantilla
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          Elige una base y personalízala con el contenido que necesitas. Es
          rápido y sencillo.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {QUICK_TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onSelect}
            />
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground uppercase tracking-widest">
            o
          </span>
          <Separator className="flex-1" />
        </div>

        <div className="flex justify-center mt-6">
          <Button
            onClick={onStartBlank}
            variant="outline"
            size="lg"
            className="flex items-center gap-2"
          >
            Comenzar desde cero
          </Button>
        </div>
      </div>
    </div>
  )
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: QuickTemplate
  onSelect: (t: QuickTemplate) => void
}) {
  return (
    <div className="border bg-white dark:bg-gray-900 dark:border-gray-800 flex flex-col p-5 hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span
          className={`text-xs font-semibold px-2 py-0.5 ${BADGE_STYLES[template.badgeColor]}`}
        >
          {template.badge}
        </span>
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 leading-tight">
        {template.name}
      </h3>
      <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
        {template.description}
      </p>
      <div className="mt-5 pt-4 border-t dark:border-gray-800">
        <Button className="w-full" size="sm" onClick={() => onSelect(template)}>
          Usar esta plantilla
        </Button>
      </div>
    </div>
  )
}
