'use client'

import { Renderer } from '@zavora-ai/adk-ui-react'
import type { Component, UiEvent } from '@zavora-ai/adk-ui-react'
import { useMemo, Component as ReactComponent, type ReactNode, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

type UiTheme = 'light' | 'dark' | 'system'

interface DynamicUIRendererProps {
  components: Component[] | any[]
  theme?: UiTheme
  onAction: (event: UiEvent) => void
  compact?: boolean
  className?: string
  isStreaming?: boolean
  isDisabled?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
}

class UIComponentErrorBoundary extends ReactComponent<
  { children: ReactNode; componentName: string; onError?: (name: string) => void },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error(`[DynamicUIRenderer] Error rendering component:`, error)
    this.props.onError?.(this.props.componentName)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-3 border border-destructive/50 bg-destructive/5 text-destructive text-xs rounded-none">
          Error al renderizar componente UI
        </div>
      )
    }
    return this.props.children
  }
}

function buildFormSchema(fields: any[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  fields.forEach((f: any) => {
    let fieldSchema: any = z.any()
    if (f.type === 'number') {
      fieldSchema = z.coerce.number()
    } else if (f.type === 'boolean') {
      fieldSchema = z.boolean().default(false)
    } else {
      fieldSchema = z.string()
      if (f.required) {
        fieldSchema = fieldSchema.min(1, 'Este campo es obligatorio')
      }
    }
    if (!f.required && f.type !== 'boolean') {
      fieldSchema = fieldSchema.optional().or(z.literal(''))
    }
    shape[f.name] = fieldSchema
  })
  return z.object(shape)
}

function CustomRenderForm({
  component,
  onAction,
  compact,
  isStreaming,
  isDisabled,
}: {
  component: any
  onAction?: (event: UiEvent) => void
  compact?: boolean
  isStreaming?: boolean
  isDisabled?: boolean
}) {
  const formSchema = useMemo(() => buildFormSchema(component.fields || []), [component.fields])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  })

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (onAction) {
      onAction({
        action: 'form_submit',
        action_id: component.submit_action || 'submit',
        data: values,
      } as any)
    }
  }

  const textSize = compact ? 'text-xs' : 'text-sm'
  const gap = compact ? 'gap-3' : 'gap-4'
  const padding = compact ? 'p-3' : 'p-4'

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={`flex flex-col ${gap} ${padding} border border-border bg-card text-card-foreground rounded-none`}
      >
        {component.title && (
          <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-semibold leading-none tracking-tight`}>
            {component.title}
          </h3>
        )}
        {component.description && (
          <p className={`${textSize} text-muted-foreground`}>{component.description}</p>
        )}
        {component.content && (
          <p className={`${textSize} text-muted-foreground`}>{component.content}</p>
        )}

        <div className={`flex flex-col ${compact ? 'gap-2' : 'gap-3'}`}>
          {component.fields?.map((field: any, idx: number) => (
            <FormField
              key={idx}
              control={form.control}
              name={field.name}
              render={({ field: fieldProps }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel
                    className={`${textSize} ${field.required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ''}`}
                  >
                    {field.label || field.name}
                  </FormLabel>
                  <FormControl>
                    {field.type === 'select' ? (
                      <Select
                        onValueChange={fieldProps.onChange}
                        value={fieldProps.value ? String(fieldProps.value) : undefined}
                      >
                        <SelectTrigger className="w-full rounded-none h-8 text-xs">
                          <SelectValue placeholder={field.placeholder || 'Seleccionar...'} />
                        </SelectTrigger>
                        <SelectContent className="rounded-none">
                          {field.options?.map((opt: any) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'boolean' ? (
                      <div className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={field.name}
                          checked={fieldProps.value === true}
                          onCheckedChange={fieldProps.onChange}
                          className="rounded-none"
                        />
                      </div>
                    ) : (
                      <Input
                        type={field.type === 'number' ? 'number' : 'text'}
                        placeholder={field.placeholder}
                        className="rounded-none h-8 text-xs"
                        {...fieldProps}
                        value={fieldProps.value !== undefined ? String(fieldProps.value) : ''}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>

        <Button type="submit" size="sm" className={`w-full sm:w-auto self-start rounded-none ${isDisabled ? 'grayscale opacity-60' : ''}`} disabled={isStreaming || isDisabled}>
          {isStreaming ? <Spinner className="mr-2" /> : null}
          {isStreaming ? 'Procesando...' : (component.submit_label || 'Enviar')}
        </Button>
      </form>
    </Form>
  )
}

const CHART_COLORS = ["#22c55e", "#16a34a", "#15803d", "#166534", "#14532d", "#86efac", "#4ade80"]

function StyledRenderer({ component, onAction, theme, isStreaming, isDisabled }: {
  component: Component | any
  onAction?: (event: UiEvent) => void
  theme?: UiTheme
  isStreaming?: boolean
  isDisabled?: boolean
}) {
  const [key, setKey] = useState(0)
  
  useEffect(() => {
    setKey(prev => prev + 1)
  }, [component.type])

  const resolvedComponent = component.type === 'chart'
    ? { ...component, colors: component.colors || CHART_COLORS }
    : component

  const disabledComponent = isDisabled
    ? { ...resolvedComponent, disabled: true }
    : resolvedComponent

  return (
    <div key={key} data-adk-ui-wrapper className={`relative ${isDisabled ? 'grayscale opacity-60' : ''}`}>
      <Renderer 
        component={disabledComponent} 
        onAction={isDisabled ? undefined : onAction} 
        theme={theme}
      />
      {isStreaming && (
        <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-none">
          <Spinner className="size-6" />
        </div>
      )}
    </div>
  )
}

function CustomComponentWrapper({
  component,
  onAction,
  theme,
  compact,
  isStreaming,
  isDisabled,
}: {
  component: Component | any
  onAction?: (event: UiEvent) => void
  theme?: UiTheme
  compact?: boolean
  isStreaming?: boolean
  isDisabled?: boolean
}) {
  if (component.type === 'render_form' || component.type === 'render_card') {
    return <CustomRenderForm component={component} onAction={onAction} compact={compact} isStreaming={isStreaming} isDisabled={isDisabled} />
  }

  return <StyledRenderer component={component} onAction={onAction} theme={theme} isStreaming={isStreaming} isDisabled={isDisabled} />
}

export function DynamicUIRenderer({
  components,
  theme = 'light',
  onAction,
  compact = false,
  className,
  isStreaming = false,
  isDisabled: externalDisabled = false,
}: DynamicUIRendererProps) {
  const [hasInteracted, setHasInteracted] = useState(false)

  const handleError = (componentName: string) => {
    toast.warning(`Componente UI "${componentName}" no se pudo renderizar`)
  }

  const handleAction = (event: UiEvent) => {
    setHasInteracted(true)
    onAction(event)
  }

  const validComponents = components.filter((c) => c && typeof c === 'object' && c.type)
  const isDisabled = externalDisabled || hasInteracted

  if (validComponents.length === 0) return null

  return (
    <div className={`flex flex-col gap-3 w-full max-w-full overflow-hidden ${className ?? ''}`}>
      {validComponents.map((component, index) => (
        <UIComponentErrorBoundary
          key={component.id || index}
          componentName={component.type || `component-${index}`}
          onError={handleError}
        >
          <CustomComponentWrapper
            component={component}
            onAction={handleAction}
            theme={theme}
            compact={compact}
            isStreaming={isStreaming}
            isDisabled={isDisabled}
          />
        </UIComponentErrorBoundary>
      ))}
    </div>
  )
}
