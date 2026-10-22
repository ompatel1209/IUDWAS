import request from 'supertest';
import { createApp } from '../app';
import { sanitizeClientErrorMessage } from '../utils/response';
import { seedDatabase } from '../db/seed';

const app = createApp();

let adminToken: string;

beforeAll(async () => {
  seedDatabase();

  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@iudwas.edu', password: 'Password@123' });
  adminToken = adminLogin.body.data.accessToken;
});

describe('Error Handling & Information Leakage Prevention Tests', () => {
  describe('Sanitization Helper Unit Tests', () => {
    it('should sanitize raw SQLite unique constraint errors', () => {
      const raw = 'SqliteError: UNIQUE constraint failed: users.email';
      const sanitized = sanitizeClientErrorMessage(raw, 500);

      expect(sanitized).not.toContain('SqliteError');
      expect(sanitized).not.toContain('users.email');
      expect(sanitized).toBe('A record with this information already exists.');
    });

    it('should sanitize raw SQLite foreign key errors', () => {
      const raw = 'SqliteError: FOREIGN KEY constraint failed on documents.category_id';
      const sanitized = sanitizeClientErrorMessage(raw, 500);

      expect(sanitized).not.toContain('SqliteError');
      expect(sanitized).not.toContain('documents.category_id');
      expect(sanitized).toBe('The referenced record or associated entity was not found.');
    });

    it('should sanitize internal server file paths', () => {
      const raw = "ENOENT: no such file or directory, open '/Users/admin/projects/cld/uploads/secret-file.pdf'";
      const sanitized = sanitizeClientErrorMessage(raw, 500);

      expect(sanitized).not.toContain('/Users/admin');
      expect(sanitized).not.toContain('secret-file.pdf');
      expect(sanitized).not.toContain('ENOENT');
      expect(sanitized).toBe('The requested file or document could not be found on the server.');
    });

    it('should sanitize raw V8 JavaScript stack traces', () => {
      const raw = 'TypeError: Cannot read properties of undefined (reading "name")\n    at UserController.getUser (/app/src/controllers/users.controller.ts:45:12)';
      const sanitized = sanitizeClientErrorMessage(raw, 500);

      expect(sanitized).not.toContain('TypeError');
      expect(sanitized).not.toContain('users.controller.ts');
      expect(sanitized).not.toContain('at UserController');
      expect(sanitized).toBe('An unexpected server error occurred. Please try again later.');
    });
  });

  describe('Integration Error Response Tests', () => {
    it('should return clean 409 conflict when duplicate email is registered without leaking DB internals', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'admin@iudwas.edu', // Existing email
          password: 'Password@123',
          full_name: 'Duplicate Admin',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).not.toContain('SqliteError');
      expect(res.body.error.message).not.toContain('UNIQUE constraint');
      expect(res.body.error.message).toBe('A user with this email address already exists');
    });

    it('should handle malformed JSON payloads gracefully without stack traces', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "admin@iudwas.edu", "password": '); // Incomplete JSON

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MALFORMED_JSON');
      expect(res.body.error.message).not.toContain('SyntaxError');
      expect(res.body.error.message).not.toContain('node_modules');
      expect(res.body.error.message).toBe('Malformed JSON payload received in request body.');
    });

    it('should return clean 404 response on unknown routes without leaking route internals', async () => {
      const res = await request(app)
        .get('/api/v1/non-existent-secret-internal-endpoint');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ENDPOINT_NOT_FOUND');
      expect(res.body.error.message).toBe('Cannot GET /api/v1/non-existent-secret-internal-endpoint');
    });
  });
});
