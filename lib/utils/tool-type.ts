export function normalizeToolType(toolType: string): string {
  if (!toolType) return ''
  return toolType.toLowerCase().includes('mcp') ? 'mcp' : toolType.toLowerCase()
}
