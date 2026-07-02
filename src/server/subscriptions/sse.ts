import type { StoredDomainEvent } from "../../shared/subscriptions/types";

export function formatSseEvent(event: StoredDomainEvent): string {
  return `id: ${event.idString}\nevent: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
}

export function formatSseComment(comment: string): string {
  return `: ${comment}\n\n`;
}
