'use client';

import { useState, useEffect } from 'react';

/**
 * TypingAnimation Component
 * @brief: Terminal-style character-by-character typing animation
 */
interface TypingAnimationProps {
  text: string;
  speed?: number; // milliseconds per character
  className?: string;
  onComplete?: () => void;
  showCursor?: boolean;
}

export function TypingAnimation({
  text,
  speed = 50,
  className = '',
  onComplete,
  showCursor = true,
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {showCursor && currentIndex < text.length && (
        <span className="inline-block w-2 h-5 bg-[var(--accent-cyan)] cursor-blink ml-1" />
      )}
    </span>
  );
}
