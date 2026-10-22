# Intelligent University Document & Workflow Automation System (IUDWAS)

A production-ready enterprise university management platform designed with an **Apple Design System** aesthetic (macOS/iOS frosted glass translucency, tactile feedback, SF font stack, dark/light theme).

---

## 🏛️ System Overview

IUDWAS automates academic and administrative processes across university departments:
- **Authentication & RBAC**: JWT Access tokens (1 hr) with automatic refresh token rotation (7 days) across 4 roles (`SUPER_ADMIN`, `DEPT_ADMIN`, `FACULTY`, `STUDENT`).
- **Relational 3NF Database**: SQLite in WAL mode with foreign key constraints, relational transactions, performance indexing, and automatic seed generation.
- **Document Management Engine**: Multi-versioning (v1, v2, v3...), multipart uploads, SHA-256 integrity, OCR text extraction, confidential flags, departmental scoping, and historical version downloads.
- **Workflow Automation Engine**: Sequential multi-stage review pipelines, role-based approval inboxes, atomic approval/rejection state transitions, delegation, and live timeline progress tracking.
- **AI Intelligence & OCR Modules**: RAG conversational university assistant grounded in institution policies & document data, automatic document summarizer with reading time metrics, and semantic search.
- **Security & Audit Logs**: Immutable audit trails recording user, IP, action, resource, timestamp, and JSON metadata.
- **System Telemetry**: Real-time health monitor reporting database latency, memory load, uptime, and service statuses.

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
npm run seed     # Initialize schema and load realistic university seed data
npm test         # Run 25 automated unit & integration test suites
npm run dev      # Runs Express backend at http://localhost:3001
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run build    # Production bundle verification
npm run dev      # Runs Vite dev server at http://localhost:5173
```

---

## 🔑 Demo Accounts & Credentials

Each account includes realistic documents, workflows, and permissions. You can also use the **One-Click Quick Switcher** buttons on the Login page:

| Role | Email | Password | Scope / Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@iudwas.edu` | `Password@123` | Full system access, all departments, settings, user management, audit trails |
| **Dept Admin (CS)** | `deptadmin.cs@iudwas.edu` | `Password@123` | CS department administration, workflow template design, approvals |
| **Faculty Member** | `faculty.smith@iudwas.edu` | `Password@123` | Stage 1 approvals queue, document reviewing, research proposals |
| **Student** | `student.alex@iudwas.edu` | `Password@123` | Document vault upload, workflow requests (course exemption, degree check), AI assistant |

---

## 📐 Architecture & Technology Stack

### Backend
- **Runtime**: Node.js & TypeScript
- **Framework**: Express 4.21 with strict security headers (CORS, Helmet, Rate limiting)
- **Database Engine**: Better-SQLite3 (`PRAGMA journal_mode = WAL;`, `foreign_keys = ON;`)
- **Security**: Bcryptjs (salted password hashing), Jsonwebtoken (access + refresh rotation)
- **File Processing**: Multer (disk storage, UUID keys, 50MB limits, mime checking)
- **Testing**: Jest + Supertest (25 test cases passing)

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Routing**: React Router v6 with `ProtectedRoute` and `RoleGuard`
- **Design System**: Apple macOS/iOS Glassmorphism (`backdrop-filter: blur(20px)`, SF typography, `.apple-press` spring feedback, custom translucent scrollbars, dark/light mode toggle)
- **Icons**: Lucide React
- **Celebration**: Canvas Confetti

---

## 🛡️ Security Guarantees
1. **IDOR / BOLA Prevention**: Access to documents and workflows checks ownership and role permissions at the database query level.
2. **Server-Enforced RBAC**: User roles are decoded exclusively from verified JWT payloads.
3. **Session Invalidation**: Deactivating a user or resetting passwords immediately revokes all active refresh tokens in the database.
4. **Zero Hardcoded Statistics**: Every dashboard metric, chart, and counter is computed dynamically via SQL aggregations.
