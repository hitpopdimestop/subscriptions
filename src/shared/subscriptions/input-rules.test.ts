import { describe, expect, it } from "vitest";
import {
  isBillingIntervalInRange,
  isPositiveInteger,
  normalizeCurrency,
  resolveValidPauseSeconds,
} from "./input-rules";

describe("input rules", () => {
  it("accepts only positive integers", () => {
    expect(isPositiveInteger(1)).toBe(true);
    expect(isPositiveInteger(500)).toBe(true);
    expect(isPositiveInteger(0)).toBe(false);
    expect(isPositiveInteger(-1)).toBe(false);
    expect(isPositiveInteger(1.5)).toBe(false);
  });

  it("enforces the demo billing interval range", () => {
    expect(isBillingIntervalInRange(500)).toBe(true);
    expect(isBillingIntervalInRange(10_000)).toBe(true);
    expect(isBillingIntervalInRange(499)).toBe(false);
    expect(isBillingIntervalInRange(10_001)).toBe(false);
    expect(isBillingIntervalInRange(750.5)).toBe(false);
  });

  it("normalizes currency to a trimmed uppercase code", () => {
    expect(normalizeCurrency(" usd ")).toBe("USD");
  });

  it("accepts indefinite or positive integer pause seconds only", () => {
    expect(resolveValidPauseSeconds(undefined)).toBeNull();
    expect(resolveValidPauseSeconds(null)).toBeNull();
    expect(resolveValidPauseSeconds(5)).toBe(5);
    expect(resolveValidPauseSeconds(0)).toBeUndefined();
    expect(resolveValidPauseSeconds(1.5)).toBeUndefined();
  });
});
