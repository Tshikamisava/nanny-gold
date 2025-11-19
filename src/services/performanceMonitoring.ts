import type { Metric } from '@/types/monitoring';

class PerformanceMonitoring {
  private metrics: Map<string, Metric[]> = new Map();
  private static instance: PerformanceMonitoring;

  private constructor() {}

  static getInstance(): PerformanceMonitoring {
    if (!PerformanceMonitoring.instance) {
      PerformanceMonitoring.instance = new PerformanceMonitoring();
    }
    return PerformanceMonitoring.instance;
  }

  // Track component render time
  trackRender(componentName: string, renderTime: number) {
    this.addMetric('render', componentName, renderTime);
  }

  // Track query execution time
  trackQuery(queryName: string, executionTime: number, success: boolean) {
    this.addMetric('query', queryName, executionTime, { success });
  }

  // Track interaction metrics (clicks, inputs, etc.)
  trackInteraction(elementId: string, interactionTime: number) {
    this.addMetric('interaction', elementId, interactionTime);
  }

  // Track page load metrics
  trackPageLoad(pageName: string, loadTime: number) {
    this.addMetric('pageLoad', pageName, loadTime);
  }

  // Track errors
  trackError(componentName: string, errorMessage: string, errorInfo?: any) {
    this.addMetric('error', componentName, Date.now(), {
      message: errorMessage,
      info: errorInfo
    });
  }

  private addMetric(type: string, name: string, value: number, metadata: Record<string, any> = {}) {
    const key = `${type}:${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    this.metrics.get(key)?.push({
      timestamp: Date.now(),
      value,
      ...metadata
    });

    // Report to monitoring service if value exceeds threshold
    if (value > this.getThreshold(type)) {
      this.reportPerformanceIssue(type, name, value, metadata);
    }
  }

  private getThreshold(type: string): number {
    const thresholds: Record<string, number> = {
      render: 16.67, // 60fps threshold
      query: 1000, // 1 second
      interaction: 100, // 100ms
      pageLoad: 3000 // 3 seconds
    };
    return thresholds[type] || Infinity;
  }

  private reportPerformanceIssue(type: string, name: string, value: number, metadata: Record<string, any>) {
    console.warn(`Performance issue detected:
      Type: ${type}
      Name: ${name}
      Value: ${value}ms
      Metadata: ${JSON.stringify(metadata)}
    `);
    
    // TODO: Send to monitoring service (e.g., Sentry, LogRocket)
  }

  // Get performance report for a specific metric
  getMetricReport(type: string, name: string) {
    const key = `${type}:${name}`;
    const metrics = this.metrics.get(key) || [];
    
    if (metrics.length === 0) return null;

    const values = metrics.map(m => m.value);
    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      p95: this.calculatePercentile(values, 95),
      count: metrics.length
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

export const performanceMonitor = PerformanceMonitoring.getInstance();