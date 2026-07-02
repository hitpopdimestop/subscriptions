import type { Subscription } from "../../shared/subscriptions/types";

export type StoreErrorCode =
  | "SUBSCRIPTION_NOT_FOUND"
  | "SUBSCRIPTION_ALREADY_PAUSED"
  | "SUBSCRIPTION_NOT_PAUSED"
  | "SUBSCRIPTION_ALREADY_CANCELED"
  | "INVALID_PLAN_NAME"
  | "INVALID_AMOUNT_CENTS"
  | "INVALID_CURRENCY"
  | "INVALID_BILLING_INTERVAL_MS"
  | "INVALID_PAUSE_SECONDS"
  | "INVALID_CURSOR"
  | "REPLAY_EXPIRED"
  | "INVALID_EVENT_ID";

const ERROR_STATUS: Record<StoreErrorCode, number> = {
  SUBSCRIPTION_NOT_FOUND: 404,
  SUBSCRIPTION_ALREADY_PAUSED: 409,
  SUBSCRIPTION_NOT_PAUSED: 409,
  SUBSCRIPTION_ALREADY_CANCELED: 409,
  INVALID_PLAN_NAME: 400,
  INVALID_AMOUNT_CENTS: 400,
  INVALID_CURRENCY: 400,
  INVALID_BILLING_INTERVAL_MS: 400,
  INVALID_PAUSE_SECONDS: 400,
  INVALID_CURSOR: 400,
  REPLAY_EXPIRED: 409,
  INVALID_EVENT_ID: 409,
};

export class StoreError extends Error {
  readonly code: StoreErrorCode;
  readonly status: number;
  readonly subscription?: Subscription;

  constructor(code: StoreErrorCode, message: string, subscription?: Subscription) {
    super(message);
    this.name = "StoreError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.subscription = subscription;
  }
}

export function isStoreError(error: unknown): error is StoreError {
  return error instanceof StoreError;
}
