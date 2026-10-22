import request from 'supertest';
import { createApp } from '../app';
import { seedDatabase } from '../db/seed';

const app = createApp();

let adminToken: string;
let studentToken: string;

beforeAll(async () => {
  seedDatabase();

  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@iudwas.edu', password: 'Password@123' });
  adminToken = adminLogin.body.data.accessToken;

  const studentLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'student.alex@iudwas.edu', password: 'Password@123' });
  studentToken = studentLogin.body.data.accessToken;
});

describe('Strict Input Schema Validation Tests', () => {
  describe('Authentication Input Validation', () => {
    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email-format',
          password: 'Password@123',
          full_name: 'Test Student',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.issues.some((i: any) => i.field === 'email')).toBe(true);
    });

    it('should reject registration with short password (< 6 chars)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'valid.student@iudwas.edu',
          password: '123',
          full_name: 'Test Student',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.issues.some((i: any) => i.field === 'password')).toBe(true);
    });

    it('should reject registration with invalid role enum value', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'valid.student@iudwas.edu',
          password: 'Password@123',
          full_name: 'Test Student',
          role: 'SYSTEM_OVERLORD',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.issues.some((i: any) => i.field === 'role')).toBe(true);
    });

    it('should reject registration with unexpected extra fields (strict schema)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'valid.student@iudwas.edu',
          password: 'Password@123',
          full_name: 'Test Student',
          malicious_field: 'inject_something',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.issues.some((i: any) => i.rule === 'unrecognized_keys')).toBe(true);
    });

    it('should reject login with empty password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@iudwas.edu',
          password: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Path & UUID Identifier Format Validation', () => {
    it('should reject invalid non-UUID path parameters on user endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/users/not-a-valid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.issues.some((i: any) => i.field === 'id')).toBe(true);
    });

    it('should reject invalid non-UUID path parameters on document endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/documents/12345/download')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject non-positive integer versionNumber parameter', async () => {
      const res = await request(app)
        .get('/api/v1/documents/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/versions/invalid_version/download')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Department & Category Schema Format Validation', () => {
    it('should reject department creation with invalid code format (symbols/spaces)', async () => {
      const res = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Computer Science Department',
          code: 'CS & ENG!!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.issues.some((i: any) => i.field === 'code')).toBe(true);
    });

    it('should reject category creation with invalid hex color code', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Custom Category',
          code: 'CUSTOM_CAT',
          color: 'blue-is-not-hex',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.issues.some((i: any) => i.field === 'color')).toBe(true);
    });
  });

  describe('Workflow & Instance Schema Validation', () => {
    it('should reject workflow template with empty steps array', async () => {
      const res = await request(app)
        .post('/api/v1/workflows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Empty Step Workflow',
          steps: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject workflow instance start with invalid document_id UUID format', async () => {
      const res = await request(app)
        .post('/api/v1/workflow-instances')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          workflow_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          document_id: 'invalid-doc-uuid',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.issues.some((i: any) => i.field === 'document_id')).toBe(true);
    });

    it('should reject workflow rejection with empty comments justification', async () => {
      const res = await request(app)
        .post('/api/v1/workflow-instances/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/reject')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          comments: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.issues.some((i: any) => i.field === 'comments')).toBe(true);
    });
  });

  describe('AI Inference Input Validation', () => {
    it('should reject chatbot request with empty message', async () => {
      const res = await request(app)
        .post('/api/v1/ai/chatbot')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          message: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject semantic search with empty query string', async () => {
      const res = await request(app)
        .get('/api/v1/ai/search?q=')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
