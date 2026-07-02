"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";
import { createVirtualWindow } from "../virtualization";

interface VirtualizedListProps<TItem> {
  className: string;
  contentClassName?: string;
  dataTestId?: string;
  getKey: (item: TItem) => string;
  items: TItem[];
  nearEndThresholdPx?: number;
  onNearEnd?: () => void;
  overscan: number;
  renderItem: (item: TItem) => ReactNode;
  slotClassName?: string;
  slotHeight: number;
  threshold: number;
}

export function VirtualizedList<TItem>({
  className,
  contentClassName,
  dataTestId,
  getKey,
  items,
  nearEndThresholdPx = 0,
  onNearEnd,
  overscan,
  renderItem,
  slotClassName,
  slotHeight,
  threshold,
}: VirtualizedListProps<TItem>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const syncMetrics = () => {
      setViewportHeight(root.clientHeight);
      setScrollTop(root.scrollTop);
    };

    syncMetrics();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncMetrics);
      return () => {
        window.removeEventListener("resize", syncMetrics);
      };
    }

    const observer = new ResizeObserver(() => {
      syncMetrics();
    });

    observer.observe(root);
    window.addEventListener("resize", syncMetrics);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncMetrics);
    };
  }, []);

  const windowedItems = useMemo(
    () =>
      createVirtualWindow(
        items,
        threshold,
        slotHeight,
        overscan,
        scrollTop,
        viewportHeight,
      ),
    [items, overscan, scrollTop, slotHeight, threshold, viewportHeight],
  );

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const nextScrollTop = event.currentTarget.scrollTop;
      const nextViewportHeight = event.currentTarget.clientHeight;

      setScrollTop(nextScrollTop);
      setViewportHeight(nextViewportHeight);

      if (
        onNearEnd &&
        event.currentTarget.scrollHeight - nextScrollTop - nextViewportHeight <
          nearEndThresholdPx
      ) {
        onNearEnd();
      }
    },
    [nearEndThresholdPx, onNearEnd],
  );

  const renderSlot = (item: TItem, key: string) => (
    <div key={key} style={{ height: `${slotHeight}px` }} className={slotClassName}>
      {renderItem(item)}
    </div>
  );

  return (
    <div
      ref={rootRef}
      data-testid={dataTestId}
      onScroll={handleScroll}
      className={className}
    >
      {windowedItems.shouldVirtualize ? (
        <div className="relative" style={{ height: `${windowedItems.totalHeight}px` }}>
          <div
            className={`absolute inset-x-0 top-0 ${contentClassName ?? ""}`.trim()}
            style={{ transform: `translateY(${windowedItems.offsetTop}px)` }}
          >
            {windowedItems.items.map((item, index) =>
              renderSlot(item, getKey(item) ?? `${windowedItems.startIndex + index}`),
            )}
          </div>
        </div>
      ) : (
        <div className={contentClassName}>
          {items.map((item) => renderSlot(item, getKey(item)))}
        </div>
      )}
    </div>
  );
}
