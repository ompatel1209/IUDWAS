/**
 * ============================================================================
 * SERVICE: Live Event Hub (live-events.service.ts)
 * ============================================================================
 *
 * ROLE & PURPOSE:
 * A tiny in-process pub/sub hub that lets every controller announce
 * "something changed" (a document was uploaded, a workflow step was approved,
 * a notification arrived) and the SSE endpoint fan those signals out to all
 * connected browser sessions so pages refresh themselves in real time.
 *
 * DESIGN NOTE — SECURITY:
 * Event payloads carry ONLY coarse keys (resource type, entity id, actor id).
 * They intentionally contain NO confidential data: receiving clients simply
 * refetch their own permission-filtered API endpoints, so a student's stream
 * never reveals another user's private documents.
 */

import { EventEmitter } from 'events';

export interface LiveEvent {
  type:
    | 'document:changed'
    | 'workflow:changed'
    | 'notification:changed'
    | 'user:changed'
    | 'system:changed';
  resource: string;
  id?: string;
  actor_user_id?: string;
  target_user_id?: string;
  occurred_at: string;
}

class LiveEventHub extends EventEmitter {}
const hub = new LiveEventHub();
hub.setMaxListeners(0); // every open browser tab is one listener

/** Broadcast a "something changed" signal to every connected client. */
export function publishLiveEvent(
  type: LiveEvent['type'],
  payload: Omit<LiveEvent, 'type' | 'occurred_at'> = { resource: 'system' }
): void {
  const event: LiveEvent = {
    ...payload,
    type,
    occurred_at: new Date().toISOString(),
  };
  hub.emit('event', event);
}

/** Public doc: Live events stream controller registers here. */
export function subscribeToLiveEvents(listener: (event: LiveEvent) => void): () => void {
  hub.on('event', listener);
  return () => {
    hub.off('event', listener);
  };
}
