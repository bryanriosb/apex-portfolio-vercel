'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface CyclingTechnicalTypewriterProps {
  texts: string[];
  className?: string;
  delay?: number;
  interval?: number;
  deleteSpeed?: number;
  typeSpeed?: number;
}

export const CyclingTechnicalTypewriter: React.FC<CyclingTechnicalTypewriterProps> = ({
  texts,
  className = '',
  delay = 0,
  interval = 5000,
  deleteSpeed = 20,
  typeSpeed = 30,
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'waiting' | 'deleting'>('typing');
  const chars = '!<>-_\\/[]{}—=+*^?#________';

  const currentText = texts[currentIndex];

  useEffect(() => {
    const timer = setTimeout(() => setIsStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!isStarted) return;

    let iterations = 0;
    let intervalId: NodeJS.Timeout;

    const typeText = () => {
      intervalId = setInterval(() => {
        setDisplayText(prev => {
          const result = currentText.split('')
            .map((char, index) => {
              if (index < iterations) {
                return currentText[index];
              }
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join('');
          
          return result;
        });

        if (iterations >= currentText.length) {
          clearInterval(intervalId);
          setPhase('waiting');
          setTimeout(() => {
            setPhase('deleting');
          }, interval - (currentText.length * deleteSpeed) - (currentText.length * typeSpeed));
        }

        iterations += 1/3;
      }, typeSpeed);

      return () => clearInterval(intervalId);
    };

    const deleteText = () => {
      let currentLength = currentText.length;
      intervalId = setInterval(() => {
        currentLength -= 1;
        setDisplayText(currentText.slice(0, currentLength));

        if (currentLength <= 0) {
          clearInterval(intervalId);
          setCurrentIndex((prev) => (prev + 1) % texts.length);
          setPhase('typing');
        }
      }, deleteSpeed);

      return () => clearInterval(intervalId);
    };

    if (phase === 'typing') {
      return typeText();
    } else if (phase === 'deleting') {
      return deleteText();
    }

    return () => {};
  }, [isStarted, currentText, phase, interval, deleteSpeed, typeSpeed, chars]);

  return (
    <span className={`${className} font-mono inline-block`}>
      {displayText}
    </span>
  );
};
