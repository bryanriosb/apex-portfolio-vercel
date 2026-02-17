'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Search, Database, ShieldCheck, CheckCircle2 } from 'lucide-react'

export const DataValidationAnimation = () => {
  const [step, setStep] = React.useState(0)
  const steps = [
    { label: 'SCANNING_RECORDS', icon: <Search className="w-3 h-3" /> },
    { label: 'IDENTIFYING_ENTITIES', icon: <Database className="w-3 h-3" /> },
    {
      label: 'VERIFYING_COMPLIANCE',
      icon: <ShieldCheck className="w-3 h-3" />,
    },
    {
      label: 'MASTER_DATA_CLEANED',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
  ]

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full h-full bg-gray-50 border-4 border-gray-900 overflow-hidden p-6 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className="font-mono text-[10px] font-black text-gray-400 uppercase tracking-widest">
          SYSTEM_INTEGRITY_v2.0
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
              className="w-1.5 h-1.5 bg-[#0052FF]"
            />
          ))}
        </div>
      </div>

      <div
        className={`grid grid-cols-4 gap-2 mb-6 ${step === 3 ? '' : 'opacity-40'}`}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              backgroundColor: step >= 2 && i % 3 === 0 ? '#0052FF' : '#E5E7EB',
            }}
            className="h-16 border border-gray-300 flex items-center justify-center"
          >
            {step >= 2 && i % 3 === 0 && (
              <div
                className={`!w-6 !h-6 rounded-full flex items-center justify-center`}
              >
                <CheckCircle2
                  className={`!w-6 !h-6  ${step === 3 && 'fill-[#059669] text-white'}`}
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[10px] font-black text-[#0052FF]">
            {steps[step].icon}
            <motion.span
              key={step}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {steps[step].label}
            </motion.span>
          </div>
          <div className="font-mono text-[10px] font-black text-gray-900">
            {Math.round((step + 1) * 25)}%
          </div>
        </div>
        <div className="h-2 bg-gray-200 w-full relative">
          <motion.div
            className="absolute inset-y-0 left-0 bg-[#0052FF]"
            animate={{ width: `${(step + 1) * 25}%` }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none border-[20px] border-transparent border-t-gray-900/5 border-l-gray-900/5" />
    </div>
  )
}
