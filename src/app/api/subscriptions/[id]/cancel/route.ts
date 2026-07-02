import { getStoreSingleton } from "../../../../../server/subscriptions/runtime";
import {
  jsonResponse,
  toErrorResponse,
} from "../../../../../server/subscriptions/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const result = getStoreSingleton().cancelSubscription(id);
    return jsonResponse({ subscription: result.value });
  } catch (error) {
    return toErrorResponse(error);
  }
}
