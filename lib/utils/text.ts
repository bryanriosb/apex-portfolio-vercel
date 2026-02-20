/**
 * Trunca un texto a un número máximo de caracteres
 * @param text - Texto a truncar
 * @param maxLength - Número máximo de caracteres (default: 11)
 * @param suffix - Sufijo a agregar si se trunca (default: '...')
 * @returns Texto truncado
 */
export function truncateText(
  text: string,
  maxLength: number = 11,
  suffix: string = '...'
): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + suffix
}
