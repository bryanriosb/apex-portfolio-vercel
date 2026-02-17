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
  scrollProgress?: number; // 0 to 1
  isMobile?: boolean;
}

export const ApexDeepTechBackground: React.FC<Props> = ({
  scrollProgress = 0,
  isMobile = false,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  // Mapeo refinado para 4 secciones del landing a 3 estados del video
  // 0.0 - 0.2: Carga (ROI/Hero)
  // 0.2 - 0.6: Batching (Estrategia/Pilares)
  // 0.6 - 1.0: Ejecución (Plataforma/Gobernanza)
  const section = useMemo(() => {
    return interpolate(
      scrollProgress,
      [0, 0.2, 0.6, 1],
      [0, 1, 2, 2],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }, [scrollProgress]);

  // Animaciones basadas en scroll sutiles
  const uiOpacity = useMemo(() => {
    return interpolate(scrollProgress, [0, 0.05, 0.95, 1], [0.35, 0.55, 0.55, 0.35]);
  }, [scrollProgress]);
  
  const gridOpacity = useMemo(() => {
    return interpolate(scrollProgress, [0, 0.5, 1], [0.03, 0.07, 0.03]);
  }, [scrollProgress]);

  // Calcular posición de línea de escaneo solo si no es móvil
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
        section={Math.round(section)}
        isMobile={isMobile}
      />

      {/* Línea de escaneo sutil técnica - solo en desktop */}
      {!isMobile && (
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
      )}
    </AbsoluteFill>
  );
};
