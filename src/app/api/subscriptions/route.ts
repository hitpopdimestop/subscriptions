import { getStoreSingleton } from "../../../server/subscriptions/runtime";
import {
  jsonResponse,
  parseJsonBody,
  toErrorResponse,
} from "../../../server/subscriptions/http";
import type { CreateSubscriptionInput } from "../../../shared/subscriptions/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = await parseJsonBody<CreateSubscriptionInput>(request);
    const result = getStoreSingleton().createSubscription(input);
    return jsonResponse({ subscription: result.value }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
