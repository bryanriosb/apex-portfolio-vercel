'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeedbackIndicatorProps {
  feedback: {
    type: 'thinking' | 'progress' | 'waiting'
    message: string
    toolName?: string
  } | null
  className?: string
}

export function FeedbackIndicator({ feedback, className }: FeedbackIndicatorProps) {
  return (
    <AnimatePresence mode="wait">
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground',
            className
          )}
        >
          <ThinkingDots />
          <span>{feedback.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-primary"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  )
}

interface ThinkingIndicatorProps {
  isThinking: boolean
  message?: string
  className?: string
}

export function ThinkingIndicator({ isThinking, message, className }: ThinkingIndicatorProps) {
  return (
    <AnimatePresence>
      {isThinking && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={cn('overflow-hidden', className)}
        >
          <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{message || 'Pensando...'}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
