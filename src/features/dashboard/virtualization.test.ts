import { describe, expect, it } from "vitest";
import { createVirtualWindow } from "./virtualization";

describe("createVirtualWindow", () => {
  it("returns the full list when virtualization is below the threshold", () => {
    const items = ["a", "b", "c"];
    const window = createVirtualWindow(items, 3, 100, 2, 0, 300);

    expect(window.shouldVirtualize).toBe(false);
    expect(window.startIndex).toBe(0);
    expect(window.offsetTop).toBe(0);
    expect(window.totalHeight).toBe(0);
    expect(window.items).toEqual(items);
  });

  it("returns a windowed slice with overscan for larger lists", () => {
    const items = Array.from({ length: 100 }, (_, index) => index);
    const window = createVirtualWindow(items, 10, 50, 2, 250, 200);

    expect(window.shouldVirtualize).toBe(true);
    expect(window.startIndex).toBe(3);
    expect(window.offsetTop).toBe(150);
    expect(window.totalHeight).toBe(5_000);
    expect(window.items).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("uses a fallback viewport height before the panel is measured", () => {
    const items = Array.from({ length: 50 }, (_, index) => index);
    const window = createVirtualWindow(items, 10, 40, 1, 0, 0);

    expect(window.shouldVirtualize).toBe(true);
    expect(window.items).toHaveLength(10);
  });
});
