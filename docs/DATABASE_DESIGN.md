# Physical Database Design & Schema DDL: QPMS

## Purpose
This document specifies the physical database implementation for the **University Question Paper Management & Generation System** in PostgreSQL 16+. It provides the exact Data Definition Language (DDL), indexes, foreign key cascading rules, triggers, partitioning, and Row-Level Security (RLS) policies.

## Scope
Covers the core schema definitions, multi-tenant security policies, and performance tuning configurations required for enterprise deployment.

---

## 1. PostgreSQL Schema DDL

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE institution_type AS ENUM ('University', 'AutonomousCollege', 'AffiliatedCollege', 'Polytechnic', 'Board');
CREATE TYPE academic_status AS ENUM ('active', 'inactive', 'deprecated');
CREATE TYPE user_role_type AS ENUM ('university_admin', 'institution_admin', 'hod', 'coordinator', 'teacher', 'reviewer', 'exam_cell');
CREATE TYPE question_type_enum AS ENUM ('mcq', 'true_false', 'fill_blank', 'one_word', 'short', 'long', 'essay', 'explain', 'difference', 'problem', 'numerical', 'coding', 'case_study', 'match_following', 'assertion_reason');
CREATE TYPE difficulty_level_enum AS ENUM ('Easy', 'Medium', 'Hard');
CREATE TYPE bloom_level_enum AS ENUM ('Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create');
CREATE TYPE question_status_enum AS ENUM ('Draft', 'Submitted', 'UnderReview', 'Approved', 'Rejected', 'Archived');
CREATE TYPE paper_status_enum AS ENUM ('draft', 'generated', 'submitted', 'under_review', 'approved', 'locked', 'published', 'archived');
CREATE TYPE paper_set_enum AS ENUM ('A', 'B', 'C', 'D');

-- 1. INSTITUTIONS TABLE
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type institution_type NOT NULL DEFAULT 'AutonomousCollege',
    logo_url TEXT,
    crest_url TEXT,
    status academic_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. DEPARTMENTS TABLE
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    hod_name VARCHAR(255),
    status academic_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_dept_institution_code UNIQUE (institution_id, code)
);
CREATE INDEX idx_dept_institution ON departments(institution_id);

-- 3. PROGRAMS TABLE
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    duration_years INT NOT NULL DEFAULT 4,
    status academic_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_program_dept_code UNIQUE (department_id, code)
);

-- 4. CURRICULUM SCHEMES TABLE
CREATE TABLE curriculum_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_academic_year VARCHAR(20) NOT NULL,
    status academic_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_scheme_program_code UNIQUE (program_id, code)
);

-- 5. COURSES (SUBJECTS) TABLE
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    credits INT NOT NULL DEFAULT 4,
    default_language VARCHAR(30) NOT NULL DEFAULT 'English',
    status academic_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_course_dept_code UNIQUE (department_id, code)
);
CREATE INDEX idx_courses_dept ON courses(department_id);

-- 6. CURRICULUM COURSE BRIDGE
CREATE TABLE curriculum_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_scheme_id UUID NOT NULL REFERENCES curriculum_schemes(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    term_number INT NOT NULL,
    is_elective BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_curriculum_course_term UNIQUE (curriculum_scheme_id, course_id, term_number)
);

-- 7. SYLLABUS UNITS TABLE
CREATE TABLE syllabus_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    unit_number INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    weightage_percent DECIMAL(5,2) DEFAULT 20.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_unit_course_number UNIQUE (course_id, unit_number)
);
CREATE INDEX idx_units_course ON syllabus_units(course_id);

-- 8. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    status academic_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_institution ON users(institution_id);

-- 9. USER DEPARTMENT ROLES (Scope Assignments)
CREATE TABLE user_department_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    role_name user_role_type NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_dept_role UNIQUE (user_id, department_id, role_name)
);
CREATE INDEX idx_user_dept_roles_user ON user_department_roles(user_id);

