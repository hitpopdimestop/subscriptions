import {
  MAX_BILLING_INTERVAL_MS,
  MIN_BILLING_INTERVAL_MS,
} from "./constants";

export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export function isBillingIntervalInRange(value: number): boolean {
  return (
    isPositiveInteger(value) &&
    value >= MIN_BILLING_INTERVAL_MS &&
    value <= MAX_BILLING_INTERVAL_MS
  );
}

export function normalizeCurrency(value: string): string {
  return value.trim().toUpperCase();
}

export function resolveValidPauseSeconds(
  value: number | null | undefined,
): number | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }

  return isPositiveInteger(value) ? value : undefined;
}
