import { memo, useCallback } from 'react';
import type { ComponentType } from 'react';
import { performanceMonitor } from '@/utils/performanceMonitoring';
import { usePerformanceTracking } from '@/utils/performanceMonitoring';

interface MemoizeOptions {
  name: string;
  debugRenders?: boolean;
}

// Helper to determine if props are equal
function arePropsEqual(prevProps: any, nextProps: any): boolean {
  const allKeys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)]);
  
  for (const key of allKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  
  return true;
}

// Higher-order component for optimizing heavy components
export function withOptimizations<P extends object>(
  Component: ComponentType<P>,
  options: MemoizeOptions
) {
  const OptimizedComponent = memo((props: P) => {
    const { trackInteraction } = usePerformanceTracking(options.name);

    // Wrap event handlers to track performance
    const enhancedProps = Object.entries(props).reduce((acc, [key, value]) => {
      if (typeof value === 'function' && key.startsWith('on')) {
        acc[key] = useCallback((...args: any[]) => {
          const endTracking = trackInteraction(key);
          try {
            return value(...args);
          } finally {
            endTracking();
          }
        }, [value]);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    if (options.debugRenders) {
      console.log(`Rendering ${options.name}`, {
        props: Object.keys(props),
        timestamp: new Date().toISOString()
      });
    }

    return <Component {...enhancedProps} />;
  }, (prevProps, nextProps) => {
    const start = performance.now();
    const result = arePropsEqual(prevProps, nextProps);
    const duration = performance.now() - start;

    // Log comparison performance
    performanceMonitor.logMetric({
      component: options.name,
      event: 'props-comparison',
      duration,
      timestamp: Date.now(),
      metadata: {
        changed: !result,
        propCount: Object.keys(prevProps).length
      }
    });

    return result;
  });

  // Set display name for better debugging
  OptimizedComponent.displayName = `Optimized(${options.name})`;
  
  return OptimizedComponent;
}

// Example usage:
// const OptimizedDataGrid = withOptimizations(DataGrid, { 
//   name: 'DataGrid',
//   debugRenders: process.env.NODE_ENV === 'development' 
// });