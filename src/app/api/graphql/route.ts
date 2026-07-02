import { executeSubscriptionsGraphQL } from "../../../server/subscriptions/graphql";
import {
  HttpError,
  jsonResponse,
  parseJsonBody,
  toErrorResponse,
} from "../../../server/subscriptions/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GraphQLRequestBody {
  query?: unknown;
  variables?: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<GraphQLRequestBody>(request);

    if (typeof body.query !== "string" || body.query.trim().length === 0) {
      throw new HttpError("INVALID_GRAPHQL_QUERY", 400, "GraphQL query must be provided.");
    }

    const result = await executeSubscriptionsGraphQL(body.query, body.variables);
    return jsonResponse(result, result.errors ? 400 : 200);
  } catch (error) {
    return toErrorResponse(error);
  }
}
