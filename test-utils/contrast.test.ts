import { describe, expect, it } from "vitest";
import { contrastRatio, relativeLuminance } from "./contrast";

describe("relativeLuminance", () => {
  it("rejects colors that are not sRGB rather than parsing digits out of them", () => {
    expect(() => relativeLuminance("oklch(50% 0.2 30)")).toThrow(
      "Expected an rgb color",
    );
    expect(() => relativeLuminance("lab(48.0876 -2.03595 -16.5814)")).toThrow(
      "Expected an rgb color",
    );
  });

  it("accepts rgb with and without an alpha channel", () => {
    expect(relativeLuminance("rgb(255, 255, 255)")).toBeCloseTo(1);
    expect(relativeLuminance("rgba(0, 0, 0, 0.5)")).toBeCloseTo(0);
  });
});

describe("contrastRatio", () => {
  it("returns the WCAG range endpoints", () => {
    expect(contrastRatio("rgb(0, 0, 0)", "rgb(255, 255, 255)")).toBeCloseTo(21);
    expect(contrastRatio("rgb(255, 255, 255)", "rgb(255, 255, 255)")).toBeCloseTo(1);
  });

  it("is symmetric in its arguments", () => {
    const forward = contrastRatio("rgb(100, 100, 100)", "rgb(255, 255, 255)");
    const reverse = contrastRatio("rgb(255, 255, 255)", "rgb(100, 100, 100)");

    expect(forward).toBeCloseTo(reverse);
  });
});
