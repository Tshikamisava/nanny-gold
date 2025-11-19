import { useEffect, useRef } from 'react';

interface PerformanceMetric {
  component: string;
  event: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private thresholds: Record<string, number> = {
    render: 16.67, // 60fps threshold
    query: 1000,   // 1 second
    load: 3000,    // 3 seconds
    interaction: 100 // 100ms
  };

  private constructor() {
    // Initialize performance monitoring
    if (typeof window !== 'undefined') {
      this.observeInteractions();
    }
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private observeInteractions() {
    // Track long tasks
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > this.thresholds.render) {
          this.logMetric({
            component: 'global',
            event: 'long-task',
            duration: entry.duration,
            timestamp: performance.now(),
            metadata: {
              entryType: entry.entryType,
              startTime: entry.startTime
            }
          });
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  }

  logMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Check if duration exceeds threshold
    const threshold = this.thresholds[metric.event] || Infinity;
    if (metric.duration > threshold) {
      console.warn(`Performance threshold exceeded:`, {
        component: metric.component,
        event: metric.event,
        duration: metric.duration,
        threshold
      });
    }

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  getMetrics(filter?: Partial<PerformanceMetric>): PerformanceMetric[] {
    if (!filter) return this.metrics;

    return this.metrics.filter(metric => 
      Object.entries(filter).every(([key, value]) => 
        metric[key as keyof PerformanceMetric] === value
      )
    );
  }

  getAverageMetric(filter: Partial<PerformanceMetric>): number {
    const filteredMetrics = this.getMetrics(filter);
    if (filteredMetrics.length === 0) return 0;

    const sum = filteredMetrics.reduce((acc, metric) => acc + metric.duration, 0);
    return sum / filteredMetrics.length;
  }
}

// Hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();
  const renderStart = useRef(performance.now());

  useEffect(() => {
    const renderTime = performance.now() - renderStart.current;
    monitor.logMetric({
      component: componentName,
      event: 'render',
      duration: renderTime,
      timestamp: performance.now()
    });

    // Track cleanup time
    return () => {
      const cleanupStart = performance.now();
      requestAnimationFrame(() => {
        const cleanupTime = performance.now() - cleanupStart;
        monitor.logMetric({
          component: componentName,
          event: 'cleanup',
          duration: cleanupTime,
          timestamp: performance.now()
        });
      });
    };
  });

  const trackInteraction = (event: string, metadata?: Record<string, any>) => {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      monitor.logMetric({
        component: componentName,
        event,
        duration,
        timestamp: performance.now(),
        metadata
      });
    };
  };

  return { trackInteraction };
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();