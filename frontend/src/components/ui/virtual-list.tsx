"use client"

import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[]
  /** Height of each item in pixels */
  itemHeight: number
  /** Number of items to render outside the visible area above and below */
  overscan?: number
  /** Additional class name for the ScrollArea */
  className?: string
  /** Class name for the inner viewport container */
  viewportClassName?: string
  /** Class name for each item's container wrapper */
  itemClassName?: string
  /** Render function for each item */
  children: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
}

export function VirtualList<T>({
  items,
  itemHeight,
  overscan = 5,
  className,
  viewportClassName,
  itemClassName,
  children,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0)
  const [containerHeight, setContainerHeight] = React.useState(0)
  const viewportRef = React.useRef<HTMLDivElement>(null)

  // Listen to container resizing to dynamically update viewport height
  React.useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    // Initialize height
    setContainerHeight(viewport.clientHeight)

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.target.clientHeight)
      }
    })

    observer.observe(viewport)
    return () => {
      observer.disconnect()
    }
  }, [])

  // Handle scroll events
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // Calculate total height of the list
  const totalHeight = items.length * itemHeight

  // Calculate start and end indices of visible items plus overscan
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  )

  // Generate subset of items to render
  const visibleItems = React.useMemo(() => {
    const rendered: React.ReactNode[] = []
    for (let i = startIndex; i <= endIndex; i++) {
      const item = items[i]
      if (!item) continue

      const style: React.CSSProperties = {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: `${itemHeight}px`,
        transform: `translateY(${i * itemHeight}px)`,
      }

      rendered.push(
        <div key={i} style={style} className={cn("will-change-transform", itemClassName)}>
          {children(item, i, style)}
        </div>
      )
    }
    return rendered
  }, [items, itemHeight, startIndex, endIndex, children, itemClassName])

  return (
    <ScrollArea
      viewportRef={viewportRef}
      onScroll={handleScroll}
      className={cn("h-full w-full", className)}
    >
      <div
        className={cn("relative w-full overflow-hidden", viewportClassName)}
        style={{ height: `${totalHeight}px` }}
      >
        {visibleItems}
      </div>
    </ScrollArea>
  )
}
