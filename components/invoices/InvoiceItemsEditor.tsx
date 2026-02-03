'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils/currency'
import type { InvoiceItem } from '@/lib/models/invoice/invoice'

const DEFAULT_TAX_RATE = 19

interface InvoiceItemsEditorProps {
  items: InvoiceItem[]
  onChange: (items: InvoiceItem[]) => void
  disabled?: boolean
}

export default function InvoiceItemsEditor({
  items,
  onChange,
  disabled = false,
}: InvoiceItemsEditorProps) {
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemHasTax, setNewItemHasTax] = useState(true)

  const calculateTax = (totalCents: number, taxRate: number | null): number => {
    if (taxRate === null || taxRate <= 0) return 0
    const subtotal = Math.round(totalCents / (1 + taxRate / 100))
    return totalCents - subtotal
  }

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemPrice) return

    const priceCents = Math.round(parseFloat(newItemPrice) * 100)
    const taxRate = newItemHasTax ? DEFAULT_TAX_RATE : null
    const taxCents = calculateTax(priceCents, taxRate)

    const newItem: InvoiceItem = {
      service_id: null,
      name: newItemName.trim(),
      quantity: 1,
      unit_price_cents: priceCents,
      total_cents: priceCents,
      tax_rate: taxRate,
      tax_cents: taxCents,
    }

    onChange([...items, newItem])
    setNewItemName('')
    setNewItemPrice('')
    setNewItemHasTax(true)
  }

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onChange(newItems)
  }

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return
    const newItems = [...items]
    const totalCents = newItems[index].unit_price_cents * quantity
    const taxCents = calculateTax(totalCents, newItems[index].tax_rate)
    newItems[index] = {
      ...newItems[index],
      quantity,
      total_cents: totalCents,
      tax_cents: taxCents,
    }
    onChange(newItems)
  }

  const subtotal = items.reduce((sum, item) => sum + item.total_cents, 0)
  const totalTax = items.reduce((sum, item) => sum + (item.tax_cents || 0), 0)

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Servicios / Items</div>

      {items.length > 0 && (
        <div className="border rounded-md divide-y">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-3">
              <div className="flex-1">
                <div className="font-medium text-sm">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(item.unit_price_cents / 100)} c/u
                  {item.tax_rate !== null && item.tax_rate > 0 ? (
                    <span className="ml-2 text-primary">
                      IVA {item.tax_rate}%
                    </span>
                  ) : (
                    <span className="ml-2 text-muted-foreground/70">
                      Sin IVA
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    handleUpdateQuantity(index, parseInt(e.target.value) || 1)
                  }
                  className="w-16 h-8 text-center"
                  disabled={disabled}
                />
                <div className="w-24 text-right font-medium">
                  {formatCurrency(item.total_cents / 100)}
                </div>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Nombre del servicio"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="Precio"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              className="w-28"
              min={0}
              step={100}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleAddItem}
              disabled={!newItemName.trim() || !newItemPrice}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="new-item-tax"
              checked={newItemHasTax}
              onCheckedChange={setNewItemHasTax}
            />
            <Label
              htmlFor="new-item-tax"
              className="text-xs text-muted-foreground cursor-pointer"
            >
              {newItemHasTax ? `Incluye IVA (${DEFAULT_TAX_RATE}%)` : 'Sin IVA'}
            </Label>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex justify-end pt-2 border-t">
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">
                Subtotal (sin IVA):{' '}
              </span>
              <span className="font-medium">
                {formatCurrency((subtotal - totalTax) / 100)}
              </span>
            </div>
            {totalTax > 0 && (
              <div>
                <span className="text-muted-foreground">IVA: </span>
                <span className="font-medium">
                  {formatCurrency(totalTax / 100)}
                </span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Total: </span>
              <span className="font-medium">
                {formatCurrency(subtotal / 100)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
