import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';

interface Node {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  delay: number;
  speed: number;
}

interface NetworkFlowProps {
  nodeCount?: number;
  primaryColor?: string;
}

export const NetworkFlow: React.FC<NetworkFlowProps> = ({
  nodeCount = 20,
  primaryColor = '#0052FF',
}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  
  // Generate nodes with deterministic positions
  const nodes: Node[] = React.useMemo(() => {
    return Array.from({length: nodeCount}, (_, i) => ({
      id: i,
      x: -150 - (i * 80),
      y: 100 + ((i * 53) % (height - 200)),
      width: 80 + ((i * 23) % 60),
      height: 24 + ((i * 11) % 16),
      delay: i * 8,
      speed: 3 + ((i * 0.5) % 2),
    }));
  }, [nodeCount, height]);
  
  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Connection lines between nodes */}
      <svg
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {nodes.map((node, i) => {
          const progress = interpolate(
            frame - node.delay,
            [0, 300],
            [0, width + 300],
            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
          );
          
          const currentX = node.x + progress;
          
          // Draw connection to next node
          if (i < nodes.length - 1) {
            const nextNode = nodes[i + 1];
            const nextProgress = interpolate(
              frame - nextNode.delay,
              [0, 300],
              [0, width + 300],
              {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
            );
            const nextX = nextNode.x + nextProgress;
            
            const opacity = interpolate(
              frame - node.delay,
              [0, 30, 270, 300],
              [0, 1, 1, 0],
              {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
            );
            
            if (opacity > 0 && currentX > -100 && nextX > -100) {
              return (
                <line
                  key={`line-${node.id}`}
                  x1={currentX + node.width}
                  y1={node.y + node.height / 2}
                  x2={nextX}
                  y2={nextNode.y + nextNode.height / 2}
                  stroke={primaryColor}
                  strokeWidth={1}
                  opacity={opacity * 0.2}
                  strokeDasharray="4,4"
                />
              );
            }
          }
          return null;
        })}
      </svg>
      
      {/* Nodes */}
      {nodes.map((node) => {
        const progress = interpolate(
          frame - node.delay,
          [0, 300],
          [0, width + 300],
          {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
        );
        
        const currentX = node.x + progress;
        const opacity = interpolate(
          frame - node.delay,
          [0, 20, 280, 300],
          [0, 1, 1, 0],
          {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
        );
        
        const scale = spring({
          frame: frame - node.delay,
          fps,
          config: {damping: 200},
        });
        
        if (opacity <= 0) return null;
        
        return (
          <div
            key={node.id}
            style={{
              position: 'absolute',
              left: currentX,
              top: node.y,
              width: node.width,
              height: node.height,
              backgroundColor: primaryColor,
              opacity: opacity * 0.6,
              transform: `scale(${0.8 + scale * 0.2})`,
              transformOrigin: 'center center',
              boxShadow: `0 0 20px ${primaryColor}30`,
            }}
          >
            {/* Inner data lines */}
            <div
              style={{
                position: 'absolute',
                top: 4,
                left: 4,
                right: 4,
                height: 1,
                backgroundColor: 'rgba(255,255,255,0.3)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                width: 4,
                height: 4,
                backgroundColor: 'rgba(255,255,255,0.4)',
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
