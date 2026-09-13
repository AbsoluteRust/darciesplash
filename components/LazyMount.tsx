'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export default function LazyMount({
  children,
  rootMargin = '600px',
  placeholderHeight = 560,
  className = '',
}: {
  children: ReactNode;
  rootMargin?: string;
  placeholderHeight?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If IntersectionObserver isn't available (very old browsers), just show it
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin, threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        // Reserve space so scroll position doesn't jump when cards mount
        minHeight: visible ? undefined : placeholderHeight,
      }}
    >
      {visible ? children : null}
    </div>
  );
}