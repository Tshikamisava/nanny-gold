import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import ErrorBoundary from './ErrorBoundary';
import type { ErrorInfo } from 'react';

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export function QueryErrorBoundary({ children, fallback, onError }: QueryErrorBoundaryProps) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      onError={onError}
      fallback={fallback}
      onReset={reset}
      name="query-boundary"
    >
      {children}
    </ErrorBoundary>
  );
}