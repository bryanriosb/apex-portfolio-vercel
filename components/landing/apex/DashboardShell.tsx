'use client';

import React, {useRef, useEffect, useState} from 'react';
import {Player, PlayerRef} from '@remotion/player';
import {ApexExecutionBackground} from '@/remotion/compositions/ApexExecutionBackground';
import {Button} from '@/components/ui/button';
import {ArrowRight, Zap, Shield, BarChart3, Crosshair, Terminal} from 'lucide-react';

interface DashboardShellProps {
  nodeCount?: number;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  nodeCount = 24,
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const [isClient, setIsClient] = useState(false);
  const [scanPos, setScanPos] = useState(0);
  
  useEffect(() => {
    setIsClient(true);
    const interval = setInterval(() => {
      setScanPos((prev) => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);
  
  if (!isClient) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center">
        <div className="text-[#0052FF] font-mono text-xs tracking-[0.2em] animate-pulse">
          INITIATING_APEX_SYSTEM_V1.0...
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#F4F7FA] font-sans">
      {/* Scanning Line Animation */}
      <div 
        className="absolute w-full h-[1px] bg-[#0052FF]/20 z-20 pointer-events-none"
        style={{top: `${scanPos}%`}}
      />
      <div 
        className="absolute w-[1px] h-full bg-[#0052FF]/10 z-20 pointer-events-none"
        style={{left: `${scanPos}%`}}
      />

      {/* Remotion Player Background */}
      <div className="absolute inset-0 z-0 opacity-80">
        <Player
          ref={playerRef}
          component={ApexExecutionBackground}
          inputProps={{nodeCount}}
          durationInFrames={300}
          fps={30}
          compositionWidth={1920}
          compositionHeight={1080}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            filter: 'saturate(0.8) contrast(1.05)',
          }}
          autoPlay
          loop
          controls={false}
        />
      </div>

      {/* UI Overlay Corners (Hard-Edge) */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[#0052FF]/30 z-20 m-6 pointer-events-none" />
      <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[#0052FF]/30 z-20 m-6 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[#0052FF]/30 z-20 m-6 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[#0052FF]/30 z-20 m-6 pointer-events-none" />
      
      {/* Content Overlay */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="w-full px-8 py-6 flex items-center justify-between border-b border-[#0052FF]/10 bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0052FF] flex items-center justify-center">
              <Crosshair className="text-white w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-[#0052FF] font-black text-xl tracking-tighter leading-none">APEX</span>
              <span className="text-[10px] text-[#0052FF]/60 font-mono tracking-widest uppercase">Execution Platform</span>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-10">
            {['Infrastructura', 'Algoritmos', 'Gobernanza', 'Documentación'].map((item) => (
              <a
                key={item}
                href="#"
                className="text-[11px] font-mono uppercase tracking-[0.15em] text-gray-500 hover:text-[#0052FF] transition-all"
              >
                {item}
              </a>
            ))}
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-[#0052FF] font-mono text-xs uppercase tracking-wider rounded-none hover:bg-[#0052FF]/5"
            >
              [ Acceso ]
            </Button>
            <Button 
              className="bg-[#0052FF] hover:bg-[#0052FF]/90 text-white font-mono text-xs uppercase tracking-wider rounded-none px-6 shadow-[4px_4px_0px_rgba(0,82,255,0.2)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              Deploy MVP
            </Button>
          </div>
        </nav>
        
        {/* Hero Section */}
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-8 py-12">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 bg-[#0052FF]/5 border border-[#0052FF]/20">
                <Terminal className="w-3 h-3 text-[#0052FF]" />
                <span className="text-[#0052FF] text-[10px] font-mono tracking-[0.2em] uppercase">
                  System Status: Operational // Latency: 24ms
                </span>
              </div>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 mb-8 leading-[0.9] tracking-tighter uppercase">
                Cartera de <br />
                <span className="text-[#0052FF]">Alta Precisión</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl font-light leading-relaxed border-l-2 border-[#0052FF] pl-6">
                Infraestructura distribuida para el recaudo inteligente. 
                APEX transforma procesos manuales en flujos de ejecución 
                automatizados con una tasa de efectividad del 35%+.
              </p>
              
              <div className="flex flex-wrap gap-6 mb-16">
                <Button 
                  size="lg"
                  className="bg-[#0052FF] hover:bg-[#0052FF]/95 text-white font-mono text-sm uppercase tracking-widest rounded-none h-14 px-10 group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Iniciar Secuencia
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
                
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-gray-300 text-gray-600 font-mono text-sm uppercase tracking-widest rounded-none h-14 px-10 hover:bg-white hover:text-[#0052FF] hover:border-[#0052FF] transition-all"
                >
                  Whitepaper
                </Button>
              </div>
              
              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                {[
                  {value: '35%+', label: 'Efectividad'},
                  {value: '10X', label: 'Escalabilidad'},
                  {value: 'ISO', label: 'Seguridad'},
                  {value: 'API', label: 'First'},
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col gap-1">
                    <div className="text-3xl font-black text-gray-900 tabular-nums">
                      {stat.value}
                    </div>
                    <div className="text-[10px] text-[#0052FF] font-mono uppercase tracking-[0.2em]">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Bento Grid Features */}
        <div className="w-full max-w-7xl mx-auto px-8 py-24 border-t border-[#0052FF]/10 bg-white/30 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1">
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Batching Adaptativo"
              description="Orquestación dinámica de envíos basada en métricas de reputación en tiempo real."
              className="md:col-span-2"
            />
            
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Trust Protocol"
              description="Validación criptográfica de adjuntos y reputación de dominio automatizada."
            />
            
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Analytics Core"
              description="Trazabilidad total desde la carga del Excel hasta el recaudo final."
            />
            
            <div className="md:col-span-4 bg-[#0052FF] p-10 flex flex-col md:flex-row items-center justify-between gap-8 mt-1">
              <div className="max-w-md">
                <div className="text-white/60 font-mono text-[10px] tracking-[0.3em] uppercase mb-4">Módulo de Integración</div>
                <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-tight">
                  Conectividad Nativa con su Ecosistema ERP
                </h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  APEX se integra bidireccionalmente para sincronizar estados de cuenta sin intervención humana.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="w-16 h-16 bg-white/10 border border-white/20 flex items-center justify-center">
                    <div className="w-8 h-[1px] bg-white/40" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="w-full px-8 py-12 bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="text-[10px] text-gray-400 font-mono uppercase tracking-[0.2em]">
                © 2026 APEX TECHNOLOGIES CORP.
              </div>
              <div className="w-1 h-1 bg-gray-300 rounded-full" />
              <div className="text-[10px] text-gray-400 font-mono uppercase tracking-[0.2em]">
                Borls Group Portfolio
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              {['Gobernanza', 'Privacidad', 'Terminal'].map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 hover:text-[#0052FF] transition-colors"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

// Feature Card Component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  className = '',
}) => {
  return (
    <div 
      className={`bg-white p-8 border border-gray-100 hover:border-[#0052FF]/30 transition-all group flex flex-col justify-between min-h-[280px] ${className}`}
    >
      <div>
        <div className="w-12 h-12 bg-gray-50 border border-gray-100 flex items-center justify-center mb-8 text-gray-400 group-hover:bg-[#0052FF] group-hover:text-white group-hover:border-[#0052FF] transition-all">
          {icon}
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-tight">
          {title}
        </h3>
        
        <p className="text-sm text-gray-500 leading-relaxed font-light">
          {description}
        </p>
      </div>
      
      <div className="mt-8 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-mono text-[#0052FF] uppercase tracking-widest">Ver Especificaciones</span>
        <ArrowRight className="w-3 h-3 text-[#0052FF]" />
      </div>
    </div>
  );
};
