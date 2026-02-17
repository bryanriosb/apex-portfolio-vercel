import React from 'react';
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
}

export const ApexDeepTechBackground: React.FC<Props> = ({
  scrollProgress = 0,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  // Mapeo refinado para 4 secciones del landing a 3 estados del video
  // 0.0 - 0.2: Carga (ROI/Hero)
  // 0.2 - 0.6: Batching (Estrategia/Pilares)
  // 0.6 - 1.0: Ejecución (Plataforma/Gobernanza)
  const section = interpolate(
    scrollProgress,
    [0, 0.2, 0.6, 1],
    [0, 1, 2, 2],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Animaciones basadas en scroll sutiles
  const uiOpacity = interpolate(scrollProgress, [0, 0.05, 0.95, 1], [0.35, 0.55, 0.55, 0.35]);
  const gridOpacity = interpolate(scrollProgress, [0, 0.5, 1], [0.03, 0.07, 0.03]);

  return (
    <AbsoluteFill style={{backgroundColor: '#F8FAFC'}}>
      <Sequence from={0} durationInFrames={durationInFrames}>
        <DataGridOverlay opacity={gridOpacity} />
      </Sequence>

      <PlatformWizardUI 
        opacity={uiOpacity} 
        section={Math.round(section)}
      />

      {/* Línea de escaneo sutil técnica */}
      <div style={{
        position: 'absolute',
        top: `${(frame % 150) / 1.5}%`,
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
