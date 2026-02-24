'use client'

import { useState, useEffect } from 'react'
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
  onResend?: () => Promise<void>
}

export function VerificationCodeDialog({
  open,
  onOpenChange,
  type,
  value,
  onVerify,
  onResend,
}: VerificationCodeDialogProps) {
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [countdown, setCountdown] = useState(40)
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (open && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [open, countdown])

  useEffect(() => {
    if (open) {
      setCountdown(40)
      setCanResend(false)
      setCode('')
    }
  }, [open])

  const handleResend = async () => {
    if (!canResend || !onResend) return
    setIsResending(true)
    try {
      await onResend()
      setCountdown(40)
      setCanResend(false)
    } finally {
      setIsResending(false)
    }
  }

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
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
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

          {onResend && (
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={!canResend || isResending}
                className="text-muted-foreground hover:text-foreground"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : canResend ? (
                  'Reenviar código'
                ) : (
                  `Reenviar código (${countdown}s)`
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
