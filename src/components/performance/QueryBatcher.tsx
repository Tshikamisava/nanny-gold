import { useEffect, useRef } from 'react';

// Query batching utility to prevent duplicate requests
class QueryBatcher {
  private pendingQueries = new Map<string, Promise<any>>();
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  async batchQuery<T>(
    key: string, 
    queryFn: () => Promise<T>, 
    ttl: number = 5 * 60 * 1000 // 5 minutes default TTL
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // Check if query is already pending
    if (this.pendingQueries.has(key)) {
      return this.pendingQueries.get(key);
    }

    // Execute query and cache result
    const promise = queryFn().then(result => {
      this.cache.set(key, { 
        data: result, 
        timestamp: Date.now(), 
        ttl 
      });
      this.pendingQueries.delete(key);
      return result;
    }).catch(error => {
      this.pendingQueries.delete(key);
      throw error;
    });

    this.pendingQueries.set(key, promise);
    return promise;
  }

  clearCache(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Cleanup expired cache entries
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Global query batcher instance
export const queryBatcher = new QueryBatcher();

// Hook to use query batcher with automatic cleanup
export function useQueryBatcher() {
  const cleanupRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Setup periodic cleanup
    cleanupRef.current = setInterval(() => {
      queryBatcher.cleanup();
    }, 60 * 1000); // Cleanup every minute

    return () => {
      if (cleanupRef.current) {
        clearInterval(cleanupRef.current);
      }
    };
  }, []);

  return queryBatcher;
}