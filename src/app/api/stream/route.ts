import { DEFAULT_SSE_KEEPALIVE_MS } from "../../../server/subscriptions/constants";
import { toErrorResponse } from "../../../server/subscriptions/http";
import { getStoreSingleton } from "../../../server/subscriptions/runtime";
import { formatSseComment, formatSseEvent } from "../../../server/subscriptions/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const runtimeStore = getStoreSingleton();
    const url = new URL(request.url);
    const lastEventId = request.headers.get("Last-Event-ID");
    const sinceEventId = url.searchParams.get("sinceEventId");
    const replay = runtimeStore.core.resolveReplaySince(lastEventId ?? sinceEventId);
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let closed = false;
        let keepaliveId: ReturnType<typeof setInterval> | null = null;

        const close = () => {
          if (closed) {
            return;
          }

          closed = true;
          unsubscribe();
          if (keepaliveId !== null) {
            clearInterval(keepaliveId);
          }
          request.signal.removeEventListener("abort", close);
          controller.close();
        };

        const push = (chunk: string) => {
          if (closed) {
            return;
          }

          controller.enqueue(encoder.encode(chunk));
        };

        for (const event of replay.events) {
          push(formatSseEvent(event));
        }

        push(formatSseComment("connected"));

        const unsubscribe = runtimeStore.subscribe((event) => {
          try {
            push(formatSseEvent(event));
          } catch {
            close();
          }
        });

        keepaliveId = setInterval(() => {
          push(formatSseComment("keepalive"));
        }, DEFAULT_SSE_KEEPALIVE_MS);
        keepaliveId.unref?.();

        request.signal.addEventListener("abort", close);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
