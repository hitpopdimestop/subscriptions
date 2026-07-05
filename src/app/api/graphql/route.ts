import { executeSubscriptionsGraphQL } from "../../../server/subscriptions/graphql";
import { isStoreError } from "../../../server/subscriptions/errors";
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

    if (result.errors?.length) {
      const originalError = result.errors[0]?.originalError;

      if (isStoreError(originalError) || originalError instanceof HttpError) {
        return toErrorResponse(originalError);
      }

      throw new HttpError(
        "INVALID_GRAPHQL_QUERY",
        400,
        result.errors.map((error) => error.message).join(", "),
      );
    }

    return jsonResponse(result, 200);
  } catch (error) {
    return toErrorResponse(error);
  }
}
