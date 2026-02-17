import React, { useMemo } from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';

interface DataGridOverlayProps {
  opacity?: number;
  isMobile?: boolean;
}

export const DataGridOverlay: React.FC<DataGridOverlayProps> = ({opacity = 0.15, isMobile = false}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  
  // Grid más grande en móvil para menos elementos
  const gridSize = isMobile ? 120 : 80;
  
  // Memoizar cálculos de grid
  const gridDimensions = useMemo(() => ({
    cols: Math.ceil(width / gridSize),
    rows: Math.ceil(height / gridSize),
  }), [width, height, gridSize]);
  
  // Reducir puntos en móvil
  const pointCount = isMobile ? 4 : 12;
  
  // Memoizar posiciones de puntos (no cambian)
  const pointPositions = useMemo(() => {
    return Array.from({length: pointCount}).map((_, i) => ({
      id: i,
      x: ((i * 197) % gridDimensions.cols) * gridSize,
      y: ((i * 127) % gridDimensions.rows) * gridSize,
      delay: i * 15,
    }));
  }, [gridDimensions.cols, gridDimensions.rows, gridSize, pointCount]);

  // Memoizar opacidades calculadas
  const pointOpacities = useMemo(() => {
    return pointPositions.map((point) => {
      const loopedFrame = (frame + point.delay) % 90;
      return interpolate(
        loopedFrame,
        [0, 45, 90],
        [0.1, 0.6, 0.1],
        {extrapolateRight: 'clamp'}
      );
    });
  }, [frame, pointPositions]);

  // En móvil, usar solo CSS para el grid sin SVG complejo
  if (isMobile) {
    return (
      <AbsoluteFill
        style={{
          opacity,
          pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(to right, #0052FF08 1px, transparent 1px),
            linear-gradient(to bottom, #0052FF08 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
        }}
      />
    );
  }
  
  return (
    <AbsoluteFill
      style={{
        opacity,
        pointerEvents: 'none',
      }}
    >
      <svg width={width} height={height} style={{position: 'absolute'}}>
        <defs>
          <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke="#0052FF"
              strokeWidth="0.5"
              opacity={0.2}
            />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />
        
        {/* Animated coordinate points (Squares) */}
        {pointPositions.map((point, i) => (
          <g key={point.id}>
            <rect
              x={point.x - 1}
              y={point.y - 1}
              width={3}
              height={3}
              fill="#0052FF"
              opacity={pointOpacities[i]}
            />
            <text
              x={point.x + 10}
              y={point.y + 4}
              fill="#0052FF"
              fontSize={7}
              fontFamily="monospace"
              opacity={pointOpacities[i] * 0.5}
            >
              {`LN_${point.id}:[${Math.floor(point.x)},${Math.floor(point.y)}]`}
            </text>
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};
