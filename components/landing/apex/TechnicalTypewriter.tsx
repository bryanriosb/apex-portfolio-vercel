'use client';

import React, {useState, useEffect} from 'react';

interface Props {
  text: string;
  className?: string;
  delay?: number;
}

export const TechnicalTypewriter: React.FC<Props> = ({
  text,
  className = '',
  delay = 0,
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const chars = '!<>-_\\/[]{}—=+*^?#________';

  useEffect(() => {
    const timer = setTimeout(() => setIsStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!isStarted) return;

    let iterations = 0;
    const interval = setInterval(() => {
      setDisplayText(prev => 
        text.split('')
          .map((char, index) => {
            if (index < iterations) {
              return text[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );

      if (iterations >= text.length) {
        clearInterval(interval);
      }

      iterations += 1/3; // Más lento y caótico
    }, 30);

    return () => clearInterval(interval);
  }, [isStarted, text]);

  return (
    <span className={`${className} font-mono inline-block min-w-[1ch]`}>
      {displayText}
    </span>
  );
};
