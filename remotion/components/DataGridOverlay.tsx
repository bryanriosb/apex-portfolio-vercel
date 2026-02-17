import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';

interface DataGridOverlayProps {
  opacity?: number;
}

export const DataGridOverlay: React.FC<DataGridOverlayProps> = ({opacity = 0.15}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  
  const gridSize = 80;
  const cols = Math.ceil(width / gridSize);
  const rows = Math.ceil(height / gridSize);
  
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
        {Array.from({length: 12}).map((_, i) => {
          const x = ((i * 197) % cols) * gridSize;
          const y = ((i * 127) % rows) * gridSize;
          const loopedFrame = (frame + i * 15) % 90;
          const blinkOpacity = interpolate(
            loopedFrame,
            [0, 45, 90],
            [0.1, 0.6, 0.1],
            {extrapolateRight: 'clamp'}
          );
          
          return (
            <g key={i}>
              <rect
                x={x - 1}
                y={y - 1}
                width={3}
                height={3}
                fill="#0052FF"
                opacity={blinkOpacity}
              />
              <text
                x={x + 10}
                y={y + 4}
                fill="#0052FF"
                fontSize={7}
                fontFamily="monospace"
                opacity={blinkOpacity * 0.5}
              >
                {`LN_${i}:[${Math.floor(x)},${Math.floor(y)}]`}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
