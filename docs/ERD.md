# Entity Relationship Diagram (ERD): QPMS

## Purpose
This document provides visual Entity Relationship Diagrams (ERDs) illustrating the relational models, cardinality, foreign key mappings, and table boundaries for the **University Question Paper Management & Generation System**.

## Scope
Visualizes the core modules: Institutional & Academic Structure, Identity & Scopes, Question Bank Versioning, Paper Blueprinting, Paper Generation, and Audit Logging.

---

## 1. Core Academic Hierarchy & Multitenancy ERD

```mermaid
erDiagram
    INSTITUTIONS ||--o{ DEPARTMENTS : "contains"
    INSTITUTIONS ||--o{ COURSES : "owns"
    INSTITUTIONS ||--o{ USERS : "employs"
    
    DEPARTMENTS ||--o{ PROGRAMS : "offers"
    DEPARTMENTS ||--o{ COURSES : "administers"
    
    PROGRAMS ||--o{ CURRICULUM_SCHEMES : "governed_by"
    CURRICULUM_SCHEMES ||--o{ CURRICULUM_COURSES : "binds"
    COURSES ||--o{ CURRICULUM_COURSES : "offered_as"
    
    COURSES ||--o{ SYLLABUS_UNITS : "partitioned_into"
    
    INSTITUTIONS {
        uuid id PK
        varchar code UK
        varchar name
        enum type
        enum status
    }
    
    DEPARTMENTS {
        uuid id PK
        uuid institution_id FK
        varchar code
        varchar name
        varchar hod_name
    }
    
    PROGRAMS {
        uuid id PK
        uuid department_id FK
        varchar code
        varchar name
        int duration_years
    }
    
    CURRICULUM_SCHEMES {
        uuid id PK
        uuid program_id FK
        varchar code
        varchar name
        varchar start_academic_year
    }
    
    COURSES {
        uuid id PK
        uuid institution_id FK
        uuid department_id FK
        varchar code
        varchar name
        int credits
    }
    
    CURRICULUM_COURSES {
        uuid id PK
        uuid curriculum_scheme_id FK
        uuid course_id FK
        int term_number
        boolean is_elective
    }
    
    SYLLABUS_UNITS {
        uuid id PK
        uuid course_id FK
        int unit_number
        varchar name
        decimal weightage_percent
    }
```

---

## 2. Identity, Role Scope & Department Access ERD

```mermaid
erDiagram
    USERS ||--o{ USER_DEPARTMENT_ROLES : "holds_roles"
    DEPARTMENTS ||--o{ USER_DEPARTMENT_ROLES : "scoped_to"
    
    USERS {
        uuid id PK
        uuid institution_id FK
        varchar email UK
        varchar password_hash
        varchar name
        boolean mfa_enabled
        enum status
    }
    
    USER_DEPARTMENT_ROLES {
        uuid id PK
        uuid user_id FK
        uuid department_id FK
        enum role_name
        boolean is_primary
    }
```

---

## 3. Question Bank Versioning & Paper Generation ERD

```mermaid
erDiagram
    COURSES ||--o{ QUESTION_ROOTS : "categorizes"
    SYLLABUS_UNITS ||--o{ QUESTION_ROOTS : "covers"
    QUESTION_ROOTS ||--|{ QUESTION_VERSIONS : "versions"
    
    COURSES ||--o{ BLUEPRINTS : "templates"
    BLUEPRINTS ||--|{ BLUEPRINT_SECTIONS : "sections"
    
    COURSES ||--o{ QUESTION_PAPERS : "examined_by"
    QUESTION_PAPERS ||--|{ PAPER_QUESTIONS : "composed_of"
    QUESTION_VERSIONS ||--o{ PAPER_QUESTIONS : "frozen_instance"
    QUESTION_PAPERS ||--o| PAPER_SNAPSHOTS : "sealed_as"
    
    QUESTION_ROOTS {
        uuid id PK
        uuid institution_id FK
        uuid department_id FK
        uuid course_id FK
        uuid unit_id FK
        timestamptz created_at
    }
    
    QUESTION_VERSIONS {
        uuid id PK
        uuid question_root_id FK
        int version_number
        enum type
        text text
        text answer
        int marks
        enum difficulty
        enum bloom_level
        jsonb options
        varchar correct_option
        enum status
        uuid created_by_user_id FK
        uuid approved_by_user_id FK
    }
    
    BLUEPRINTS {
        uuid id PK
        uuid department_id FK
        uuid course_id FK
        varchar title
        int total_marks
        int duration_minutes
    }
    
    BLUEPRINT_SECTIONS {
        uuid id PK
        uuid blueprint_id FK
        int section_order
        varchar title
        enum question_type
        int total_questions_to_attempt
        int marks_per_question
    }
    
    QUESTION_PAPERS {
        varchar id PK
        uuid institution_id FK
        uuid department_id FK
        uuid course_id FK
        varchar academic_year
        varchar paper_code
        enum set_name
        int total_marks
        enum status
        uuid created_by_user_id FK
    }
    
    PAPER_QUESTIONS {
        uuid id PK
        varchar paper_id FK
        int section_order
        uuid question_version_id FK
        int display_order
        int assigned_marks
    }
    
    PAPER_SNAPSHOTS {
        uuid id PK
        varchar paper_id UK, FK
        jsonb manifest_payload
        varchar sha256_hash
        text digital_signature
        timestamptz sealed_at
    }
```

---

## Current State vs. Proposed State

* **Current State:** No visual or documented Entity Relationship Diagrams exist in the project repository.
* **Proposed State:** Comprehensive Mermaid ERDs visually mapping all entities, cardinalities, keys, and foreign relationship constraints.

## Decisions
1. Use Mermaid syntax for all ER diagrams to allow direct rendering in GitHub/GitLab markdown viewers.

## Open Questions
- None.

## Related Documents
- [DATA_MODEL.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DATA_MODEL.md)
- [DATABASE_DESIGN.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DATABASE_DESIGN.md)
- [DOMAIN_MODEL.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DOMAIN_MODEL.md)
