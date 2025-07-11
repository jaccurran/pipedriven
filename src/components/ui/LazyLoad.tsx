'use client'

import React, { useEffect, useRef, useState } from 'react';

interface LazyLoadProps {
  children: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  placeholder?: React.ReactNode;
  loadingText?: string;
  className?: string;
  'data-testid'?: string;
}

const LazyLoad: React.FC<LazyLoadProps> = ({
  children,
  threshold = 0.1,
  rootMargin = '50px',
  placeholder,
  loadingText = 'Loading...',
  className = '',
  'data-testid': testId = 'lazy-load'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isIntersectionObserverSupported, setIsIntersectionObserverSupported] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Check if IntersectionObserver is supported
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      setIsIntersectionObserverSupported(false);
      setIsVisible(true); // Show content immediately if not supported
      return;
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (observerRef.current) {
            observerRef.current.disconnect();
          }
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (ref.current) {
      observerRef.current.observe(ref.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin]);

  // Handle null, undefined, or empty children
  const hasValidChildren = children !== null && children !== undefined && children !== '';

  // If IntersectionObserver is not supported, show content immediately
  if (!isIntersectionObserverSupported) {
    return (
      <div className={className} data-testid={testId}>
        {hasValidChildren ? children : null}
      </div>
    );
  }

  return (
    <div ref={ref} className={className} data-testid={testId}>
      {isVisible && hasValidChildren ? (
        children
      ) : (
        placeholder || (
          <div className="flex items-center justify-center p-4 text-gray-500" data-testid={`${testId}-placeholder`}>
            {loadingText}
          </div>
        )
      )}
    </div>
  );
};

export { LazyLoad }; 