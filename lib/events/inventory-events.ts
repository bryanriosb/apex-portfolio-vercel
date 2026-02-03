// Custom event for inventory updates
const INVENTORY_UPDATED_EVENT = 'inventory-updated'

export function dispatchInventoryUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(INVENTORY_UPDATED_EVENT))
  }
}

export function onInventoryUpdated(callback: () => void) {
  if (typeof window !== 'undefined') {
    window.addEventListener(INVENTORY_UPDATED_EVENT, callback)
    return () => window.removeEventListener(INVENTORY_UPDATED_EVENT, callback)
  }
  return () => {}
}
