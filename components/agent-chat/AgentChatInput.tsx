'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  ArrowUp,
  Mic,
  MicOff,
  MessageSquare,
  AudioWaveform,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { VoiceVisualizer } from './VoiceVisualizer'
import { Badge } from '../ui/badge'

interface AgentChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
  isLoading?: boolean
  showVoiceButton?: boolean
  isVoiceActive?: boolean
  isMuted?: boolean
  isSpeaking?: boolean
  volume?: number
  outputVolume?: number
  onModeChange?: (mode: 'normal' | 'voice') => void
  onToggleMute?: () => void
}

export function AgentChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Escribe o usa el micrófono...',
  isLoading = false,
  showVoiceButton = true,
  isVoiceActive = false,
  isMuted = false,
  isSpeaking = false,
  volume = 0,
  outputVolume = 0,
  onModeChange,
  onToggleMute,
}: AgentChatInputProps) {
  const [mode, setMode] = useState<'normal' | 'voice'>('normal')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleModeChange = (newMode: 'normal' | 'voice') => {
    if (mode === newMode) return
    setMode(newMode)
    onModeChange?.(newMode)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled && !isLoading) {
        onSubmit()
      }
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`
    }
  }, [value])

  useEffect(() => {
    setMode(isVoiceActive ? 'voice' : 'normal')
  }, [isVoiceActive])

  const getVoiceState = () => {
    if (!isVoiceActive) return 'idle'
    if (isSpeaking) return 'speech-detected'
    return 'listening'
  }

  return (
    <div
      className={cn(
        'w-full bg-background border border-border rounded-2xl shadow-lg relative',
        mode === 'voice' && 'mt-10 transition-all duration-300'
      )}
    >
      <AnimatePresence>
        {mode === 'voice' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute -bottom-22 left-1/2 -translate-x-1/2 z-5"
          >
            <VoiceVisualizer
              state={getVoiceState()}
              volume={volume}
              outputVolume={outputVolume}
              size={500}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-20">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'voice' ? 'Habla o escribe tu mensaje...' : placeholder
          }
          rows={1}
          className="w-full bg-transparent border-none outline-none px-4 py-4 text-base placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed resize-none min-h-[3.5rem] max-h-[120px] overflow-y-auto"
        />
      </div>

      <div className="flex items-center justify-between px-4 pb-3 relative z-20">
        <div className="flex items-center gap-2">
          {showVoiceButton && (
            <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
              <button
                onClick={() => handleModeChange('normal')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  mode === 'normal'
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                disabled={disabled}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Texto</span>
              </button>

              <button
                onClick={() => handleModeChange('voice')}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  mode === 'voice'
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                disabled={disabled}
              >
                <AudioWaveform className="h-3.5 w-3.5" />
                <span>Voz</span>
                <Badge variant="default" className="px-1 py-0">
                  Beta
                </Badge>
              </button>
            </div>
          )}

          {mode === 'voice' && onToggleMute && (
            <Button
              onClick={onToggleMute}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'rounded-full h-8 w-8',
                isMuted &&
                  'bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive'
              )}
            >
              {isMuted ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        <Button
          onClick={onSubmit}
          disabled={disabled || isLoading || !value.trim()}
          size="icon"
          className="h-9 w-9 rounded-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
