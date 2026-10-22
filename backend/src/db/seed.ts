/**
 * ============================================================================
 * MODULE: Institutional Database Seeder (seed.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Populates the SQLite database with institutional demo entities, role accounts,
 * academic departments, document categories, multi-stage approval workflows,
 * document records with version histories, OCR text, and audit logs.
 * 
 * WHAT THIS MODULE DOES:
 * 1. Runs within a single atomic SQLite transaction (`db.transaction`).
 * 2. Cleans existing records in reverse foreign-key dependency order.
 * 3. Seeds core university departments (CSE, ECE, SBE, Registrar).
 * 4. Generates bcrypt-hashed user accounts with varying roles:
 *    - Super Admin: `admin@iudwas.edu`
 *    - Dept Admin: `deptadmin.cs@iudwas.edu`, `deptadmin.ece@iudwas.edu`
 *    - Faculty: `faculty.smith@iudwas.edu`, `faculty.turing@iudwas.edu`
 *    - Student: `student.alex@iudwas.edu`, `student.sarah@iudwas.edu`
 * 5. Seeds document categories (Course Exemption, Research Grant, Grade Appeal, Syllabus)
 *    and searchable metadata tags.
 * 6. Seeds multi-step workflow templates (e.g. Course Exemption Approval with
 *    Faculty Review -> Dept Chair Approval -> Registrar Final Seal).
 * 7. Creates initial sample documents, mock PDF binaries, versions, and audit trails.
 * ============================================================================
 */

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { getDatabase } from './database';
import { logger } from '../utils/logger';
import { config } from '../config';

