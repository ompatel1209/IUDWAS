import request from 'supertest';
import { createApp } from '../app';
import { getDatabase } from '../db/database';
import { seedDatabase } from '../db/seed';

const app = createApp();

beforeAll(() => {
  seedDatabase();
});

describe('Authentication & Session API Tests', () => {
  it('should successfully log in super admin with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@iudwas.edu',
        password: 'Password@123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.role).toBe('SUPER_ADMIN');
    expect(res.body.data.user.email).toBe('admin@iudwas.edu');
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@iudwas.edu',
        password: 'WrongPassword999',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should register a new student account', async () => {
    const email = `test.student.${Date.now()}@iudwas.edu`;
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'Password@123',
        full_name: 'Test Student Account',
        role: 'STUDENT',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.role).toBe('STUDENT');
  });

  it('should refresh access token using valid refresh token', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'student.alex@iudwas.edu',
        password: 'Password@123',
      });

    const { refreshToken } = loginRes.body.data;

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).toBeDefined();
  });

  it('should get current user profile with /auth/me', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'student.alex@iudwas.edu',
        password: 'Password@123',
      });

    const token = loginRes.body.data.accessToken;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe('student.alex@iudwas.edu');
    expect(meRes.body.data.user.role).toBe('STUDENT');
  });

  it('should upload a profile photo for authenticated user', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'student.alex@iudwas.edu',
        password: 'Password@123',
      });

    const token = loginRes.body.data.accessToken;

    const fakePng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const uploadRes = await request(app)
      .post('/api/v1/auth/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', fakePng, 'my_avatar.png');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.data.avatar_url).toBeDefined();
    expect(uploadRes.body.data.avatar_url).toContain('/uploads/avatars/');
  });

  it('should remove profile photo for authenticated user', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'student.alex@iudwas.edu',
        password: 'Password@123',
      });

    const token = loginRes.body.data.accessToken;

    const delRes = await request(app)
      .delete('/api/v1/auth/avatar')
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
    expect(delRes.body.data.user.avatar_url).toBeNull();
  });

  it('should update user profile information', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'student.alex@iudwas.edu',
        password: 'Password@123',
      });

    const token = loginRes.body.data.accessToken;

    const updateRes = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        full_name: 'Alex Johnson Updated',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.user.full_name).toBe('Alex Johnson Updated');
  });
});
