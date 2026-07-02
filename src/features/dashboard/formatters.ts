import type { Subscription } from "../../shared/subscriptions/types";
import type { StreamStatus } from "./state";

export function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

export function formatTimestamp(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  }).format(date);
}

export function formatRemainingPause(pauseUntil: string, nowMs: number) {
  const remainingMs = Math.max(0, Date.parse(pauseUntil) - nowMs);
  return `${(remainingMs / 1000).toFixed(1)}s left`;
}

export function getStreamLabel(status: StreamStatus) {
  switch (status) {
    case "connecting":
      return "Reconnecting";
    case "live":
      return "Live";
    case "offline":
      return "Offline";
    case "reload-required":
      return "Reload required";
    default:
      return status;
  }
}

export function statusTone(status: Subscription["status"]) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-900";
    case "paused":
      return "bg-amber-100 text-amber-900";
    case "canceled":
      return "bg-rose-100 text-rose-900";
    default:
      return "bg-slate-100 text-slate-900";
  }
}

export function streamTone(status: StreamStatus) {
  switch (status) {
    case "live":
      return "bg-emerald-100 text-emerald-900";
    case "offline":
      return "bg-slate-200 text-slate-900";
    case "reload-required":
      return "bg-rose-100 text-rose-900";
    case "connecting":
    default:
      return "bg-amber-100 text-amber-900";
  }
}
