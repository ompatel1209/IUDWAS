import request from 'supertest';
import { createApp } from '../app';
import { seedDatabase } from '../db/seed';

const app = createApp();

let adminToken: string;

beforeAll(async () => {
  seedDatabase();
  const adminLogin = await request(app).post('/api/v1/auth/login').send({ email: 'admin@iudwas.edu', password: 'Password@123' });
  adminToken = adminLogin.body.data.accessToken;
});

describe('Admin CRUD API Tests', () => {
  let createdUserId: string;
  let createdDeptId: string;

  it('admin creates a new department', async () => {
    const res = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Biomedical Engineering',
        code: 'BME',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Biomedical Engineering');
    createdDeptId = res.body.data.department_id;
  });

  it('admin creates a faculty user attached to the department', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'faculty.bme@iudwas.edu',
        password: 'Password@123',
        full_name: 'Dr. Sarah Connor',
        role: 'FACULTY',
        department_id: createdDeptId,
        employee_id: 'EMP-BME-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('faculty.bme@iudwas.edu');
    createdUserId = res.body.data.user_id;
  });

  it('admin edits the user details', async () => {
    const res = await request(app)
      .put(`/api/v1/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        full_name: 'Prof. Sarah Connor Ph.D.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.full_name).toBe('Prof. Sarah Connor Ph.D.');
  });

  it('admin toggles user active status (deactivate & reactivate)', async () => {
    const deactRes = await request(app)
      .patch(`/api/v1/users/${createdUserId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deactRes.status).toBe(200);
    expect(deactRes.body.data.is_active).toBe(false);

    const reactRes = await request(app)
      .patch(`/api/v1/users/${createdUserId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(reactRes.status).toBe(200);
    expect(reactRes.body.data.is_active).toBe(true);
  });

  it('admin resets user password', async () => {
    const res = await request(app)
      .post(`/api/v1/users/${createdUserId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        new_password: 'NewSecurePassword@2026',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify login with new password
    const testLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'faculty.bme@iudwas.edu',
        password: 'NewSecurePassword@2026',
      });

    expect(testLogin.status).toBe(200);
    expect(testLogin.body.success).toBe(true);
  });
});