export function seedDatabase(): void {
  const db = getDatabase();

  logger.info('Starting database seeding...');

  // Ensure uploads directory exists with dummy files
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }

  // Helper transaction
  const runSeed = db.transaction(() => {
    // Clear existing data in reverse FK order
    db.exec(`
      DELETE FROM audit_logs;
      DELETE FROM notifications;
      DELETE FROM workflow_step_logs;
      DELETE FROM workflow_instances;
      DELETE FROM workflow_steps;
      DELETE FROM workflows;
      DELETE FROM document_tags;
      DELETE FROM document_versions;
      DELETE FROM documents;
      DELETE FROM tags;
      DELETE FROM doc_categories;
      DELETE FROM refresh_tokens;
      DELETE FROM users;
      DELETE FROM departments;
      DELETE FROM system_settings;
    `);

    // 1. Insert Departments
    const deptCS = uuidv4();
    const deptEE = uuidv4();
    const deptBUS = uuidv4();
    const deptREG = uuidv4();

    const insertDept = db.prepare(`
      INSERT INTO departments (department_id, name, code, is_active, created_at)
      VALUES (?, ?, ?, 1, datetime('now'))
    `);

    insertDept.run(deptCS, 'Computer Science & Engineering', 'CSE');
    insertDept.run(deptEE, 'Electrical & Computer Engineering', 'ECE');
    insertDept.run(deptBUS, 'School of Business & Economics', 'SBE');
    insertDept.run(deptREG, 'Office of the University Registrar', 'REG');

    // 2. Insert Users
    const defaultSeedPassword = process.env.SEED_DEFAULT_PASSWORD || 'Password@123';
    const passwordHash = bcrypt.hashSync(defaultSeedPassword, 10);

    const userAdmin = uuidv4();
    const userDeptAdminCS = uuidv4();
    const userDeptAdminEE = uuidv4();
    const userFacultySmith = uuidv4();
    const userFacultyChen = uuidv4();
    const userStudentAlex = uuidv4();
    const userStudentMaria = uuidv4();

    const insertUser = db.prepare(`
      INSERT INTO users (user_id, email, password_hash, full_name, role, department_id, employee_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `);

    insertUser.run(userAdmin, 'admin@iudwas.edu', passwordHash, 'Dr. Victoria Vance (Super Admin)', 'SUPER_ADMIN', deptREG, 'EMP-0001');
    insertUser.run(userDeptAdminCS, 'deptadmin.cs@iudwas.edu', passwordHash, 'Prof. Alan Turing (CS Chair)', 'DEPT_ADMIN', deptCS, 'EMP-0010');
    insertUser.run(userDeptAdminEE, 'deptadmin.ee@iudwas.edu', passwordHash, 'Prof. Nikola Tesla (EE Chair)', 'DEPT_ADMIN', deptEE, 'EMP-0020');
    insertUser.run(userFacultySmith, 'faculty.smith@iudwas.edu', passwordHash, 'Dr. John Smith', 'FACULTY', deptCS, 'EMP-0105');
    insertUser.run(userFacultyChen, 'faculty.chen@iudwas.edu', passwordHash, 'Dr. Li Chen', 'FACULTY', deptEE, 'EMP-0108');
    insertUser.run(userStudentAlex, 'student.alex@iudwas.edu', passwordHash, 'Alex Rivera', 'STUDENT', deptCS, 'STU-2026-0042');
    insertUser.run(userStudentMaria, 'student.maria@iudwas.edu', passwordHash, 'Maria Rodriguez', 'STUDENT', deptCS, 'STU-2026-0089');

    // Update Dept heads
    db.prepare(`UPDATE departments SET head_user_id = ? WHERE department_id = ?`).run(userDeptAdminCS, deptCS);
    db.prepare(`UPDATE departments SET head_user_id = ? WHERE department_id = ?`).run(userDeptAdminEE, deptEE);

    // 3. Categories
    const catTranscript = uuidv4();
    const catThesis = uuidv4();
    const catLeave = uuidv4();
    const catGrant = uuidv4();
    const catExemption = uuidv4();
    const catCert = uuidv4();

    const insertCat = db.prepare(`
      INSERT INTO doc_categories (category_id, name, code, color, is_active, created_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'))
    `);

    insertCat.run(catTranscript, 'Academic Transcript', 'TRANSCRIPT', '#007AFF');
    insertCat.run(catThesis, 'Thesis & Dissertation', 'THESIS', '#5856D6');
    insertCat.run(catLeave, 'Leave Application', 'LEAVE', '#FF9500');
    insertCat.run(catGrant, 'Research Grant Proposal', 'GRANT', '#34C759');
    insertCat.run(catExemption, 'Course Exemption Request', 'EXEMPTION', '#AF52DE');
    insertCat.run(catCert, 'Official Certificate', 'CERTIFICATE', '#30B0C7');

    // 4. Tags
    const tagUrgent = uuidv4();
    const tagConfidential = uuidv4();
    const tagFall2026 = uuidv4();
    const tagAccredited = uuidv4();
    const tagVerified = uuidv4();
    const tagReview = uuidv4();

    const insertTag = db.prepare(`
      INSERT INTO tags (tag_id, name, color, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `);

    insertTag.run(tagUrgent, 'Urgent', '#FF3B30');
    insertTag.run(tagConfidential, 'Confidential', '#5856D6');
    insertTag.run(tagFall2026, 'Fall 2026', '#007AFF');
    insertTag.run(tagAccredited, 'Accredited', '#34C759');
    insertTag.run(tagVerified, 'Verified', '#30B0C7');
    insertTag.run(tagReview, 'Review Needed', '#FF9500');

    // 5. Workflows and Workflow Steps
    const wfExemption = uuidv4();
    const wfGrant = uuidv4();
    const wfLeave = uuidv4();

    const insertWf = db.prepare(`
      INSERT INTO workflows (workflow_id, name, description, department_id, created_by, is_active, max_days_sla, auto_escalate, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, 1, datetime('now'), datetime('now'))
    `);

    insertWf.run(wfExemption, 'Course Exemption Approval Workflow', 'Multi-step review for student course transfer credit and prerequisite waiver requests.', deptCS, userDeptAdminCS, 7);
    insertWf.run(wfGrant, 'Faculty Research Grant Proposal Review', 'High-priority institutional workflow to evaluate and authorize internal research allocations.', deptCS, userDeptAdminCS, 14);
    insertWf.run(wfLeave, 'Student Medical / Emergency Leave Authorization', 'Accelerated approval process for student medical, academic, and emergency leaves of absence.', deptCS, userDeptAdminCS, 3);

    const insertStep = db.prepare(`
      INSERT INTO workflow_steps (step_id, workflow_id, step_order, step_name, approver_role, approver_user_id, is_parallel, sla_hours, on_approve_action, on_reject_action)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Steps for Exemption:
    const stepExemption1 = uuidv4();
    const stepExemption2 = uuidv4();
    const stepExemption3 = uuidv4();
    insertStep.run(stepExemption1, wfExemption, 1, 'Faculty Academic Advisor Review', 'FACULTY', userFacultySmith, 0, 48, 'NEXT_STEP', 'REJECT_WORKFLOW');
    insertStep.run(stepExemption2, wfExemption, 2, 'Department Chair Authorization', 'DEPT_ADMIN', userDeptAdminCS, 0, 48, 'NEXT_STEP', 'REJECT_WORKFLOW');
    insertStep.run(stepExemption3, wfExemption, 3, 'University Registrar Final Record', 'SUPER_ADMIN', userAdmin, 0, 24, 'FINALIZE_APPROVE', 'REJECT_WORKFLOW');

    // Steps for Grant:
    const stepGrant1 = uuidv4();
    const stepGrant2 = uuidv4();
    insertStep.run(stepGrant1, wfGrant, 1, 'Department Chair Financial Review', 'DEPT_ADMIN', userDeptAdminCS, 0, 72, 'NEXT_STEP', 'REJECT_WORKFLOW');
    insertStep.run(stepGrant2, wfGrant, 2, 'Dean & Super Admin Academic Allocation', 'SUPER_ADMIN', userAdmin, 0, 96, 'FINALIZE_APPROVE', 'REJECT_WORKFLOW');

    // Steps for Leave:
    const stepLeave1 = uuidv4();
    const stepLeave2 = uuidv4();
    insertStep.run(stepLeave1, wfLeave, 1, 'Faculty Advisor Concurrence', 'FACULTY', userFacultySmith, 0, 24, 'NEXT_STEP', 'REJECT_WORKFLOW');
    insertStep.run(stepLeave2, wfLeave, 2, 'Department Office Endorsement', 'DEPT_ADMIN', userDeptAdminCS, 0, 24, 'FINALIZE_APPROVE', 'REJECT_WORKFLOW');

    // 6. Sample Documents
    const doc1 = uuidv4();
    const doc2 = uuidv4();
    const doc3 = uuidv4();

    // Create dummy sample file in uploads
    const sampleFilePath1 = path.join(config.uploadDir, `doc-${doc1}.pdf`);
    const sampleFilePath2 = path.join(config.uploadDir, `doc-${doc2}.pdf`);
    const sampleFilePath3 = path.join(config.uploadDir, `doc-${doc3}.pdf`);

    fs.writeFileSync(sampleFilePath1, '%PDF-1.4 Mock University Document - Course Exemption Syllabus and Transcripts');
    fs.writeFileSync(sampleFilePath2, '%PDF-1.4 Mock University Document - Neural Network Quantum Computing Grant');
    fs.writeFileSync(sampleFilePath3, '%PDF-1.4 Mock University Document - Official Academic Record 2026');

    const insertDoc = db.prepare(`
      INSERT INTO documents (
        document_id, title, file_path, file_name, file_type, file_size, mime_type,
        uploaded_by, department_id, category_id, ocr_text, is_confidential, version,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    insertDoc.run(
      doc1,
      'CS402 Advanced Distributed Systems - Exemption Request.pdf',
      sampleFilePath1,
      'CS402_Exemption_Alex_Rivera.pdf',
      'pdf',
      425890,
      'application/pdf',
      userStudentAlex,
      deptCS,
      catExemption,
      'STATE UNIVERSITY TRANSCRIPT EVALUATION\nStudent: Alex Rivera\nID: STU-2026-0042\nTarget Course: CS-402 Distributed Systems\nPrior Course: CS-380 Cloud Architecture (Grade: A, Credits: 4.0)\nSyllabus comparison: 92% overlap covering Paxos, Raft consensus, vector clocks, and distributed transactions.\nRequested Action: Course Exemption Waiver.',
      0,
      1,
      'active'
    );

    insertDoc.run(
      doc2,
      'Quantum-Classical Hybrid Neural Computing Research Grant.pdf',
      sampleFilePath2,
      'Quantum_Neural_Grant_2026.pdf',
      'pdf',
      1280400,
      'application/pdf',
      userFacultySmith,
      deptCS,
      catGrant,
      'INSTITUTIONAL RESEARCH GRANT PROPOSAL\nPrincipal Investigator: Dr. John Smith\nCo-PI: Dr. Li Chen\nDepartment: Computer Science & Engineering\nRequested Budget: $45,000\nProject Title: Scalable Fault-Tolerant Distributed Consensus in Quantum-Classical Co-processors\nExecutive Summary: This research establishes novel compilation techniques for stateful quantum workflows.',
      1,
      1,
      'active'
    );

    insertDoc.run(
      doc3,
      'Official Academic Transcript - Fall 2026 Final.pdf',
      sampleFilePath3,
      'Official_Transcript_Maria_Rodriguez.pdf',
      'pdf',
      312450,
      'application/pdf',
      userStudentMaria,
      deptCS,
      catTranscript,
      'UNIVERSITY REGISTRAR SEALED TRANSCRIPT\nStudent Name: Maria Rodriguez\nCumulative GPA: 3.94 / 4.00\nMajor: Computer Science\nStatus: Good Academic Standing\nCompleted Credits: 96\nDean List Honors: Fall 2024, Spring 2025, Fall 2025.',
      0,
      1,
      'active'
    );

    // Document versions
    const insertVersion = db.prepare(`
      INSERT INTO document_versions (version_id, document_id, version_number, file_path, file_name, file_size, uploaded_by, change_description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    insertVersion.run(uuidv4(), doc1, 1, sampleFilePath1, 'CS402_Exemption_Alex_Rivera.pdf', 425890, userStudentAlex, 'Initial submission with prior university transcripts');
    insertVersion.run(uuidv4(), doc2, 1, sampleFilePath2, 'Quantum_Neural_Grant_2026.pdf', 1280400, userFacultySmith, 'Initial research proposal draft');
    insertVersion.run(uuidv4(), doc3, 1, sampleFilePath3, 'Official_Transcript_Maria_Rodriguez.pdf', 312450, userStudentMaria, 'Certified transcript issued by Registrar');

    // Document tags
    const insertDocTag = db.prepare(`INSERT INTO document_tags (document_id, tag_id) VALUES (?, ?)`);
    insertDocTag.run(doc1, tagUrgent);
    insertDocTag.run(doc1, tagFall2026);
    insertDocTag.run(doc2, tagConfidential);
    insertDocTag.run(doc2, tagReview);
    insertDocTag.run(doc3, tagVerified);
    insertDocTag.run(doc3, tagAccredited);

    // 7. Workflow Instances
    const inst1 = uuidv4();
    const inst2 = uuidv4();

    const insertInst = db.prepare(`
      INSERT INTO workflow_instances (
        instance_id, workflow_id, document_id, submitted_by, current_step_id, status, comments, submitted_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    // Instance 1: Alex's exemption request currently awaiting Dr. Smith (Faculty)
    insertInst.run(inst1, wfExemption, doc1, userStudentAlex, stepExemption1, 'pending', 'Submitted prior course syllabus and transfer evaluation report.');

    // Instance 2: Dr. Smith's grant proposal currently awaiting Prof. Turing (Dept Admin)
    insertInst.run(inst2, wfGrant, doc2, userFacultySmith, stepGrant1, 'in_progress', 'Submitted research proposal with itemized budget breakdown.');

    // Step logs
    const insertLog = db.prepare(`
      INSERT INTO workflow_step_logs (log_id, instance_id, step_id, actor_id, action, comments, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    insertLog.run(uuidv4(), inst1, stepExemption1, userStudentAlex, 'SUBMIT', 'Submitted course exemption request for CS402.', );
    insertLog.run(uuidv4(), inst2, stepGrant1, userFacultySmith, 'SUBMIT', 'Submitted research grant proposal application for departmental review.');

    // 8. Notifications
    const insertNotif = db.prepare(`
      INSERT INTO notifications (notification_id, user_id, type, title, message, is_read, related_resource_type, related_resource_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    insertNotif.run(
      uuidv4(),
      userFacultySmith,
      'in_app',
      'Action Required: Course Exemption Approval',
      'Student Alex Rivera has submitted a Course Exemption Request for CS402 requiring your review.',
      0,
      'workflow_instance',
      inst1
    );

    insertNotif.run(
      uuidv4(),
      userDeptAdminCS,
      'in_app',
      'Action Required: Research Grant Proposal Review',
      'Dr. John Smith has submitted a Grant Proposal for departmental evaluation.',
      0,
      'workflow_instance',
      inst2
    );

    insertNotif.run(
      uuidv4(),
      userStudentAlex,
      'in_app',
      'Request Successfully Submitted',
      'Your Course Exemption Request (CS402) has been queued for faculty advisor review.',
      0,
      'workflow_instance',
      inst1
    );

    // 9. Initial Audit Logs
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (log_id, user_id, action, resource_type, resource_id, ip_address, user_agent, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    insertAudit.run(uuidv4(), userAdmin, 'SYSTEM_SEED', 'SYSTEM', null, '127.0.0.1', 'IUDWAS Seed Runner 1.0', JSON.stringify({ note: 'Initial system bootstrap and security verification' }));
    insertAudit.run(uuidv4(), userStudentAlex, 'DOCUMENT_UPLOAD', 'DOCUMENT', doc1, '127.0.0.1', 'Mozilla/5.0 Apple-WebKit', JSON.stringify({ file_name: 'CS402_Exemption_Alex_Rivera.pdf', size: 425890 }));
    insertAudit.run(uuidv4(), userStudentAlex, 'WORKFLOW_SUBMIT', 'WORKFLOW_INSTANCE', inst1, '127.0.0.1', 'Mozilla/5.0 Apple-WebKit', JSON.stringify({ workflow: 'Course Exemption', target_step: 'Faculty Review' }));

    // 10. System Settings
    const insertSetting = db.prepare(`
      INSERT INTO system_settings (key, value, description, updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `);

    insertSetting.run('system_name', 'IUDWAS University Portal', 'Platform Title');
    insertSetting.run('sla_warning_hours', '24', 'Hours before SLA deadline to trigger escalation warning');
    insertSetting.run('max_upload_size_mb', '50', 'Maximum document upload size in megabytes');
    insertSetting.run('ocr_engine_enabled', 'true', 'Enable automatic optical character recognition on document upload');
    insertSetting.run('maintenance_mode', 'false', 'Disable non-admin access for maintenance');
  });

  runSeed();
  logger.info('Database seeded successfully with users, departments, workflows, documents, and audit trails.');
}

// If run directly via CLI
if (require.main === module) {
  seedDatabase();
}
