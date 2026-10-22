/**
 * ============================================================================
 * CONTROLLER: Server-Sent Events live stream (live.controller.ts)
 * ============================================================================
 *
 * ROLE & PURPOSE:
 * Produces the `GET /api/v1/system/events` SSE stream each logged-in session
 * opens. Controllers elsewhere call publishLiveEvent(...) and every browser
 * tab attached here receives the change signal instantly, letting pages
 * refetch themselves without a manual reload (the "everything updates live"
 * experience).
 *
 * DESIGN DECISIONS:
 * - Authentication uses `?token=<access token>` because the browser's
 *   EventSource cannot attach Authorization headers.
 * - The stream signals CHANGES only — payloads hold no confidential data.
 * - Heartbeat comment every 25 s keeps proxies (Vite/nginx) from idling the
 *   connection out, and `X-Accel-Buffering: no` stops nginx-style buffering.
 * - Client cap protects the lightweight SQLite deployment from stream floods.
 */

import { Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { getDatabase } from '../db/database';
import { subscribeToLiveEvents, LiveEvent } from '../services/live-events.service';
import { sendError } from '../utils/response';

const MAX_CONCURRENT_CLIENTS = 200;
const HEARTBEAT_INTERVAL_MS = 25_000;
let activeClients = 0;

export class LiveEventsController {
  static async streamEvents(req: Request, res: Response): Promise<void> {
    if (activeClients >= MAX_CONCURRENT_CLIENTS) {
      sendError(res, 'STREAM_BUSY', 'Too many live connections; retry shortly.', 503);
      return;
    }

    // EventSource cannot send headers — accept the token from the query string
    const token = String(req.query.token || '');
    let userId: string;
    try {
      const decoded = verifyAccessToken(token);
      userId = decoded.userId;
    } catch {
      sendError(res, 'TOKEN_EXPIRED', 'Live stream requires a valid access token.', 401);
      return;
    }

    const db = getDatabase();
    const user = db.prepare('SELECT user_id, is_active FROM users WHERE user_id = ?').get(userId) as
      | { user_id: string; is_active: number }
      | undefined;

    if (!user || user.is_active === 0) {
      sendError(res, 'ACCOUNT_DEACTIVATED', 'This account cannot open the live stream.', 403);
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    activeClients += 1;
    res.write(`event: hello\ndata: {"message":"Live","user_id":"${userId}"}\n\n`);

    const send = (event: LiveEvent) => {
      try {
        res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      } catch {
        // the close handler cleans the subscription up
      }
    };
    const unsubscribe = subscribeToLiveEvents(send);

    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        // handled below on close
      }
    }, HEARTBEAT_INTERVAL_MS);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      activeClients = Math.max(0, activeClients - 1);
    });

    // Never resolve further handling — the stream owns the socket
    await new Promise<void>(() => undefined);
  }
}
