import request from 'supertest';
import { createApp } from '../app';
import { seedDatabase } from '../db/seed';

const app = createApp();

let adminToken: string;
let facultyToken: string;
let deptAdminToken: string;
let studentToken: string;
let testDocId: string;
let testWorkflowId: string;

beforeAll(async () => {
  seedDatabase();

  const adminLogin = await request(app).post('/api/v1/auth/login').send({ email: 'admin@iudwas.edu', password: 'Password@123' });
  adminToken = adminLogin.body.data.accessToken;

  const deptAdminLogin = await request(app).post('/api/v1/auth/login').send({ email: 'deptadmin.cs@iudwas.edu', password: 'Password@123' });
  deptAdminToken = deptAdminLogin.body.data.accessToken;

  const facultyLogin = await request(app).post('/api/v1/auth/login').send({ email: 'faculty.smith@iudwas.edu', password: 'Password@123' });
  facultyToken = facultyLogin.body.data.accessToken;

  const studentLogin = await request(app).post('/api/v1/auth/login').send({ email: 'student.alex@iudwas.edu', password: 'Password@123' });
  studentToken = studentLogin.body.data.accessToken;

  // Get sample doc
  const docsRes = await request(app).get('/api/v1/documents').set('Authorization', `Bearer ${studentToken}`);
  testDocId = docsRes.body.data[0].document_id;

  // Get sample workflow
  const wfRes = await request(app).get('/api/v1/workflows').set('Authorization', `Bearer ${studentToken}`);
  testWorkflowId = wfRes.body.data[0].workflow_id;
});

describe('Workflow Engine & Lifecycle Tests', () => {
  let instanceId: string;

  it('student can submit a workflow instance request', async () => {
    const res = await request(app)
      .post('/api/v1/workflow-instances')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        workflow_id: testWorkflowId,
        document_id: testDocId,
        comments: 'Submitting test request for evaluation',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.current_step_id).toBeDefined();

    instanceId = res.body.data.instance_id;
  });

  it('faculty sees pending approval in inbox', async () => {
    const res = await request(app)
      .get('/api/v1/workflow-instances/pending')
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.some((i: any) => i.instance_id === instanceId);
    expect(found).toBe(true);
  });

  it('faculty approves step 1 of the workflow', async () => {
    const res = await request(app)
      .post(`/api/v1/workflow-instances/${instanceId}/approve`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        comments: 'Faculty review verified and approved',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('in_progress');
  });

  it('dept admin approves step 2 of the workflow', async () => {
    const res = await request(app)
      .post(`/api/v1/workflow-instances/${instanceId}/approve`)
      .set('Authorization', `Bearer ${deptAdminToken}`)
      .send({
        comments: 'Department Chair concurrence granted',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('super admin finalizes approval on final step', async () => {
    const res = await request(app)
      .post(`/api/v1/workflow-instances/${instanceId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        comments: 'Official University Seal recorded',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('approved');
  });

  it('retrieving instance details shows complete audit logs timeline', async () => {
    const res = await request(app)
      .get(`/api/v1/workflow-instances/${instanceId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('approved');
    expect(res.body.data.logs.length).toBeGreaterThanOrEqual(4); // SUBMIT, 3x APPROVE
  });
});
