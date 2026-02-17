import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  useVideoConfig,
  Easing,
} from 'remotion';

export const PlatformWizardUI: React.FC<{section: number; opacity: number}> = ({
  section,
  opacity,
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();

  // Pasos reales del Wizard según el documento (Paso 1, 2, 3)
  const steps = [
    {id: '01', label: 'CARGA DE CARTERA', detail: 'VALIDACIÓN_ML_ACTIVA'},
    {id: '02', label: 'ESTRATEGIA DE BATCHING', detail: 'OPTIMIZACIÓN_REPUTACIÓN'},
    {id: '03', label: 'EJECUCIÓN Y TRAZABILIDAD', detail: 'TELEMETRÍA_REALTIME'},
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        padding: 100,
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
          height: 80,
          borderBottom: '2px solid #0052FF10',
          display: 'flex',
          alignItems: 'center',
          padding: '0 40px',
          justifyContent: 'space-between',
          backgroundColor: 'white'
        }}>
          <div style={{display: 'flex', gap: 60}}>
            {steps.map((step, i) => (
              <div key={step.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: section >= i ? 1 : 0.2,
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                <div style={{
                  width: 28,
                  height: 28,
                  border: `2px solid ${section >= i ? '#0052FF' : '#ccc'}`,
                  backgroundColor: section === i ? '#0052FF' : 'transparent',
                  color: section === i ? 'white' : '#0052FF',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  borderRadius: 0,
                }}>{step.id}</div>
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  <span style={{fontSize: 10, fontWeight: 900, color: '#0052FF', textTransform: 'uppercase', letterSpacing: 1}}>{step.label}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{fontSize: 10, fontWeight: 900, color: '#0052FF', opacity: 0.5, letterSpacing: 2}}>APEX_OPERATIONS_CORE</div>
        </div>

        {/* Content Area */}
        <div style={{flex: 1, padding: 60, position: 'relative', backgroundColor: '#F8FAFC'}}>
          {/* Section 0: Carga y Validación */}
          {section === 0 && (
            <div style={{display: 'flex', flexDirection: 'column', gap: 30, height: '100%'}}>
               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                 <div style={{fontSize: 16, color: '#1a1a1a', fontWeight: 900, letterSpacing: -0.5}}>CARGA_Y_ANALISIS_DE_CARTERA</div>
                 <div style={{fontSize: 10, color: '#0052FF', fontWeight: 900}}>[ STATUS: ANALIZANDO_PATRONES_ML ]</div>
               </div>
               
               <div style={{
                 flex: 1, 
                 display: 'grid', 
                 gridTemplateColumns: 'repeat(5, 1fr)', 
                 gridTemplateRows: 'repeat(4, 1fr)', 
                 gap: 15,
                 position: 'relative',
                 padding: 2,
                 border: '1px solid #0052FF10',
               }}>
                  {/* Scanning Line */}
                  <div style={{
                    position: 'absolute',
                    top: `${interpolate(frame % 60, [0, 60], [0, 100])}%`,
                    left: 0,
                    width: '100%',
                    height: 4,
                    backgroundColor: '#0052FF',
                    zIndex: 10,
                    boxShadow: '0 0 20px #0052FF80',
                  }} />

                  {Array.from({length: 20}).map((_, i) => {
                    const row = Math.floor(i / 5);
                    const col = i % 5;
                    const appearFrame = (row + col) * 4;
                    const isVisible = frame > appearFrame;
                    const opacity = interpolate(frame - appearFrame, [0, 10], [0, 1], {extrapolateLeft: 'clamp'});
                    const isValid = (i * 7) % 10 > 2; // Simulated validation

                    return (
                      <div key={i} style={{
                        backgroundColor: 'white', 
                        border: `1px solid ${isVisible ? (isValid ? '#0052FF20' : '#FF3B3040') : '#0052FF05'}`,
                        opacity: isVisible ? 1 : 0.2,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        padding: '0 15px',
                        gap: 8,
                        borderRadius: 0,
                        transition: 'border 0.3s ease',
                      }}>
                        <div style={{width: '60%', height: 4, backgroundColor: isVisible ? (isValid ? '#0052FF' : '#FF3B30') : '#0052FF10', opacity: 0.8}} />
                        <div style={{width: '40%', height: 2, backgroundColor: '#0052FF10'}} />
                      </div>
                    );
                  })}
               </div>

               <div style={{display: 'flex', gap: 40, borderTop: '2px solid #0052FF10', paddingTop: 30}}>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: 9, color: '#666', marginBottom: 5, fontWeight: 900}}>REGISTROS_PROCESADOS</div>
                    <div style={{fontSize: 24, fontWeight: 900, color: '#1a1a1a'}}>{Math.min(1542, Math.floor(frame * 25))}</div>
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: 9, color: '#666', marginBottom: 5, fontWeight: 900}}>INTEGRIDAD_DE_DATOS</div>
                    <div style={{fontSize: 24, fontWeight: 900, color: '#0052FF'}}>99.8%</div>
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: 9, color: '#666', marginBottom: 5, fontWeight: 900}}>ML_RISK_SCORING</div>
                    <div style={{fontSize: 24, fontWeight: 900, color: '#1a1a1a'}}>READY</div>
                  </div>
               </div>
            </div>
          )}

          {/* Section 1: Estrategia de Batching */}
          {section === 1 && (
            <div style={{height: '100%', display: 'flex', flexDirection: 'column', gap: 40}}>
               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                 <div style={{fontSize: 16, fontWeight: 900, letterSpacing: -0.5}}>OPTIMIZACIÓN_REPUTACIÓN_DOMINIO</div>
                 <div style={{fontSize: 10, color: '#0052FF', fontWeight: 900}}>[ BATCH_ENGINE: ACTIVE ]</div>
               </div>
               
               <div style={{flex: 1, display: 'flex', alignItems: 'flex-end', gap: 8, border: '1px solid #0052FF10', padding: 30, backgroundColor: 'white'}}>
                  {Array.from({length: 30}).map((_, i) => {
                    const h = interpolate(
                      Math.sin(frame / 12 + i / 2.5),
                      [-1, 1],
                      [30, 90]
                    );
                    return (
                      <div key={i} style={{
                        flex: 1,
                        height: `${h}%`,
                        backgroundColor: '#0052FF',
                        opacity: 0.7,
                        borderRadius: 0,
                      }} />
                    );
                  })}
               </div>
               <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#0052FF', fontWeight: 900, borderTop: '2px solid #0052FF10', paddingTop: 20}}>
                  <span>[ RATE_LIMIT: ENABLED ]</span>
                  <span>[ BATCH_SIZE: 500/HR ]</span>
                  <span>[ DOMAIN_WARMING: ACTIVE ]</span>
               </div>
            </div>
          )}

          {/* Section 2: Ejecución Realtime */}
          {section >= 2 && (
            <div style={{height: '100%', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 40}}>
               <div style={{display: 'flex', flexDirection: 'column', gap: 30}}>
                  <div style={{fontSize: 14, fontWeight: 900, color: '#0052FF', letterSpacing: -0.5}}>TELEMETRÍA_DE_EJECUCIÓN_REALTIME</div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flex: 1}}>
                     {[
                       {l: 'NOTIFICACIONES', v: Math.floor(frame * 6.5)},
                       {l: 'OPEN_RATE', v: '35.4%'},
                       {l: 'ENTREGABILIDAD', v: '99.9%'},
                       {l: 'ROI_ESTIMADO', v: `$${Math.floor(frame * 1850).toLocaleString()}`},
                     ].map(s => (
                       <div key={s.l} style={{padding: 25, border: '2px solid #0052FF', backgroundColor: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                          <div style={{fontSize: 10, color: '#999', marginBottom: 12, letterSpacing: 1, fontWeight: 900}}>{s.l}</div>
                          <div style={{fontSize: 24, fontWeight: 900, color: '#1a1a1a', letterSpacing: -1}}>{s.v}</div>
                       </div>
                     ))}
                  </div>
               </div>
               <div style={{border: '2px solid #0052FF10', backgroundColor: 'white', padding: 30, display: 'flex', flexDirection: 'column'}}>
                  <div style={{fontSize: 10, fontWeight: 900, color: '#0052FF', marginBottom: 20, letterSpacing: 1}}>SISTEMA_TRACE_LOG</div>
                  <div style={{flex: 1, fontSize: 9, color: '#666', lineHeight: 2.2, overflow: 'hidden', fontWeight: 600}}>
                     {Array.from({length: 12}).map((_, i) => (
                       <div key={i}>{`> [${new Date().toLocaleTimeString()}] TRACE: SEND_SUCCESS_ID_${Math.floor(10000 + Math.random() * 90000)}`}</div>
                     ))}
                     <div style={{color: '#0052FF'}}>{`> [${new Date().toLocaleTimeString()}] AGENT: OPTIMIZING_NEXT_BATCH...`}</div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
