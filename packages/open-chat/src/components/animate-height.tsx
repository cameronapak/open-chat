import { useRef, useState, useCallback } from 'react';
import { motion } from "motion/react"
import { cn } from "@/lib/utils";

export const AnimatedHeight = ({ children, className, ...props }: { children: React.ReactNode, className?: string }) => {
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const [prevHeight, setPrevHeight] = useState<number | 'auto'>('auto');
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const containerRef = useCallback((node: HTMLDivElement) => {
    if (node !== null) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        // We only have one entry, so we can use entries[0].
        const observedHeight = entries?.[0]?.contentRect?.height;
        setHeight((previousHeight) => {
          setPrevHeight(previousHeight);
          return observedHeight ?? "auto"
        });
      });
      resizeObserverRef.current.observe(node);
    } else if (resizeObserverRef.current) {
      // Disconnect the observer when the node is unmounted to prevent memory leaks
      resizeObserverRef.current.disconnect();
    }
  }, []);

  return (
    <motion.div
      style={{ height }}
      initial={{ height: prevHeight }}
      animate={{ height }}
      transition={{
        type: "spring",
        duration: 1.25,
        bounce: 0.2,
      }}
      className={cn("overflow-hidden", className)}
      {...props}
    >
      <div ref={containerRef}>{children}</div>
    </motion.div>
  );
};
