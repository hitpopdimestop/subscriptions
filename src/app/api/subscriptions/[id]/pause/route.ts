import { getStoreSingleton } from "../../../../../server/subscriptions/runtime";
import {
  jsonResponse,
  parseJsonBody,
  toErrorResponse,
} from "../../../../../server/subscriptions/http";
import type { PauseSubscriptionInput } from "../../../../../shared/subscriptions/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const input = await parseJsonBody<PauseSubscriptionInput>(request);
    const { id } = await context.params;
    const result = getStoreSingleton().pauseSubscription(id, input);
    return jsonResponse({ subscription: result.value });
  } catch (error) {
    return toErrorResponse(error);
  }
}
