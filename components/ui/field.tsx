import * as React from 'react'
import { cn } from '@/lib/utils'

const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('grid gap-4', className)}
    {...props}
  />
))
FieldGroup.displayName = 'FieldGroup'

const Field = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('grid gap-2', className)}
    {...props}
  />
))
Field.displayName = 'Field'

const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className
    )}
    {...props}
  />
))
FieldLabel.displayName = 'FieldLabel'

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
FieldDescription.displayName = 'FieldDescription'

const FieldSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center gap-4', className)}
    {...props}
  >
    <div className="h-px flex-1 bg-border" />
    {children && (
      <span
        data-slot="field-separator-content"
        className="text-xs text-muted-foreground"
      >
        {children}
      </span>
    )}
    <div className="h-px flex-1 bg-border" />
  </div>
))
FieldSeparator.displayName = 'FieldSeparator'

export { Field, FieldGroup, FieldLabel, FieldDescription, FieldSeparator }
