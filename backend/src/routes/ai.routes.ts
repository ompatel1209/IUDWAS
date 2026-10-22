import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  aiOcrSchema,
  aiClassifySchema,
  aiSummarizeSchema,
  aiSearchQuerySchema,
  aiChatbotSchema,
  aiExtractFieldsSchema,
} from '../schemas';
import {
  authenticatedIpLimiter,
  aiLimiter,
} from '../middleware/rate-limit.middleware';

const router = Router();

// All AI routes require authentication.
// Each endpoint also gets the AI hourly cap stacked on top.
router.use(authenticate);

router.post('/ocr',            authenticatedIpLimiter, aiLimiter, validate({ body: aiOcrSchema }), AIController.ocrExtract);
router.post('/classify',       authenticatedIpLimiter, aiLimiter, validate({ body: aiClassifySchema }), AIController.classifyDocument);
router.post('/summarize',      authenticatedIpLimiter, aiLimiter, validate({ body: aiSummarizeSchema }), AIController.summarizeDocument);
router.get('/search',          authenticatedIpLimiter, aiLimiter, validate({ query: aiSearchQuerySchema }), AIController.semanticSearch);
router.post('/chatbot',        authenticatedIpLimiter, aiLimiter, validate({ body: aiChatbotSchema }), AIController.chatAssistant);
router.post('/extract-fields', authenticatedIpLimiter, aiLimiter, validate({ body: aiExtractFieldsSchema }), AIController.extractFields);

export default router;
