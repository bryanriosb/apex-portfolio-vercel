'use client'

import { useState, useEffect, useCallback } from 'react'
import { CreditCard, Trash2, Star, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  getSavedCardsAction,
  deleteCardAction,
  setDefaultCardAction,
} from '@/lib/actions/subscription'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import type { SavedCard } from '@/lib/models/subscription/subscription'
import { cn } from '@/lib/utils'

const CARD_BRAND_ICONS: Record<string, string> = {
  visa: '💳 Visa',
  master: '💳 Mastercard',
  amex: '💳 Amex',
  default: '💳',
}

interface SavedCardsManagerProps {
  onAddCard?: () => void
}

export function SavedCardsManager({ onAddCard }: SavedCardsManagerProps) {
  const { activeBusiness } = useActiveBusinessStore()
  const [cards, setCards] = useState<SavedCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null)
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null)
  const [cardToDelete, setCardToDelete] = useState<SavedCard | null>(null)

  const loadCards = useCallback(async () => {
    if (!activeBusiness?.business_account_id) return

    setIsLoading(true)
    try {
      const savedCards = await getSavedCardsAction(
        activeBusiness.business_account_id
      )
      setCards(savedCards)
    } catch (error) {
      console.error('Error loading cards:', error)
      toast.error('Error al cargar las tarjetas guardadas')
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.business_account_id])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  const handleDeleteCard = async () => {
    if (!cardToDelete || !activeBusiness?.business_account_id) return

    setDeletingCardId(cardToDelete.id)
    try {
      const result = await deleteCardAction(
        activeBusiness.business_account_id,
        cardToDelete.id
      )

      if (result.success) {
        toast.success('Tarjeta eliminada correctamente')
        await loadCards()
      } else {
        throw new Error(result.error || 'Error al eliminar la tarjeta')
      }
    } catch (error: any) {
      console.error('Error deleting card:', error)
      toast.error(error.message || 'Error al eliminar la tarjeta')
    } finally {
      setDeletingCardId(null)
      setCardToDelete(null)
    }
  }

  const handleSetDefault = async (cardId: string) => {
    if (!activeBusiness?.business_account_id) return

    setSettingDefaultId(cardId)
    try {
      const result = await setDefaultCardAction(
        activeBusiness.business_account_id,
        cardId
      )

      if (result.success) {
        toast.success('Tarjeta predeterminada actualizada')
        await loadCards()
      } else {
        throw new Error(result.error || 'Error al actualizar la tarjeta')
      }
    } catch (error: any) {
      console.error('Error setting default card:', error)
      toast.error(error.message || 'Error al actualizar la tarjeta')
    } finally {
      setSettingDefaultId(null)
    }
  }

  const getCardBrandDisplay = (brand: string) => {
    return CARD_BRAND_ICONS[brand.toLowerCase()] || CARD_BRAND_ICONS.default
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Métodos de Pago
              </CardTitle>
              <CardDescription>
                Administra tus tarjetas guardadas para pagos futuros
              </CardDescription>
            </div>
            {onAddCard && (
              <Button variant="outline" size="sm" onClick={onAddCard}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar tarjeta
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {cards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tienes tarjetas guardadas</p>
              <p className="text-sm">
                Las tarjetas se guardarán automáticamente cuando realices un pago
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => (
                <SavedCardItem
                  key={card.id}
                  card={card}
                  isDeleting={deletingCardId === card.id}
                  isSettingDefault={settingDefaultId === card.id}
                  onDelete={() => setCardToDelete(card)}
                  onSetDefault={() => handleSetDefault(card.id)}
                  getCardBrandDisplay={getCardBrandDisplay}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!cardToDelete} onOpenChange={() => setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarjeta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la tarjeta terminada en{' '}
              <strong>{cardToDelete?.last_four_digits}</strong> de tu cuenta.
              No podrás usar esta tarjeta para futuros pagos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingCardId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCard}
              disabled={!!deletingCardId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingCardId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function SavedCardItem({
  card,
  isDeleting,
  isSettingDefault,
  onDelete,
  onSetDefault,
  getCardBrandDisplay,
}: {
  card: SavedCard
  isDeleting: boolean
  isSettingDefault: boolean
  onDelete: () => void
  onSetDefault: () => void
  getCardBrandDisplay: (brand: string) => string
}) {
  const isExpired =
    new Date(card.expiration_year, card.expiration_month - 1) < new Date()

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 border rounded-lg',
        card.is_default && 'border-primary bg-primary/5',
        isExpired && 'border-destructive/50 bg-destructive/5'
      )}
    >
      <div className="flex items-center gap-4">
        <div className="text-2xl">{getCardBrandDisplay(card.card_brand)}</div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              •••• •••• •••• {card.last_four_digits}
            </span>
            {card.is_default && (
              <Badge variant="secondary" className="text-xs">
                Predeterminada
              </Badge>
            )}
            {isExpired && (
              <Badge variant="destructive" className="text-xs">
                Vencida
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {card.cardholder_name} • Expira{' '}
            {String(card.expiration_month).padStart(2, '0')}/{card.expiration_year}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!card.is_default && !isExpired && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSetDefault}
            disabled={isSettingDefault || isDeleting}
          >
            {isSettingDefault ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Star className="h-4 w-4 mr-1" />
                Predeterminar
              </>
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting || isSettingDefault}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
