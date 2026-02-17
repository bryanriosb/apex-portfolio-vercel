import React from 'react';
import {Composition} from 'remotion';
import {ApexExecutionBackground} from './compositions/ApexExecutionBackground';
import {ApexDeepTechBackground} from './compositions/ApexDeepTechBackground';
import {ApexDeliveryComparison} from './compositions/ApexDeliveryComparison';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ApexExecutionBackground"
        component={ApexExecutionBackground}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          nodeCount: 24,
          showGrid: true,
          primaryColor: '#0052FF',
          backgroundColor: '#F4F7FA',
        }}
      />
      <Composition
        id="ApexDeepTechBackground"
        component={ApexDeepTechBackground}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          scrollProgress: 0,
        }}
      />
      <Composition
        id="ApexDeliveryComparison"
        component={ApexDeliveryComparison}
        durationInFrames={240}
        fps={30}
        width={900}
        height={600}
      />
    </>
  );
};
