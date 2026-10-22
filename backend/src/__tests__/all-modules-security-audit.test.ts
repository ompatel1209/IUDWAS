import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createApp } from '../app';
import { seedDatabase } from '../db/seed';

const app = createApp();

let superAdminToken: string;
let deptAdminToken: string;
let facultyToken: string;
let studentToken: string;
let studentBToken: string;

let confidentialDocId: string;
let studentDocId: string;

beforeAll(async () => {
  seedDatabase();

  const superAdminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@iudwas.edu', password: 'Password@123' });
  superAdminToken = superAdminLogin.body.data.accessToken;

  const deptAdminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'deptadmin.cs@iudwas.edu', password: 'Password@123' });
  deptAdminToken = deptAdminLogin.body.data.accessToken;

  const facultyLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'faculty.smith@iudwas.edu', password: 'Password@123' });
  facultyToken = facultyLogin.body.data.accessToken;

  const studentLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'student.alex@iudwas.edu', password: 'Password@123' });
  studentToken = studentLogin.body.data.accessToken;

  // Register Student B
  const studentBRegister = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: 'student.bob@iudwas.edu',
      password: 'Password@123',
      full_name: 'Bob Student',
      role: 'STUDENT',
    });
  studentBToken = studentBRegister.body.data.accessToken;

  // Upload a confidential document by Dept Admin
  const pdfPath = path.join(__dirname, 'audit-confidential.pdf');
  fs.writeFileSync(pdfPath, '%PDF-1.4 Confidential Faculty Evaluation');
  const uploadRes = await request(app)
    .post('/api/v1/documents/upload')
    .set('Authorization', `Bearer ${deptAdminToken}`)
    .field('title', 'Confidential Faculty Review')
    .field('is_confidential', 'true')
    .attach('file', pdfPath);
  if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  confidentialDocId = uploadRes.body.data.document_id;

  // Upload student A document
  const studentPdf = path.join(__dirname, 'student-doc.pdf');
  fs.writeFileSync(studentPdf, '%PDF-1.4 Alex Transcript Record');
  const studentUpload = await request(app)
    .post('/api/v1/documents/upload')
    .set('Authorization', `Bearer ${studentToken}`)
    .field('title', 'Alex Private Transcript')
    .field('is_confidential', 'true')
    .attach('file', studentPdf);
  if (fs.existsSync(studentPdf)) fs.unlinkSync(studentPdf);
  studentDocId = studentUpload.body.data.document_id;
});

describe('Comprehensive Multi-Module Security & Robustness Audit', () => {
  describe('1. SQL Injection (SQLi) Defense Verification', () => {
    it('should resist SQL injection attempts in search queries', async () => {
      const sqliPayload = "' OR 1=1 --";
      const res = await request(app)
        .get(`/api/v1/documents?search=${encodeURIComponent(sqliPayload)}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Parameterized query treats it as literal string, not injecting syntax
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should resist SQL injection attempts in sort order fields', async () => {
      const maliciousSort = 'created_at; DROP TABLE users;--';
      const res = await request(app)
        .get(`/api/v1/users?sortBy=${encodeURIComponent(maliciousSort)}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      // Zod schema regex or controller sort column whitelist rejects/fallbacks safely
      expect(res.status === 200 || res.status === 400).toBe(true);
    });

    it('should resist SQL injection in authentication email field', async () => {
      const sqliAuth = "admin@iudwas.edu' OR '1'='1";
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: sqliAuth, password: 'password' });

      // Schema or auth safely rejects
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Insecure Direct Object Reference (IDOR) & Tenant Isolation', () => {
    it('should forbid Student B from downloading Student A confidential document', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${studentDocId}/download`)
        .set('Authorization', `Bearer ${studentBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should forbid Student from downloading confidential department faculty document', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${confidentialDocId}/download`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should forbid Student from modifying administrative system settings', async () => {
      const res = await request(app)
        .put('/api/v1/system/settings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          settings: [{ key: 'university_name', value: 'Hacked University' }],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. JWT Security & Tamper Resistance', () => {
    it('should reject forged JWT with invalid signature', async () => {
      const forgedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NSIsInJvbGUiOiJTVVBFUl9BRE1JTiJ9.invalidsignature';
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject requests with missing bearer scheme', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'InvalidAuthHeaderFormat');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Workflow Authorization & Role Integrity', () => {
    it('should forbid unauthorized users from approving workflow instances', async () => {
      // Start workflow
      const wfList = await request(app)
        .get('/api/v1/workflows')
        .set('Authorization', `Bearer ${studentToken}`);
      
      const wfId = wfList.body.data[0]?.workflow_id;
      if (wfId) {
        const startRes = await request(app)
          .post('/api/v1/workflow-instances')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            workflow_id: wfId,
            document_id: studentDocId,
            comments: 'Please approve my transcript',
          });

        const instanceId = startRes.body.data.instance_id;

        // Student attempts to approve their own workflow
        const approveRes = await request(app)
          .post(`/api/v1/workflow-instances/${instanceId}/approve`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ comments: 'Self approval' });

        expect(approveRes.status).toBe(403);
        expect(approveRes.body.success).toBe(false);
      }
    });
  });
});
