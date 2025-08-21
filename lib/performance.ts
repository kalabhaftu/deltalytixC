// Performance monitoring and optimization utilities
'use client';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  totalTrades: number;
  memoryUsage?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.initObservers();
    }
  }

  private initObservers() {
    // Monitor long tasks that could block the main thread
    const longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 50) { // Tasks longer than 50ms
          console.warn(`Long task detected: ${entry.duration}ms`);
        }
      });
    });

    try {
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    } catch (e) {
      // Longtask observer not supported in all browsers
    }

    // Monitor layout shifts
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      list.getEntries().forEach((entry) => {
        // @ts-ignore - layout-shift is not in types yet
        if (!entry.hadRecentInput) {
          // @ts-ignore
          clsValue += entry.value;
        }
      });

      if (clsValue > 0.1) { // CLS threshold
        console.warn(`High Cumulative Layout Shift: ${clsValue}`);
      }
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (e) {
      // Layout shift observer not supported in all browsers
    }
  }

  // Measure component render time
  measureRender<T>(componentName: string, renderFn: () => T): T {
    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    
    console.log(`${componentName} render time: ${endTime - startTime}ms`);
    return result;
  }

  // Measure data processing time
  measureDataProcessing<T>(operationName: string, operation: () => T): T {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    
    console.log(`${operationName} processing time: ${endTime - startTime}ms`);
    return result;
  }

  // Track component metrics
  trackComponentMetrics(componentName: string, metrics: Partial<PerformanceMetrics>) {
    const existing = this.metrics.get(componentName) || {
      loadTime: 0,
      renderTime: 0,
      totalTrades: 0,
    };

    this.metrics.set(componentName, { ...existing, ...metrics });
  }

  // Get all metrics
  getMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  // Memory usage tracking
  getMemoryUsage(): number | undefined {
    // @ts-ignore - memory property might not exist
    return (performance as any).memory?.usedJSHeapSize;
  }

  // Check if performance is degraded
  isPerformanceDegraded(): boolean {
    const memory = this.getMemoryUsage();
    if (memory && memory > 100 * 1024 * 1024) { // 100MB threshold
      return true;
    }
    return false;
  }

  // Cleanup observers
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Debounce utility for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Throttle utility for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

// Virtual scrolling utility for large datasets
export function calculateVisibleItems(
  containerHeight: number,
  itemHeight: number,
  scrollTop: number,
  totalItems: number,
  overscan: number = 5
) {
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    totalItems - 1
  );

  return {
    start: Math.max(0, visibleStart - overscan),
    end: Math.min(totalItems - 1, visibleEnd + overscan),
    visibleStart,
    visibleEnd,
  };
}

// Memoization utility with size limit
export function createMemoCache<T extends (...args: any[]) => any>(
  fn: T,
  maxSize: number = 100
) {
  const cache = new Map<string, ReturnType<T>>();
  const keyOrder: string[] = [];

  return (...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    
    if (keyOrder.length >= maxSize) {
      const oldestKey = keyOrder.shift()!;
      cache.delete(oldestKey);
    }

    cache.set(key, result);
    keyOrder.push(key);

    return result;
  };
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const trackRender = (renderTime: number) => {
    performanceMonitor.trackComponentMetrics(componentName, { renderTime });
  };

  const trackLoad = (loadTime: number) => {
    performanceMonitor.trackComponentMetrics(componentName, { loadTime });
  };

  return { trackRender, trackLoad };
}
