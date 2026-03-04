import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Sequence,
  spring,
} from 'remotion';
import {DataGridOverlay} from '../components/DataGridOverlay';
import {NetworkFlow} from '../components/NetworkFlow';

interface ApexExecutionBackgroundProps {
  nodeCount?: number;
  showGrid?: boolean;
  primaryColor?: string;
  backgroundColor?: string;
}

export const ApexExecutionBackground: React.FC<ApexExecutionBackgroundProps> = ({
  nodeCount = 24,
  showGrid = true,
  primaryColor = '#0052FF',
  backgroundColor = '#F4F7FA',
}) => {
  const frame = useCurrentFrame();
  const {width, height, fps, durationInFrames} = useVideoConfig();
  
  // Progress indicator animation
  const progressSpring = spring({
    frame,
    fps,
    config: {damping: 200},
    durationInFrames: durationInFrames * 0.8,
  });
  
  const progressWidth = interpolate(progressSpring, [0, 1], [0, width * 0.8]);
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        overflow: 'hidden',
      }}
    >
      {/* Data Grid Background */}
      {showGrid && (
        <Sequence from={0} durationInFrames={durationInFrames}>
          <DataGridOverlay opacity={0.1} />
        </Sequence>
      )}
      
      {/* Network Flow Animation */}
      <Sequence from={0} durationInFrames={durationInFrames}>
        <NetworkFlow 
          nodeCount={nodeCount} 
          primaryColor={primaryColor}
        />
      </Sequence>

      {/* Data Cleaning Visualization (Excel simulation) */}
      <Sequence from={0} durationInFrames={durationInFrames}>
        <DataCleaning primaryColor={primaryColor} />
      </Sequence>
      
      {/* Agent Thinking Visualization */}
      <Sequence from={fps * 2} durationInFrames={durationInFrames - fps * 2}>
        <AgentThinking 
          primaryColor={primaryColor}
        />
      </Sequence>
      
      {/* Progress Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: '10%',
          width: '80%',
          height: 2,
          backgroundColor: `${primaryColor}20`,
        }}
      >
        <div
          style={{
            width: progressWidth,
            height: '100%',
            backgroundColor: primaryColor,
            boxShadow: `0 0 10px ${primaryColor}`,
          }}
        />
      </div>
      
      {/* Status Text */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '10%',
          color: primaryColor,
          fontFamily: 'monospace',
          fontSize: 11,
          letterSpacing: 1,
          opacity: 0.7,
        }}
      >
        APEX EXECUTION ENGINE v1.0 | PROCESANDO {nodeCount} ELEMENTOS | LATENCY: 24ms
      </div>
    </AbsoluteFill>
  );
};

// Data Cleaning / Excel Simulation Component
const DataCleaning: React.FC<{primaryColor: string}> = ({primaryColor}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  
  const rows = 12;
  const cols = 8;
  const cellWidth = 100;
  const cellHeight = 20;
  
  const startX = 100;
  const startY = height / 2 - (rows * cellHeight) / 2;

  return (
    <div style={{position: 'absolute', left: startX, top: startY, opacity: 0.4}}>
      {Array.from({length: rows}).map((_, r) => (
        <div key={r} style={{display: 'flex'}}>
          {Array.from({length: cols}).map((_, c) => {
            const isProcessing = (frame / 2 + r * 5 + c) % 50 < 10;
            const isCleaned = (frame / 2 + r * 5 + c) % 50 > 25;
            
            return (
              <div
                key={c}
                style={{
                  width: cellWidth,
                  height: cellHeight,
                  border: `0.5px solid ${primaryColor}20`,
                  backgroundColor: isProcessing 
                    ? `${primaryColor}40` 
                    : isCleaned ? `${primaryColor}10` : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 4px',
                  transition: 'background-color 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: isProcessing ? '80%' : isCleaned ? '40%' : '60%',
                    height: 4,
                    backgroundColor: isProcessing ? primaryColor : `${primaryColor}40`,
                    opacity: 0.5,
                  }}
                />
              </div>
            );
          })}
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          top: -20,
          left: 0,
          color: primaryColor,
          fontFamily: 'monospace',
          fontSize: 10,
          letterSpacing: 1,
        }}
      >
        DATA_CLEANING_MODULE.XLSX
      </div>
    </div>
  );
};

// Agent Thinking Component
const AgentThinking: React.FC<{primaryColor: string}> = ({primaryColor}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  
  const thoughts = [
    'ANALIZANDO CARTERA...',
    'VALIDANDO DATOS...',
    'OPTIMIZANDO BATCH...',
    'PREPARANDO ENVÍOS...',
    'CALIBRANDO REPUTACIÓN...',
    'VERIFICANDO RUT/CC...',
  ];
  
  const currentThoughtIndex = Math.floor((frame / (fps * 1.5)) % thoughts.length);
  const currentThought = thoughts[currentThoughtIndex];
  
  const cursorOpacity = interpolate(
    frame % fps,
    [0, fps * 0.5, fps],
    [1, 0, 1],
    {extrapolateRight: 'clamp'}
  );
  
  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        right: 60,
        padding: '12px 16px',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderLeft: `4px solid ${primaryColor}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          color: primaryColor,
          fontFamily: 'monospace',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 1,
          marginBottom: 4,
        }}
      >
        AGENTE APEX_CORE
      </div>
      <div
        style={{
          color: '#1A1A1A',
          fontFamily: 'monospace',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontWeight: 500,
        }}
      >
        {currentThought}
        <span style={{opacity: cursorOpacity, color: primaryColor}}>▊</span>
      </div>
    </div>
  );
};
