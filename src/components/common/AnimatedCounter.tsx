"use client";

import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

interface AnimatedCounterProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  duration?: number;
}

export function AnimatedCounter({ value, duration = 1, className, ...props }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView) {
      let start = 0;
      const end = value;
      if (start === end) return;

      const totalFrames = duration * 60; // 60 fps
      const increment = end / totalFrames;
      let currentFrame = 0;

      const timer = setInterval(() => {
        currentFrame++;
        start += increment;
        
        if (currentFrame >= totalFrames) {
          clearInterval(timer);
          setCount(end);
        } else {
          setCount(Math.ceil(start));
        }
      }, 1000 / 60);

      return () => clearInterval(timer);
    }
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className} {...props}>
      {count.toLocaleString()}
    </span>
  );
}
