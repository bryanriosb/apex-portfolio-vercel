'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface VerificationCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'email' | 'phone'
  value: string
  onVerify: (code: string) => Promise<void>
}

export function VerificationCodeDialog({
  open,
  onOpenChange,
  type,
  value,
  onVerify,
}: VerificationCodeDialogProps) {
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const handleVerify = async () => {
    if (code.length !== 6) return

    setIsVerifying(true)
    try {
      await onVerify(code)
      setCode('')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verificar {type === 'email' ? 'correo electrónico' : 'teléfono'}</DialogTitle>
          <DialogDescription>
            Ingresa el código de 6 dígitos que enviamos a{' '}
            <span className="font-medium text-foreground">{value}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código de verificación</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={code}
              onChange={handleCodeChange}
              maxLength={6}
              className="text-center text-2xl tracking-widest"
              disabled={isVerifying}
              autoFocus
            />
          </div>

          <Button
            onClick={handleVerify}
            disabled={code.length !== 6 || isVerifying}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
