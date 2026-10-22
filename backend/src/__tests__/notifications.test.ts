import request from 'supertest';
import { createApp } from '../app';
import { seedDatabase } from '../db/seed';

const app = createApp();

beforeAll(() => {
  seedDatabase();
});

describe('Notifications & Signed Announcements API Tests', () => {
  let adminToken: string;
  let deptAdminToken: string;
  let facultyToken: string;
  let studentToken: string;

  beforeAll(async () => {
    // Login Super Admin
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@iudwas.edu',
      password: 'Password@123',
    });
    adminToken = adminRes.body.data.accessToken;

    // Login Dept Admin
    const deptRes = await request(app).post('/api/v1/auth/login').send({
      email: 'deptadmin.cs@iudwas.edu',
      password: 'Password@123',
    });
    deptAdminToken = deptRes.body.data.accessToken;

    // Login Faculty
    const facRes = await request(app).post('/api/v1/auth/login').send({
      email: 'faculty.smith@iudwas.edu',
      password: 'Password@123',
    });
    facultyToken = facRes.body.data.accessToken;

    // Login Student
    const stuRes = await request(app).post('/api/v1/auth/login').send({
      email: 'student.alex@iudwas.edu',
      password: 'Password@123',
    });
    studentToken = stuRes.body.data.accessToken;
  });

  it('should allow Super Admin to broadcast a signed notification to all users', async () => {
    const res = await request(app)
      .post('/api/v1/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Campus-wide Maintenance Schedule',
        message: 'System maintenance will take place this Sunday from 2 AM to 4 AM UTC.',
        priority: 'ANNOUNCEMENT',
        target_type: 'ALL',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.signature).toBeDefined();
    expect(res.body.data.signature).toContain('SIG-IUDWAS-SUPE');
    expect(res.body.data.recipients_count).toBeGreaterThan(0);
    expect(res.body.data.signed_by).toBe('Dr. Victoria Vance (Super Admin)');
  });

  it('should allow Department Admin to send a signed notification to their department', async () => {
    const res = await request(app)
      .post('/api/v1/notifications')
      .set('Authorization', `Bearer ${deptAdminToken}`)
      .send({
        title: 'CS Department Faculty Meeting',
        message: 'All CS staff and students please review the semester calendar.',
        priority: 'IMPORTANT',
        target_type: 'DEPARTMENT',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.signature).toBeDefined();
    expect(res.body.data.signature).toContain('SIG-IUDWAS-DEPT');
    expect(res.body.data.signed_by).toBe('Prof. Alan Turing (CS Chair)');
  });

  it('should allow Faculty to send a signed notification to Students', async () => {
    const res = await request(app)
      .post('/api/v1/notifications')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        title: 'Midterm Exam Venue Announcement',
        message: 'Please assemble in Hall B at 10:00 AM sharp with your student IDs.',
        priority: 'URGENT',
        target_type: 'ROLE',
        target_role: 'STUDENT',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.signature).toBeDefined();
    expect(res.body.data.signature).toContain('SIG-IUDWAS-FACU');
    expect(res.body.data.signed_by).toBe('Dr. John Smith');
  });

  it('should prevent Students from broadcasting notifications (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/notifications')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Unauthorized Student Announcement',
        message: 'Trying to broadcast without permission.',
        target_type: 'ALL',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow Student to view the signed notification with sender signature and identity details', async () => {
    const res = await request(app)
      .get('/api/v1/notifications?limit=10')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const signedNotification = res.body.data.find((n: any) => n.sender_signature);
    expect(signedNotification).toBeDefined();
    expect(signedNotification.sender_name).toBeDefined();
    expect(signedNotification.sender_role).toBeDefined();
    expect(signedNotification.sender_signature).toMatch(/^SIG-IUDWAS-/);
  });
});
