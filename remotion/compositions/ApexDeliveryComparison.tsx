import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';

interface Email {
  id: number;
  x: number;
  y: number;
  speed: number;
  delay: number;
  isApex: boolean;
  delivered: boolean;
}

export const ApexDeliveryComparison: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  // Generate emails - 100 total (50 for each path)
  const emails = React.useMemo(() => {
    const emailList: Email[] = [];
    for (let i = 0; i < 100; i++) {
      const isApex = i < 50;
      // Apex has 99.9% delivery rate (only 1 out of 50 fails)
      // Bulk has 62.4% delivery rate (19 out of 50 fail)
      const delivered = isApex ? i !== 0 : i < 31; // 50-19 = 31 delivered
      
      emailList.push({
        id: i,
        x: -50,
        y: isApex ? 150 + (i % 50) * 6 : 450 + (i % 50) * 6,
        speed: 3 + Math.random() * 2,
        delay: i * 3,
        isApex,
        delivered,
      });
    }
    return emailList;
  }, []);

  // Animation progress
  const progress = frame / durationInFrames;
  
  // Stats animation
  const apexStat = interpolate(
    frame,
    [60, 120],
    [0, 99.9],
    { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
  );
  
  const bulkStat = interpolate(
    frame,
    [60, 120],
    [0, 62.4],
    { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* Grid background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0,82,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,82,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'monospace',
          fontSize: '14px',
          fontWeight: 900,
          color: '#0052FF',
          letterSpacing: '0.3em',
          opacity: interpolate(frame, [0, 30], [0, 1]),
        }}
      >
        COMPARATIVA DE ENTREGABILIDAD
      </div>

      {/* APEX Path */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          top: 120,
          fontSize: '18px',
          fontWeight: 900,
          color: '#0052FF',
          fontFamily: 'system-ui',
          opacity: interpolate(frame, [0, 30], [0, 1]),
        }}
      >
        APEX ENGINE
      </div>

      {/* Bulk Path */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          top: 420,
          fontSize: '18px',
          fontWeight: 900,
          color: '#666',
          fontFamily: 'system-ui',
          opacity: interpolate(frame, [0, 30], [0, 1]),
        }}
      >
        SISTEMAS BULK
      </div>

      {/* Emails */}
      {emails.map((email) => {
        const emailFrame = frame - email.delay;
        if (emailFrame < 0) return null;

        const x = interpolate(
          emailFrame,
          [0, 150],
          [email.x, 700],
          { extrapolateRight: 'clamp' }
        );

        // For undelivered emails, they fade out or fall
        const isLost = !email.delivered && emailFrame > 100;
        const lostOpacity = isLost
          ? interpolate(emailFrame, [100, 130], [1, 0])
          : 1;
        const lostY = isLost
          ? interpolate(emailFrame, [100, 130], [email.y, email.y + 100])
          : email.y;

        return (
          <div
            key={email.id}
            style={{
              position: 'absolute',
              left: x,
              top: lostY,
              width: 24,
              height: 16,
              backgroundColor: email.isApex ? '#0052FF' : '#666',
              borderRadius: 2,
              opacity: lostOpacity,
              boxShadow: email.isApex ? '0 0 10px rgba(0,82,255,0.5)' : 'none',
            }}
          >
            {/* Envelope detail */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '50%',
                borderBottom: `1px solid ${email.isApex ? '#0066FF' : '#777'}`,
              }}
            />
          </div>
        );
      })}

      {/* Inbox - APEX */}
      <div
        style={{
          position: 'absolute',
          right: 80,
          top: 130,
          width: 120,
          height: 280,
          border: '3px solid #0052FF',
          borderRadius: 8,
          backgroundColor: 'rgba(0,82,255,0.1)',
          opacity: interpolate(frame, [30, 60], [0, 1]),
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -30,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 700,
            color: '#0052FF',
          }}
        >
          INBOX
        </div>
        
        {/* Counter */}
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '32px',
              fontWeight: 900,
              color: '#0052FF',
              fontFamily: 'monospace',
            }}
          >
            {apexStat.toFixed(1)}%
          </div>
          <div
            style={{
              fontSize: '10px',
              color: '#0052FF',
              opacity: 0.7,
            }}
          >
            LLEGAN
          </div>
        </div>
      </div>

      {/* Inbox - Bulk */}
      <div
        style={{
          position: 'absolute',
          right: 80,
          top: 430,
          width: 120,
          height: 280,
          border: '3px solid #444',
          borderRadius: 8,
          backgroundColor: 'rgba(100,100,100,0.1)',
          opacity: interpolate(frame, [30, 60], [0, 1]),
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -30,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 700,
            color: '#666',
          }}
        >
          INBOX
        </div>
        
        {/* Counter */}
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '32px',
              fontWeight: 900,
              color: '#666',
              fontFamily: 'monospace',
            }}
          >
            {bulkStat.toFixed(1)}%
          </div>
          <div
            style={{
              fontSize: '10px',
              color: '#666',
              opacity: 0.7,
            }}
          >
            LLEGAN
          </div>
        </div>
      </div>

      {/* Spam/Basura zone for Bulk */}
      <div
        style={{
          position: 'absolute',
          right: 250,
          top: 550,
          width: 200,
          height: 100,
          opacity: interpolate(frame, [90, 120], [0, 1]),
        }}
      >
        <div
          style={{
            fontSize: '10px',
            color: '#444',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          SPAM / NO LLEGAN
        </div>
        <div
          style={{
            height: 2,
            backgroundColor: '#333',
            borderRadius: 1,
          }}
        />
      </div>

      {/* Result message */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: 700,
          color: '#0052FF',
          opacity: interpolate(frame, [150, 180], [0, 1]),
        }}
      >
        APEX: 37.5% MÁS EMAILS EN EL INBOX
      </div>
    </AbsoluteFill>
  );
};