import { StoreError } from "./errors";
import type { SubscriptionFilterStatus } from "../../shared/subscriptions/types";

export interface SubscriptionCursor {
  status: SubscriptionFilterStatus | null;
  limit: number;
  lastCreatedAtMs: number;
  lastId: string;
}

export interface TransactionCursor {
  limit: number;
  lastCreatedAtMs: number;
  lastId: string;
}

function encodeCursor(value: object): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeCursor<T>(cursor: string): T {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    return JSON.parse(decoded) as T;
  } catch {
    throw new StoreError("INVALID_CURSOR", "Cursor is invalid.");
  }
}

export function encodeSubscriptionCursor(cursor: SubscriptionCursor): string {
  return encodeCursor(cursor);
}

export function decodeSubscriptionCursor(cursor: string): SubscriptionCursor {
  const value = decodeCursor<Partial<SubscriptionCursor>>(cursor);
  const status =
    value.status === "ACTIVE" || value.status === null || value.status === undefined
      ? value.status ?? null
      : undefined;
  const limit = value.limit;
  const lastCreatedAtMs = value.lastCreatedAtMs;
  const lastId = value.lastId;

  if (
    status === undefined ||
    !Number.isInteger(limit) ||
    typeof lastId !== "string" ||
    lastId.length === 0 ||
    !Number.isFinite(lastCreatedAtMs)
  ) {
    throw new StoreError("INVALID_CURSOR", "Cursor is invalid.");
  }

  return {
    status,
    limit: limit as number,
    lastCreatedAtMs: lastCreatedAtMs as number,
    lastId: lastId as string,
  };
}

export function encodeTransactionCursor(cursor: TransactionCursor): string {
  return encodeCursor(cursor);
}

export function decodeTransactionCursor(cursor: string): TransactionCursor {
  const value = decodeCursor<Partial<TransactionCursor>>(cursor);
  const limit = value.limit;
  const lastCreatedAtMs = value.lastCreatedAtMs;
  const lastId = value.lastId;

  if (
    !Number.isInteger(limit) ||
    typeof lastId !== "string" ||
    lastId.length === 0 ||
    !Number.isFinite(lastCreatedAtMs)
  ) {
    throw new StoreError("INVALID_CURSOR", "Cursor is invalid.");
  }

  return {
    limit: limit as number,
    lastCreatedAtMs: lastCreatedAtMs as number,
    lastId: lastId as string,
  };
}
