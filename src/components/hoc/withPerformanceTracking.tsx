import type { ComponentType } from 'react';
import { useEffect, useRef } from 'react';
import { performanceMonitor } from '@/services/performanceMonitoring';

export function withPerformanceTracking<P extends object>(
  WrappedComponent: ComponentType<P>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: P) {
    const renderStartTime = useRef<number>();

    useEffect(() => {
      const renderTime = performance.now() - (renderStartTime.current || 0);
      performanceMonitor.trackRender(componentName, renderTime);
    });

    renderStartTime.current = performance.now();
    
    return <WrappedComponent {...props} />;
  };
}