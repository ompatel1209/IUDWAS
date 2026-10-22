/**
 * ============================================================================
 * ROUTE: Live event stream (live.routes.ts)
 * ============================================================================
 *
 * Mount: `/api/v1/system/events` (see routes/index.ts). Auth is handled
 * inside the controller because EventSource sends its token as a query
 * parameter, not as an Authorization header.
 */

import { Router } from 'express';
import { LiveEventsController } from '../controllers/live.controller';

const router = Router();

router.get('/events', LiveEventsController.streamEvents);

export default router;
