import { Renderer } from '@zavora-ai/adk-ui-react';
import type { Component, UiEvent } from '@zavora-ai/adk-ui-react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';

interface CustomComponentProps {
  component: Component | any;
  onAction?: (event: UiEvent) => void;
  theme?: 'light' | 'dark' | 'system';
}

function CustomRenderForm({ component, onAction }: { component: any; onAction?: (event: UiEvent) => void }) {
  const formSchema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};
    const fields = component.fields || [];
    fields.forEach((f: any) => {
      let fieldSchema: any = z.any();
      if (f.type === 'number') {
        fieldSchema = z.coerce.number();
      } else if (f.type === 'boolean') {
        fieldSchema = z.boolean().default(false);
      } else {
        fieldSchema = z.string();
        if (f.required) {
          fieldSchema = fieldSchema.min(1, "Este campo es obligatorio");
        }
      }
      if (!f.required && f.type !== 'boolean') {
        fieldSchema = fieldSchema.optional().or(z.literal(''));
      }
      shape[f.name] = fieldSchema;
    });
    return z.object(shape);
  }, [component.fields]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {}
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (onAction) {
      onAction({
        action: 'form_submit',
        action_id: component.submit_action || 'submit',
        data: values
      } as any);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6 p-4 border border-border bg-card text-card-foreground">
        {component.title && <h3 className="text-lg font-semibold leading-none tracking-tight">{component.title}</h3>}
        {component.description && <p className="text-sm text-muted-foreground">{component.description}</p>}
        {component.content && <p className="text-sm text-muted-foreground">{component.content}</p>}

        <div className="flex flex-col gap-4">
          {component.fields?.map((field: any, idx: number) => (
            <FormField
              key={idx}
              control={form.control}
              name={field.name}
              render={({ field: fieldProps }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className={field.required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ""}>
                    {field.label || field.name}
                  </FormLabel>
                  <FormControl>
                    {field.type === 'select' ? (
                      <Select
                        onValueChange={fieldProps.onChange}
                        value={fieldProps.value ? String(fieldProps.value) : undefined}
                      >
                        <SelectTrigger className="w-full rounded-none">
                          <SelectValue placeholder={field.placeholder || "Seleccionar..."} />
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
                      <div className="flex items-center space-x-2 py-2">
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
                        className="rounded-none"
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

        <Button type="submit" size="sm" className="w-full sm:w-auto self-start rounded-none">
          {component.submit_label || 'Enviar'}
        </Button>
      </form>
    </Form>
  );
}

function CustomComponentWrapper({ component, onAction, theme }: CustomComponentProps) {
  if (component.type === 'render_form' || component.type === 'render_card') {
    return <CustomRenderForm component={component} onAction={onAction} />;
  }

  // Pass to adk-ui-react Renderer. It will handle unknown types via its fallback.
  return <Renderer component={component} onAction={onAction} theme={theme} />;
}

export function HITLFormRenderer({
  components,
  theme = 'light',
  onAction
}: {
  components: Component[] | any[];
  theme?: 'light' | 'dark' | 'system';
  onAction: (event: UiEvent) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {components.map((component, index) => (
        <CustomComponentWrapper
          key={index}
          component={component}
          onAction={onAction}
          theme={theme}
        />
      ))}
    </div>
  );
}
