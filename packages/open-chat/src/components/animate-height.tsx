import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from "motion/react"
import { cn } from "@/lib/utils";

export const AnimatedHeight = ({ children, className, shouldBlurIn, show = true, ...props }: { children: React.ReactNode, className?: string, shouldBlurIn?: boolean, show?: boolean }) => {
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [parentHeight, setParentHeight] = useState<number | null>(null);

  const motionNodeRef = useRef<HTMLDivElement | null>(null);
  const contentObserverRef = useRef<ResizeObserver | null>(null);
  const parentObserverRef = useRef<ResizeObserver | null>(null);

  const variants = useMemo(() => {
    return {
      collapsed: {
        opacity: 0,
        height: '0px',
        transform: 'scale(0.975)',
        filter: 'blur(12px)',
      },

      expanded: {
        opacity: 1,
        height,
        transform: 'scale(1)',
        filter: 'blur(0px)',
      },
    }
  }, [height])

  const setMotionRef = useCallback((node: HTMLDivElement | null) => {
    motionNodeRef.current = node;

    if (parentObserverRef.current) {
      parentObserverRef.current.disconnect();
      parentObserverRef.current = null;
    }

    if (!node) {
      setParentHeight(null);
      return;
    }

    const parent = node.parentElement;
    if (!parent) {
      setParentHeight(null);
      return;
    }

    const updateParentHeight = () => setParentHeight(parent.clientHeight);
    updateParentHeight();

    parentObserverRef.current = new ResizeObserver(() => {
      updateParentHeight();
    });
    parentObserverRef.current.observe(parent);
  }, []);

  const setContentRef = useCallback((node: HTMLDivElement | null) => {
    if (contentObserverRef.current) {
      contentObserverRef.current.disconnect();
      contentObserverRef.current = null;
    }

    if (!node) {
      setContentHeight(null);
      return;
    }

    const updateContentHeight = () => setContentHeight(node.scrollHeight);
    updateContentHeight();

    contentObserverRef.current = new ResizeObserver(() => {
      updateContentHeight();
    });
    contentObserverRef.current.observe(node);
  }, []);

  useEffect(() => {
    if (contentHeight == null) {
      setHeight((previousHeight) => {
        if (previousHeight === 'auto') {
          return previousHeight;
        }
        return 'auto';
      });
      return;
    }

    const limit = parentHeight ?? contentHeight;
    const nextHeight = Math.min(contentHeight, limit);

    setHeight((previousHeight) => {
      if (typeof previousHeight === 'number' && Math.abs(previousHeight - nextHeight) < 0.5) {
        return previousHeight;
      }
      return nextHeight;
    });
  }, [contentHeight, parentHeight]);

  useEffect(() => {
    return () => {
      if (contentObserverRef.current) {
        contentObserverRef.current.disconnect();
      }
      if (parentObserverRef.current) {
        parentObserverRef.current.disconnect();
      }
    };
  }, []);

  return (
    <motion.div
      ref={setMotionRef}
      style={{ height }}
      variants={variants}
      initial="collapsed"
      animate={show ? 'expanded' : 'collapsed'}
      transition={{
        type: "spring",
        duration: 0.3,
        bounce: 0.2,
      }}
      className={cn("overflow-hidden", className)}
      {...props}
    >
      <div ref={setContentRef}>{children}</div>
    </motion.div>
  );
};
