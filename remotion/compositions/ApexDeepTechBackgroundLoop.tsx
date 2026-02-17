import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Sequence,
} from 'remotion';
import {PlatformWizardUI} from '../components/PlatformWizardUI';
import {DataGridOverlay} from '../components/DataGridOverlay';

interface Props {
  isMobile?: boolean;
}

// Versión loop del background que no depende de scroll
// Hace un ciclo completo: Carga → Batching → Ejecución → Carga
export const ApexDeepTechBackgroundLoop: React.FC<Props> = ({
  isMobile = false,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  
  // Ciclo de animación: 0-100: Carga, 100-200: Batching, 200-300: Ejecución
  const section = useMemo(() => {
    const progress = (frame % durationInFrames) / durationInFrames;
    if (progress < 0.33) return 0;
    if (progress < 0.66) return 1;
    return 2;
  }, [frame, durationInFrames]);

  // Opacidad con fade in/out suave
  const uiOpacity = useMemo(() => {
    const progress = (frame % durationInFrames) / durationInFrames;
    // Fade in en 0-5%, mantener 5-95%, fade out 95-100%
    return interpolate(progress, [0, 0.05, 0.95, 1], [0.3, 0.55, 0.55, 0.3]);
  }, [frame, durationInFrames]);
  
  const gridOpacity = useMemo(() => {
    const progress = (frame % durationInFrames) / durationInFrames;
    return interpolate(progress, [0, 0.5, 1], [0.03, 0.07, 0.03]);
  }, [frame, durationInFrames]);

  // Calcular posición de línea de escaneo
  const scanLineY = useMemo(() => {
    return (frame % 150) / 1.5;
  }, [frame]);

  return (
    <AbsoluteFill style={{backgroundColor: '#F8FAFC'}}>
      <Sequence from={0} durationInFrames={durationInFrames}>
        <DataGridOverlay opacity={gridOpacity} isMobile={isMobile} />
      </Sequence>

      <PlatformWizardUI 
        opacity={uiOpacity} 
        section={section}
        isMobile={isMobile}
      />

      {/* Línea de escaneo sutil técnica */}
      <div style={{
        position: 'absolute',
        top: `${scanLineY}%`,
        left: 0,
        width: '100%',
        height: '1px',
        backgroundColor: '#0052FF',
        opacity: 0.04,
        boxShadow: '0 0 20px #0052FF',
      }} />
    </AbsoluteFill>
  );
};
