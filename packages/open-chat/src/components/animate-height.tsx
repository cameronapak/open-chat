import { useRef, useState, useLayoutEffect } from 'react';
import { motion } from "motion/react"

export const AnimatedHeight = ({ children }: { children: React.ReactNode }) => {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');

  useLayoutEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.offsetHeight);
    }
  }, [children]);

  return (
    <motion.div
      style={{ overflow: 'hidden' }}
      animate={{ height }}
      transition={{ duration: 0.3 }}
    >
      <div ref={contentRef}>{children}</div>
    </motion.div>
  );
};
