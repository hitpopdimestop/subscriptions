import { isStoreError, type StoreError } from "./errors";
import type { Subscription } from "../../shared/subscriptions/types";

interface ErrorBody {
  error: {
    code: string;
    message: string;
    subscription?: Subscription;
  };
}

export class HttpError extends Error {
  readonly code: string;
  readonly status: number;
  readonly subscription?: Subscription;

  constructor(
    code: string,
    status: number,
    message: string,
    subscription?: Subscription,
  ) {
    super(message);
    this.name = "HttpError";
    this.code = code;
    this.status = status;
    this.subscription = subscription;
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function errorResponse(error: StoreError | HttpError): Response {
  const body: ErrorBody = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.subscription ? { subscription: error.subscription } : {}),
    },
  };

  return jsonResponse(body, error.status);
}

export function toErrorResponse(error: unknown): Response {
  if (isStoreError(error) || error instanceof HttpError) {
    return errorResponse(error);
  }

  throw error;
}

export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError("INVALID_JSON", 400, "Request body must be valid JSON.");
  }
}
