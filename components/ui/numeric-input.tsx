'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface NumericInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> {
  value: number | null | undefined
  onChange: (value: number | null) => void
  allowNegative?: boolean
  allowDecimals?: boolean
  decimalPlaces?: number
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      className,
      value,
      onChange,
      allowNegative = false,
      allowDecimals = true,
      decimalPlaces = 2,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = React.useState<string>(() => {
      if (value === null || value === undefined) return ''
      return String(value)
    })

    React.useEffect(() => {
      if (value === null || value === undefined) {
        setDisplayValue('')
      } else {
        setDisplayValue(String(value))
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value

      if (input === '' || input === '-') {
        setDisplayValue(input)
        onChange(null)
        return
      }

      const regex = allowDecimals
        ? allowNegative
          ? /^-?\d*\.?\d*$/
          : /^\d*\.?\d*$/
        : allowNegative
          ? /^-?\d*$/
          : /^\d*$/

      if (!regex.test(input)) return

      setDisplayValue(input)

      const numValue = parseFloat(input)
      if (!isNaN(numValue)) {
        onChange(numValue)
      }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (displayValue === '' || displayValue === '-') {
        setDisplayValue('')
        onChange(null)
      } else {
        const numValue = parseFloat(displayValue)
        if (!isNaN(numValue)) {
          const formatted = allowDecimals
            ? String(
                Math.round(numValue * Math.pow(10, decimalPlaces)) /
                  Math.pow(10, decimalPlaces)
              )
            : String(Math.round(numValue))
          setDisplayValue(formatted)
        }
      }
      onBlur?.(e)
    }

    return (
      <input
        type="text"
        inputMode={allowDecimals ? 'decimal' : 'numeric'}
        data-slot="input"
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    )
  }
)
NumericInput.displayName = 'NumericInput'

export { NumericInput }
