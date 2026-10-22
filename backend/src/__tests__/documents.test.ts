import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createApp } from '../app';
import { seedDatabase } from '../db/seed';

const app = createApp();
let studentToken: string;
let adminToken: string;

beforeAll(async () => {
  seedDatabase();

  const studentLogin = await request(app).post('/api/v1/auth/login').send({ email: 'student.alex@iudwas.edu', password: 'Password@123' });
  studentToken = studentLogin.body.data.accessToken;

  const adminLogin = await request(app).post('/api/v1/auth/login').send({ email: 'admin@iudwas.edu', password: 'Password@123' });
  adminToken = adminLogin.body.data.accessToken;
});

describe('Document Management & Versioning Tests', () => {
  let createdDocId: string;

  it('should list documents with pagination and metadata', async () => {
    const res = await request(app)
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta.total).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should upload a new document with multipart form', async () => {
    // Create temporary test file
    const testFilePath = path.join(__dirname, 'test-doc.pdf');
    fs.writeFileSync(testFilePath, '%PDF-1.4 Mock Upload Test Document');

    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${studentToken}`)
      .field('title', 'Automated Test Transcript')
      .field('is_confidential', 'false')
      .attach('file', testFilePath);

    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Automated Test Transcript');
    expect(res.body.data.version).toBe(1);
    expect(res.body.data.ocr_text).toBeDefined();

    createdDocId = res.body.data.document_id;
  });

  it('should retrieve document details by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${createdDocId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.document_id).toBe(createdDocId);
    expect(Array.isArray(res.body.data.versions)).toBe(true);
  });

  it('should upload version 2 for the document', async () => {
    const testFilePath = path.join(__dirname, 'test-doc-v2.pdf');
    fs.writeFileSync(testFilePath, '%PDF-1.4 Mock Upload Test Document Version 2');

    const res = await request(app)
      .post(`/api/v1/documents/${createdDocId}/version`)
      .set('Authorization', `Bearer ${studentToken}`)
      .field('change_description', 'Added signature and seal')
      .attach('file', testFilePath);

    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.version).toBe(2);
  });

  it('should list all versions of the document', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${createdDocId}/versions`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
  });
});
