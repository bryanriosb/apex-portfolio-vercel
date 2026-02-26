import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  useVideoConfig,
} from 'remotion';

interface PlatformWizardUIProps {
  section: number;
  opacity: number;
  isMobile?: boolean;
}

export const PlatformWizardUI: React.FC<PlatformWizardUIProps> = ({
  section,
  opacity,
  isMobile = false,
}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();

  // Pasos reales del Wizard según el documento (Paso 1, 2, 3)
  const steps = useMemo(() => [
    {id: '01', label: 'CARGA DE CARTERA', detail: 'VALIDACIÓN_ML_ACTIVA'},
    {id: '02', label: 'ESTRATEGIA DE BATCHING', detail: 'OPTIMIZACIÓN_REPUTACIÓN'},
    {id: '03', label: 'EJECUCIÓN Y TRAZABILIDAD', detail: 'TELEMETRÍA_REALTIME'},
  ], []);

  // Reducir elementos en móvil
  const gridItems = useMemo(() => {
    const count = isMobile ? 10 : 20;
    return Array.from({length: count}).map((_, i) => ({
      id: i,
      row: Math.floor(i / (isMobile ? 3 : 5)),
      col: i % (isMobile ? 3 : 5),
      isValid: (i * 7) % 10 > 2,
    }));
  }, [isMobile]);

  // Reducir barras en móvil
  const barCount = isMobile ? 15 : 30;
  
  // Memoizar valores de barras para evitar Math.sin en cada render
  const barHeights = useMemo(() => {
    return Array.from({length: barCount}).map((_, i) => {
      return interpolate(
        Math.sin(frame / 12 + i / 2.5),
        [-1, 1],
        [30, 90]
      );
    });
  }, [frame, barCount]);

  // Generar logs estáticos solo una vez cada 30 frames en móvil
  const logs = useMemo(() => {
    return Array.from({length: isMobile ? 6 : 12}).map((_, i) => ({
      id: i,
      traceId: Math.floor(10000 + Math.random() * 90000),
    }));
  }, [isMobile, Math.floor(frame / (isMobile ? 30 : 1))]);

  const scanLineY = useMemo(() => {
    return interpolate(frame % 60, [0, 60], [0, 100]);
  }, [frame]);

  return (
    <AbsoluteFill
      style={{
        opacity,
        padding: isMobile ? 40 : 100,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
      }}
    >
      {/* Platform Interface Container */}
      <div style={{
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        border: '2px solid #0052FF',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '20px 20px 0px rgba(0, 82, 255, 0.1)',
        borderRadius: 0,
      }}>
        {/* Wizard Header */}
        <div style={{
          height: isMobile ? 50 : 80,
          borderBottom: '2px solid #0052FF10',
          display: 'flex',
          alignItems: 'center',
          padding: isMobile ? '0 20px' : '0 40px',
          justifyContent: 'space-between',
          backgroundColor: 'white'
        }}>
          <div style={{display: 'flex', gap: isMobile ? 20 : 60}}>
            {steps.map((step, i) => (
              <div key={step.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? 6 : 12,
                opacity: section >= i ? 1 : 0.2,
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                <div style={{
                  width: isMobile ? 20 : 28,
                  height: isMobile ? 20 : 28,
                  border: `2px solid ${section >= i ? '#0052FF' : '#ccc'}`,
                  backgroundColor: section === i ? '#0052FF' : 'transparent',
                  color: section === i ? 'white' : '#0052FF',
                  fontSize: isMobile ? 10 : 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  borderRadius: 0,
                }}>{step.id}</div>
                {!isMobile && (
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span style={{fontSize: 10, fontWeight: 900, color: '#0052FF', textTransform: 'uppercase', letterSpacing: 1}}>{step.label}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {!isMobile && (
            <div style={{fontSize: 10, fontWeight: 900, color: '#0052FF', opacity: 0.5, letterSpacing: 2}}>APEX_OPERATIONS_CORE</div>
          )}
        </div>

        {/* Content Area */}
        <div style={{flex: 1, padding: isMobile ? 20 : 60, position: 'relative', backgroundColor: '#F8FAFC'}}>
          {/* Section 0: Carga y Validación */}
          {section === 0 && (
            <div style={{display: 'flex', flexDirection: 'column', gap: isMobile ? 15 : 30, height: '100%'}}>
               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                 <div style={{fontSize: isMobile ? 12 : 16, color: '#1a1a1a', fontWeight: 900, letterSpacing: -0.5}}>CARGA_Y_ANALISIS</div>
                 {!isMobile && (
                   <div style={{fontSize: 10, color: '#0052FF', fontWeight: 900}}>[ STATUS: ANALIZANDO_PATRONES_ML ]</div>
                 )}
               </div>
               
               <div style={{
                 flex: 1, 
                 display: 'grid', 
                 gridTemplateColumns: `repeat(${isMobile ? 3 : 5}, 1fr)`, 
                 gridTemplateRows: `repeat(${isMobile ? 4 : 4}, 1fr)`, 
                 gap: isMobile ? 8 : 15,
                 position: 'relative',
                 padding: 2,
                 border: '1px solid #0052FF10',
               }}>
                  {/* Scanning Line - solo en desktop */}
                  {!isMobile && (
                    <div style={{
                      position: 'absolute',
                      top: `${scanLineY}%`,
                      left: 0,
                      width: '100%',
                      height: 4,
                      backgroundColor: '#0052FF',
                      zIndex: 10,
                      boxShadow: '0 0 20px #0052FF80',
                    }} />
                  )}

                  {gridItems.map((item) => {
                    const appearFrame = (item.row + item.col) * 4;
                    const isVisible = frame > appearFrame;
                    const itemOpacity = interpolate(frame - appearFrame, [0, 10], [0, 1], {extrapolateLeft: 'clamp'});

                    return (
                      <div key={item.id} style={{
                        backgroundColor: 'white', 
                        border: `1px solid ${isVisible ? (item.isValid ? '#0052FF20' : '#FF3B3040') : '#0052FF05'}`,
                        opacity: isVisible ? 1 : 0.2,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        padding: isMobile ? '0 8px' : '0 15px',
                        gap: isMobile ? 4 : 8,
                        borderRadius: 0,
                        transition: 'border 0.3s ease',
                      }}>
                        <div style={{width: '60%', height: isMobile ? 2 : 4, backgroundColor: isVisible ? (item.isValid ? '#0052FF' : '#FF3B30') : '#0052FF10', opacity: 0.8}} />
                        {!isMobile && <div style={{width: '40%', height: 2, backgroundColor: '#0052FF10'}} />}
                      </div>
                    );
                  })}
               </div>

               <div style={{display: 'flex', gap: isMobile ? 20 : 40, borderTop: '2px solid #0052FF10', paddingTop: isMobile ? 15 : 30}}>
                 <div style={{flex: 1}}>
                   <div style={{fontSize: 9, color: '#666', marginBottom: 5, fontWeight: 900}}>REGISTROS</div>
                   <div style={{fontSize: isMobile ? 18 : 24, fontWeight: 900, color: '#1a1a1a'}}>{Math.min(1542, Math.floor(frame * 25))}</div>
                 </div>
                 {!isMobile && (
                   <>
                     <div style={{flex: 1}}>
                       <div style={{fontSize: 9, color: '#666', marginBottom: 5, fontWeight: 900}}>INTEGRIDAD</div>
                       <div style={{fontSize: 24, fontWeight: 900, color: '#0052FF'}}>99.8%</div>
                     </div>
                     <div style={{flex: 1}}>
                       <div style={{fontSize: 9, color: '#666', marginBottom: 5, fontWeight: 900}}>ML_RISK</div>
                       <div style={{fontSize: 24, fontWeight: 900, color: '#1a1a1a'}}>READY</div>
                     </div>
                   </>
                 )}
               </div>
            </div>
          )}

          {/* Section 1: Estrategia de Batching */}
          {section === 1 && (
            <div style={{height: '100%', display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 40}}>
               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                 <div style={{fontSize: isMobile ? 12 : 16, fontWeight: 900, letterSpacing: -0.5}}>OPTIMIZACIÓN_REPUTACIÓN</div>
                 {!isMobile && (
                   <div style={{fontSize: 10, color: '#0052FF', fontWeight: 900}}>[ BATCH_ENGINE: ACTIVE ]</div>
                 )}
               </div>
               
               <div style={{flex: 1, display: 'flex', alignItems: 'flex-end', gap: isMobile ? 4 : 8, border: '1px solid #0052FF10', padding: isMobile ? 15 : 30, backgroundColor: 'white'}}>
                  {barHeights.map((h, i) => (
                    <div key={i} style={{
                      flex: 1,
                      height: `${h}%`,
                      backgroundColor: '#0052FF',
                      opacity: 0.7,
                      borderRadius: 0,
                    }} />
                  ))}
               </div>
               {!isMobile && (
                 <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#0052FF', fontWeight: 900, borderTop: '2px solid #0052FF10', paddingTop: 20}}>
                   <span>[ RATE_LIMIT: ENABLED ]</span>
                   <span>[ BATCH_SIZE: 500/HR ]</span>
                   <span>[ DOMAIN_WARMING: ACTIVE ]</span>
                 </div>
               )}
            </div>
          )}

          {/* Section 2: Ejecución Realtime */}
          {section >= 2 && (
            <div style={{height: '100%', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: isMobile ? 20 : 40}}>
               <div style={{display: 'flex', flexDirection: 'column', gap: isMobile ? 15 : 30}}>
                 <div style={{fontSize: isMobile ? 12 : 14, fontWeight: 900, color: '#0052FF', letterSpacing: -0.5}}>TELEMETRÍA_REALTIME</div>
                 <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? 10 : 20, flex: 1}}>
                    {[
                      {l: 'NOTIFICACIONES', v: Math.floor(frame * 6.5)},
                      {l: 'OPEN_RATE', v: '35.4%'},
                      {l: 'ENTREGABILIDAD', v: '99.9%'},
                      {l: 'ROI_ESTIMADO', v: `$${Math.floor(frame * 1850).toLocaleString()}`},
                    ].map(s => (
                      <div key={s.l} style={{padding: isMobile ? 15 : 25, border: '2px solid #0052FF', backgroundColor: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                         <div style={{fontSize: 10, color: '#999', marginBottom: isMobile ? 6 : 12, letterSpacing: 1, fontWeight: 900}}>{s.l}</div>
                         <div style={{fontSize: isMobile ? 16 : 24, fontWeight: 900, color: '#1a1a1a', letterSpacing: -1}}>{s.v}</div>
                      </div>
                    ))}
                 </div>
               </div>
               {!isMobile && (
                 <div style={{border: '2px solid #0052FF10', backgroundColor: 'white', padding: 30, display: 'flex', flexDirection: 'column'}}>
                   <div style={{fontSize: 10, fontWeight: 900, color: '#0052FF', marginBottom: 20, letterSpacing: 1}}>SISTEMA_TRACE_LOG</div>
                   <div style={{flex: 1, fontSize: 9, color: '#666', lineHeight: 2.2, overflow: 'hidden', fontWeight: 600}}>
                      {logs.map((log) => (
                        <div key={log.id}>{`> [${new Date().toLocaleTimeString()}] TRACE: SEND_SUCCESS_ID_${log.traceId}`}</div>
                      ))}
                      <div style={{color: '#0052FF'}}>{`> [${new Date().toLocaleTimeString()}] AGENT: OPTIMIZING_NEXT_BATCH...`}</div>
                   </div>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
