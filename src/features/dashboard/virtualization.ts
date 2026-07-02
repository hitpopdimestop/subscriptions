export interface VirtualWindow<TItem> {
  items: TItem[];
  offsetTop: number;
  shouldVirtualize: boolean;
  startIndex: number;
  totalHeight: number;
}

export function createVirtualWindow<TItem>(
  items: TItem[],
  threshold: number,
  slotHeight: number,
  overscan: number,
  scrollTop: number,
  viewportHeight: number,
): VirtualWindow<TItem> {
  if (items.length <= threshold) {
    return {
      items,
      offsetTop: 0,
      shouldVirtualize: false,
      startIndex: 0,
      totalHeight: 0,
    };
  }

  const safeViewportHeight = viewportHeight > 0 ? viewportHeight : slotHeight * 8;
  const startIndex = Math.max(0, Math.floor(scrollTop / slotHeight) - overscan);
  const visibleCount = Math.ceil(safeViewportHeight / slotHeight) + overscan * 2;
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  return {
    items: items.slice(startIndex, endIndex),
    offsetTop: startIndex * slotHeight,
    shouldVirtualize: true,
    startIndex,
    totalHeight: items.length * slotHeight,
  };
}
