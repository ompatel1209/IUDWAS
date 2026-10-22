import { Router } from 'express';
import { DocumentsController } from '../controllers/documents.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload, validateUploadedFileMiddleware } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  idParamSchema,
  listDocumentsQuerySchema,
  updateDocumentMetadataSchema,
  shareDocumentSchema,
  documentVersionDownloadParamSchema,
  uploadVersionBodySchema,
} from '../schemas';
import {
  authenticatedIpLimiter,
  authenticatedUserLimiter,
  uploadLimiter,
} from '../middleware/rate-limit.middleware';

const router = Router();

// All document routes require authentication
router.use(authenticate);

// ── Standard CRUD (authenticated tier) ───────────────────────────────────────
router.get('/',                   authenticatedIpLimiter, authenticatedUserLimiter, validate({ query: listDocumentsQuerySchema }), DocumentsController.listDocuments);
router.get('/:id',                authenticatedIpLimiter, authenticatedUserLimiter, validate({ params: idParamSchema }), DocumentsController.getDocumentById);
router.get('/:id/versions',       authenticatedIpLimiter, authenticatedUserLimiter, validate({ params: idParamSchema }), DocumentsController.getDocumentVersions);
router.get('/:id/download',       authenticatedIpLimiter, authenticatedUserLimiter, validate({ params: idParamSchema }), DocumentsController.downloadDocument);
router.get('/:id/versions/:versionNumber/download', authenticatedIpLimiter, authenticatedUserLimiter, validate({ params: documentVersionDownloadParamSchema }), DocumentsController.downloadDocumentVersion);
router.put('/:id',                authenticatedIpLimiter, authenticatedUserLimiter, validate({ params: idParamSchema, body: updateDocumentMetadataSchema }), DocumentsController.updateDocumentMetadata);
router.post('/:id/share',         authenticatedIpLimiter, authenticatedUserLimiter, validate({ params: idParamSchema, body: shareDocumentSchema }), DocumentsController.shareDocument);
router.delete('/:id',             authenticatedIpLimiter, authenticatedUserLimiter, validate({ params: idParamSchema }), DocumentsController.deleteDocument);

// ── Upload routes — stricter upload-tier limiter + binary magic byte inspection ───────────────
router.post('/upload',      authenticatedIpLimiter, uploadLimiter, upload.single('file'), validateUploadedFileMiddleware, DocumentsController.uploadDocument);
router.post('/:id/version', authenticatedIpLimiter, uploadLimiter, validate({ params: idParamSchema }), upload.single('file'), validateUploadedFileMiddleware, validate({ body: uploadVersionBodySchema }), DocumentsController.uploadNewVersion);

export default router;
