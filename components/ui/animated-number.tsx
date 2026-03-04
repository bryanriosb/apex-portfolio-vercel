'use client'

import NumberFlow from '@number-flow/react'
import { cn } from '@/lib/utils'

interface AnimatedNumberProps {
  value: number
  className?: string
  prefix?: string
  suffix?: string
  decimals?: number
  locales?: string
}

export function AnimatedNumber({
  value,
  className,
  prefix = '',
  suffix = '',
  decimals = 0,
  locales = 'es-CO',
}: AnimatedNumberProps) {
  const displayValue = decimals > 0
    ? parseFloat(value.toFixed(decimals))
    : Math.round(value)

  return (
    <NumberFlow
      value={displayValue}
      className={cn(className)}
      prefix={prefix}
      suffix={suffix}
      locales={locales}
    />
  )
}

export function AnimatedPercentage({
  value,
  className,
  decimals = 1,
}: Omit<AnimatedNumberProps, 'suffix' | 'decimals'> & { decimals?: number }) {
  return (
    <AnimatedNumber
      value={value}
      suffix="%"
      decimals={decimals}
      className={className}
    />
  )
}

export function AnimatedCurrency({
  value,
  className,
}: Omit<AnimatedNumberProps, 'prefix' | 'suffix'>) {
  return (
    <NumberFlow
      value={Math.round(value)}
      className={cn(className)}
      locales="es-CO"
      format={{ style: 'currency', currency: 'COP', maximumFractionDigits: 0 }}
    />
  )
}