-- 10. QUESTION ROOTS TABLE
CREATE TABLE question_roots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES syllabus_units(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_qroot_course_unit ON question_roots(course_id, unit_id);

-- 11. QUESTION VERSIONS TABLE (Immutable Snapshots)
CREATE TABLE question_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_root_id UUID NOT NULL REFERENCES question_roots(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    type question_type_enum NOT NULL,
    text TEXT NOT NULL,
    answer TEXT NOT NULL,
    marks INT NOT NULL,
    difficulty difficulty_level_enum NOT NULL,
    bloom_level bloom_level_enum NOT NULL,
    options JSONB,
    correct_option VARCHAR(10),
    tags TEXT[] DEFAULT '{}',
    status question_status_enum NOT NULL DEFAULT 'Draft',
    rejection_reason TEXT,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    approved_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    CONSTRAINT uq_qversion_root_number UNIQUE (question_root_id, version_number)
);
CREATE INDEX idx_qversions_root ON question_versions(question_root_id);
CREATE INDEX idx_qversions_status ON question_versions(status);
CREATE INDEX idx_qversions_search ON question_versions USING GIN (to_tsvector('english', text));

-- 12. BLUEPRINTS TABLE
CREATE TABLE blueprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    total_marks INT NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 180,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. BLUEPRINT SECTIONS TABLE
CREATE TABLE blueprint_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blueprint_id UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
    section_order INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    instructions TEXT,
    question_type question_type_enum NOT NULL,
    total_questions_to_attempt INT NOT NULL,
    total_questions_in_section INT NOT NULL,
    marks_per_question INT NOT NULL
);

-- 14. QUESTION PAPERS TABLE
CREATE TABLE question_papers (
    id VARCHAR(50) PRIMARY KEY, -- E.g., 'QP-2026-001'
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL,
    term_name VARCHAR(100) NOT NULL,
    paper_code VARCHAR(50),
    set_name paper_set_enum NOT NULL DEFAULT 'A',
    total_marks INT NOT NULL,
    duration_str VARCHAR(50) NOT NULL DEFAULT '3 Hours',
    status paper_status_enum NOT NULL DEFAULT 'draft',
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    approved_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ
);
CREATE INDEX idx_papers_dept_course ON question_papers(department_id, course_id);
CREATE INDEX idx_papers_year ON question_papers(academic_year);

-- 15. PAPER QUESTIONS TABLE
CREATE TABLE paper_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id VARCHAR(50) NOT NULL REFERENCES question_papers(id) ON DELETE CASCADE,
    section_order INT NOT NULL,
    question_version_id UUID NOT NULL REFERENCES question_versions(id) ON DELETE RESTRICT,
    display_order INT NOT NULL,
    assigned_marks INT NOT NULL,
    CONSTRAINT uq_paper_qversion UNIQUE (paper_id, question_version_id)
);
CREATE INDEX idx_paper_questions_version ON paper_questions(question_version_id);

-- 16. PAPER SNAPSHOTS TABLE
CREATE TABLE paper_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id VARCHAR(50) UNIQUE NOT NULL REFERENCES question_papers(id) ON DELETE CASCADE,
    manifest_payload JSONB NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    digital_signature TEXT,
    sealed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. AUDIT LOGS TABLE (Partitioned by Month)
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL,
    department_id UUID,
    actor_user_id UUID,
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    client_ip VARCHAR(45),
    user_agent TEXT,
    payload_diff JSONB,
    previous_hash VARCHAR(64),
    current_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partition Rules & Initial Monthly Partitions
CREATE TABLE audit_logs_2026_09 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE audit_logs_2026_10 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');

-- Block UPDATE and DELETE on Audit Logs
CREATE RULE no_update_audit AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
```

---

## 2. Row-Level Security (RLS) Policy Implementation

```sql
-- Enable RLS across domain tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_roots ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_papers ENABLE ROW LEVEL SECURITY;

-- Session-bound Tenant Isolation Policy
CREATE POLICY tenant_isolation_departments ON departments
    FOR ALL
    USING (institution_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_courses ON courses
    FOR ALL
    USING (institution_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_question_roots ON question_roots
    FOR ALL
    USING (institution_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_question_papers ON question_papers
    FOR ALL
    USING (institution_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

## Current State vs. Proposed State

* **Current State:** Zero database DDL or migrations exist. All entities exist solely as TypeScript client interfaces.
* **Proposed State:** Fully functional, enterprise-grade PostgreSQL 16+ DDL script with complete table definitions, foreign keys, RLS policies, GIN indexes, and partitioned audit storage.

## Decisions
1. Use PostgreSQL `UUID` primary keys with `gen_random_uuid()` for all entities except `question_papers`, which uses a human-readable prefix format (`QP-YYYY-XXX`).
2. Partition the `audit_logs` table by month to support high-throughput compliance logging without degrading database search performance.

## Open Questions
- None.

## Related Documents
- [DATA_MODEL.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DATA_MODEL.md)
- [ERD.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ERD.md)
- [ADR-007-database-strategy.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-007-database-strategy.md)
