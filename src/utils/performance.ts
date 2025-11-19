// Performance optimization utilities

// Debounce function to limit API calls
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle function to limit execution frequency
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Memoization cache for expensive calculations
const memoCache = new Map();

export const memoize = <T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T => {
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (memoCache.has(key)) {
      return memoCache.get(key);
    }
    
    const result = func(...args);
    memoCache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (memoCache.size > 100) {
      const firstKey = memoCache.keys().next().value;
      memoCache.delete(firstKey);
    }
    
    return result;
  }) as T;
};

// Clear performance cache
export const clearPerformanceCache = () => {
  memoCache.clear();
};

// Performance monitoring utilities
export const measurePerformance = (name: string, fn: () => void | Promise<void>) => {
  const start = performance.now();
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const end = performance.now();
      console.log(`Performance: ${name} took ${end - start} milliseconds`);
    });
  } else {
    const end = performance.now();
    console.log(`Performance: ${name} took ${end - start} milliseconds`);
    return result;
  }
};

// Lazy image loading utility
export const lazyLoadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Component preloader for better UX
export const preloadComponent = (importFn: () => Promise<any>) => {
  // Preload on mouseover/hover
  return () => {
    importFn().catch(() => {
      // Silently handle preload errors
    });
  };
};