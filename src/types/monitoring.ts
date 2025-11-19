export interface Metric {
  timestamp: number;
  value: number;
  [key: string]: any;
}

export interface PerformanceReport {
  avg: number;
  min: number;
  max: number;
  p95: number;
  count: number;
}