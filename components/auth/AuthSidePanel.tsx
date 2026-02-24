'use client'

import { useEffect, useState } from 'react'

const METRICS = [
    { label: 'Cartera Recuperada', value: 94, suffix: '%', color: '#60efb0' },
    { label: 'Días Promedio Cobro', value: 18, suffix: 'd', color: '#93c5fd' },
    { label: 'Clientes Activos', value: 1247, suffix: '', color: '#94a3b8' },
]

const EVENTS = [
    'COLLECTION_EXECUTED',
    'TEMPLATE_SENT',
    'PAYMENT_REGISTERED',
    'THRESHOLD_MATCHED',
    'CLIENT_UPDATED',
    'BATCH_COMPLETE',
    'ROI_UPDATED',
    'STRATEGY_APPLIED',
]

function useCounter(target: number, duration = 1600) {
    const [count, setCount] = useState(0)
    useEffect(() => {
        let start = 0
        const step = target / (duration / 16)
        const timer = setInterval(() => {
            start += step
            if (start >= target) {
                setCount(target)
                clearInterval(timer)
            } else {
                setCount(Math.floor(start))
            }
        }, 16)
        return () => clearInterval(timer)
    }, [target, duration])
    return count
}

function MetricCard({ label, value, suffix, color }: (typeof METRICS)[0]) {
    const count = useCounter(value)
    return (
        <div className="border border-white/10 bg-white/5 px-4 py-3 flex flex-col gap-1 hover:bg-white/10 transition-colors duration-300">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{label}</span>
            <span className="text-2xl font-black tabular-nums" style={{ color }}>
                {count.toLocaleString()}{suffix}
            </span>
        </div>
    )
}

function EventLog() {
    const [logs, setLogs] = useState<{ id: number; event: string; time: string }[]>([])

    useEffect(() => {
        const init = Array.from({ length: 5 }, (_, i) => ({
            id: i,
            event: EVENTS[Math.floor(Math.random() * EVENTS.length)],
            time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        }))
        setLogs(init)

        let seq = init.length
        const id = setInterval(() => {
            setLogs(prev => [
                { id: seq++, event: EVENTS[Math.floor(Math.random() * EVENTS.length)], time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
                ...prev.slice(0, 4), // Keep exactly 5 items
            ])
        }, 2200)
        return () => clearInterval(id)
    }, [])

    return (
        <div className="border border-white/10 bg-white/5 p-3 flex flex-col gap-1.5 font-mono text-[11px] h-[160px] overflow-hidden">
            <span className="text-white/30 uppercase tracking-[0.2em] text-[9px] mb-1">Live Events</span>
            {logs.map((log, i) => (
                <div
                    key={log.id}
                    className="flex items-center gap-2 transition-all duration-500"
                    style={{ opacity: Math.max(0.2, 1 - i * 0.18) }}
                >
                    <span className="text-white/30 flex-shrink-0">{log.time}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0052FF] flex-shrink-0 animate-pulse" />
                    <span className="text-green-400 tracking-wider truncate">{log.event}</span>
                </div>
            ))}
        </div>
    )
}

interface AuthSidePanelProps {
    mode: 'sign-in' | 'sign-up'
}

export function AuthSidePanel({ mode }: AuthSidePanelProps) {
    return (
        <div className="relative hidden md:flex flex-col h-full min-h-screen bg-gray-950 overflow-hidden select-none">
            {/* Grid background */}
            <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />

            {/* Blue spotlight */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at center, rgba(0,82,255,0.18) 0%, transparent 70%)',
                    animation: 'pulse 8s ease-in-out infinite',
                }}
            />

            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-[#0052FF]/50" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-[#0052FF]/50" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-[#0052FF]/50" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-[#0052FF]/50" />

            {/* Content — vertically centered */}
            <div className="relative z-10 flex flex-col h-full p-10 gap-10 justify-center">

                {/* Headline */}
                <div className="flex flex-col gap-2 text-center">
                    <h2 className="text-4xl xl:text-5xl font-black text-white tracking-tighter leading-tight uppercase">
                        {mode === 'sign-in' ? (
                            <>Controla tu<br /><span className="text-[#0052FF]">Cartera</span></>
                        ) : (
                            <>Activa tu<br /><span className="text-[#0052FF]">Estrategia</span></>
                        )}
                    </h2>
                    <p className="text-white/40 text-sm font-mono leading-relaxed max-w-xs mx-auto">
                        {mode === 'sign-in'
                            ? 'Monitorea cobros, recupera cartera y automatiza la gestión de tus clientes en tiempo real.'
                            : 'Conecta tus datos, define umbrales y ejecuta estrategias de cobro con inteligencia'}
                    </p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2">
                    {METRICS.map(m => <MetricCard key={m.label} {...m} />)}
                </div>

                {/* Live event log */}
                <EventLog />

                {/* Bottom tags */}
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-white/20 font-mono text-[9px] uppercase tracking-widest">Sistema activo</span>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                        {['ERP', 'AWS_VPC', 'LATAM_READY', 'ML_MODELS'].map(tag => (
                            <span key={tag} className="text-[9px] font-mono font-black uppercase tracking-widest text-white/20 border border-white/10 px-2 py-0.5">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Animated scan line */}
            <div
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#0052FF]/50 to-transparent pointer-events-none"
                style={{ animation: 'scanline 6s linear infinite' }}
            />

            <style>{`
                @keyframes scanline {
                    0%   { top: 0%; opacity: 0; }
                    10%  { opacity: 1; }
                    90%  { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    )
}
