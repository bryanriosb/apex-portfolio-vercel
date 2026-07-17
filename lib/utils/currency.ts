export function formatCurrency(
  amount: number,
  currency: string = 'COP'
): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formato compacto para ejes de gráficos (ej: 3,6 M en vez de 3.600.000).
 */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}
