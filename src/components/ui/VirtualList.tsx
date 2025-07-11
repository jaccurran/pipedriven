'use client'

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => ReactNode
  className?: string
  overscan?: number
  onScroll?: (scrollTop: number) => void
  onEndReached?: () => void
  endReachedThreshold?: number
}

function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll,
  onEndReached,
  endReachedThreshold = 100,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  // Calculate total height and offset
  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight

  // Visible items
  const visibleItems = items.slice(startIndex, endIndex + 1)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)

    // Check if we've reached the end
    if (onEndReached && newScrollTop + containerHeight >= totalHeight - endReachedThreshold) {
      onEndReached()
    }
  }, [onScroll, onEndReached, containerHeight, totalHeight, endReachedThreshold])

  // Scroll to specific item
  const scrollToItem = useCallback((index: number) => {
    if (containerRef.current) {
      const targetScrollTop = index * itemHeight
      containerRef.current.scrollTop = targetScrollTop
    }
  }, [itemHeight])

  // Scroll to top
  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }, [])

  // Get item index at scroll position
  const getItemIndexAtPosition = useCallback((scrollTop: number) => {
    return Math.floor(scrollTop / itemHeight)
  }, [itemHeight])

  return (
    <div
      ref={containerRef}
      className={cn(
        'overflow-auto',
        className
      )}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      role="listbox"
      aria-label="Virtual list"
      data-testid="virtual-list-container"
      tabIndex={0}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
        data-testid="virtual-list-content"
      >
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0,
          }}
          data-testid="virtual-list-items-wrapper"
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index
            return (
              <div
                key={actualIndex}
                style={{
                  height: itemHeight,
                }}
                role="option"
              >
                {renderItem(item, actualIndex)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Export with proper typing
export { VirtualList }

// Export types for external use
export type { VirtualListProps } 