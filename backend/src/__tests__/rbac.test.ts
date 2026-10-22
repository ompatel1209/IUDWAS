import request from 'supertest';
import { createApp } from '../app';
import { seedDatabase } from '../db/seed';

const app = createApp();

let adminToken: string;
let facultyToken: string;
let studentToken: string;

beforeAll(async () => {
  seedDatabase();

  const adminLogin = await request(app).post('/api/v1/auth/login').send({ email: 'admin@iudwas.edu', password: 'Password@123' });
  adminToken = adminLogin.body.data.accessToken;

  const facultyLogin = await request(app).post('/api/v1/auth/login').send({ email: 'faculty.smith@iudwas.edu', password: 'Password@123' });
  facultyToken = facultyLogin.body.data.accessToken;

  const studentLogin = await request(app).post('/api/v1/auth/login').send({ email: 'student.alex@iudwas.edu', password: 'Password@123' });
  studentToken = studentLogin.body.data.accessToken;
});

describe('RBAC & Security Authorization Tests', () => {
  it('SUPER_ADMIN can access user management list', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('STUDENT is forbidden from accessing user management list', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('FACULTY is forbidden from creating departments', async () => {
    const res = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        name: 'Forbidden Department',
        code: 'FORBID',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('Unauthenticated request is rejected with 401', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
