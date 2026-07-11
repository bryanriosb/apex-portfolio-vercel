'use client'

import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import dynamic from 'next/dynamic'
import {
  FUNCTION_LANGUAGES,
  MANAGEABLE_TOOL_TYPES,
  type ToolFormValues,
} from '@/lib/models/agents/tool'
import { toolTypes } from '@/lib/i18n/es-automation'

const CodeEditor = dynamic(
  () => import('./CodeEditor').then((mod) => mod.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[160px] animate-pulse border border-input bg-muted/30" />
    ),
  }
)

interface ToolFormFieldsProps {
  form: UseFormReturn<ToolFormValues>
  isSubmitting: boolean
}

const SOURCE_CODE_PLACEHOLDERS: Record<string, string> = {
  JavaScript: 'return args.a + args.b;',
  Rust: 'a + b',
}

export function ToolFormFields({ form, isSubmitting }: ToolFormFieldsProps) {
  const toolType = form.watch('tool_type')
  const language = form.watch('language')
  const isFunction = toolType === 'Function'

  return (
    <div className="space-y-5">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre</FormLabel>
            <FormControl>
              <Input
                placeholder="calculadora-descuentos"
                className="rounded-none"
                disabled={isSubmitting}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descripción</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe qué hace esta herramienta y cuándo debe usarla el agente..."
                className="min-h-[70px] resize-none rounded-none"
                disabled={isSubmitting}
                {...field}
              />
            </FormControl>
            <FormDescription>
              El agente usa esta descripción para decidir cuándo invocar la
              herramienta.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="tool_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger className="w-full rounded-none">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MANAGEABLE_TOOL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {toolTypes[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between  px-3 py-2">
              <div className="space-y-0.5">
                <FormDescription className="text-xs">
                  Disponible para los agentes
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {isFunction ? (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Backend / Lenguaje</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full rounded-none">
                        <SelectValue placeholder="Selecciona el lenguaje" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FUNCTION_LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timeout_ms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeout (ms)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      className="rounded-none"
                      disabled={isSubmitting}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="source_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código fuente</FormLabel>
                <FormControl>
                  <CodeEditor
                    value={field.value}
                    onChange={field.onChange}
                    language={language === 'Rust' ? 'rust' : 'javascript'}
                    height="220px"
                    placeholder={SOURCE_CODE_PLACEHOLDERS[language] || ''}
                    readOnly={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  {language === 'Rust'
                    ? 'Escribe una expresión o un fn main; las variables del JSON Schema se inyectan automáticamente.'
                    : 'Recibe los argumentos en `args` y retorna el resultado. Ej: return args.a + args.b;'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      ) : (
        <FormField
          control={form.control}
          name="execution_config_json"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Configuración de ejecución (JSON)</FormLabel>
              <FormControl>
                <CodeEditor
                  value={field.value}
                  onChange={field.onChange}
                  language="json"
                  height="180px"
                  readOnly={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                Configuración específica del tipo. Ej. Integración:{' '}
                {'{"connector":"odoo","resource":"invoices","operation":"fetch"}'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="schema_json"
        render={({ field }) => (
          <FormItem>
            <FormLabel>JSON Schema de argumentos</FormLabel>
            <FormControl>
              <CodeEditor
                value={field.value}
                onChange={field.onChange}
                language="json"
                height="160px"
                readOnly={isSubmitting}
              />
            </FormControl>
            <FormDescription>
              Define los argumentos que el agente puede enviar a la herramienta.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
