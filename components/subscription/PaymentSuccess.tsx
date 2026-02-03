'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface PaymentSuccessProps {
  planName?: string
  billingCycle?: 'monthly' | 'yearly'
  amount?: number
  onContinue?: () => void
}

export function PaymentSuccess({
  planName = 'Tu Plan',
  billingCycle = 'monthly',
  amount,
  onContinue,
}: PaymentSuccessProps) {
  const router = useRouter()
  const [showContent, setShowContent] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => setShowContent(true), 100)
    const timer2 = setTimeout(() => setShowConfetti(true), 300)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  const handleContinue = () => {
    if (onContinue) {
      onContinue()
    } else {
      router.push('/admin')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 relative overflow-hidden">
      {showConfetti && (
        <>
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                }}
              >
                <Sparkles
                  className="text-primary"
                  size={16 + Math.random() * 16}
                  style={{
                    opacity: 0.6 + Math.random() * 0.4,
                  }}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <Card
        className={cn(
          'max-w-md w-full transform transition-all duration-700',
          showContent
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-8 opacity-0 scale-95'
        )}
      >
        <CardContent className="pt-8 pb-6 px-6 text-center space-y-6">
          <div className="relative inline-block">
            <div
              className={cn(
                'absolute inset-0 bg-green-500/20 rounded-full blur-xl transition-all duration-1000',
                showContent ? 'scale-150 opacity-100' : 'scale-0 opacity-0'
              )}
            />
            <div
              className={cn(
                'relative bg-green-100 dark:bg-green-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto transform transition-all duration-700',
                showContent ? 'scale-100 rotate-0' : 'scale-0 rotate-180'
              )}
            >
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-500" />
            </div>
          </div>

          <div className="space-y-2">
            <h2
              className={cn(
                'text-2xl font-bold text-foreground transition-all duration-700 delay-200',
                showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
            >
              ¡Pago Exitoso!
            </h2>
            <p
              className={cn(
                'text-muted-foreground transition-all duration-700 delay-300',
                showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
            >
              Tu suscripción ha sido activada correctamente
            </p>
          </div>

          <div
            className={cn(
              'bg-muted/50 rounded-lg p-4 space-y-3 transition-all duration-700 delay-400',
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Plan:</span>
              <span className="font-semibold">{planName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Ciclo:</span>
              <span className="font-semibold">
                {billingCycle === 'yearly' ? 'Anual' : 'Mensual'}
              </span>
            </div>
            {amount && (
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-muted-foreground">Monto:</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(amount)}
                </span>
              </div>
            )}
          </div>

          <div
            className={cn(
              'space-y-3 transition-all duration-700 delay-500',
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            <div className="flex items-start gap-2 text-sm text-muted-foreground text-left">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Acceso completo a todas las funcionalidades de tu plan</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground text-left">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>
                Renovación automática cada {billingCycle === 'yearly' ? 'año' : 'mes'}
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground text-left">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Puedes cancelar en cualquier momento desde configuración</span>
            </div>
          </div>

          <Button
            onClick={handleContinue}
            className={cn(
              'w-full group transition-all duration-700 delay-600',
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
            size="lg"
          >
            Continuar
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardContent>
      </Card>

      <style jsx global>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  )
}
