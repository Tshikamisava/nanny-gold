import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  overscan?: number;
  className?: string;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export function VirtualList<T>({
  items,
  renderItem,
  estimateSize = 50,
  overscan = 5,
  className,
  onEndReached,
  endReachedThreshold = 0.8
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [shouldLoadMore, setShouldLoadMore] = useState(false);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const checkEndReached = useCallback(() => {
    if (!parentRef.current || !onEndReached) return;

    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage > endReachedThreshold && !shouldLoadMore) {
      setShouldLoadMore(true);
      onEndReached();
    } else if (scrollPercentage < endReachedThreshold) {
      setShouldLoadMore(false);
    }
  }, [endReachedThreshold, onEndReached, shouldLoadMore]);

  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    scrollElement.addEventListener('scroll', checkEndReached);
    return () => scrollElement.removeEventListener('scroll', checkEndReached);
  }, [checkEndReached]);

  return (
    <div
      ref={parentRef}
      className={cn(
        "relative overflow-auto",
        className
      )}
      style={{
        height: '100%',
        width: '100%',
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}