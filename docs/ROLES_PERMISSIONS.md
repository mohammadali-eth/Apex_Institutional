# Roles, Permissions & Access Matrix: QPMS

## Purpose
This document provides the definitive specification of user roles, permission taxonomies, access control boundaries, and the functional permission matrix for the **University Question Paper Management & Generation System**.

## Scope
Defines the 12 core academic roles, atomic permission strings, and their precise access rights across all modules.

---

## 1. Role Taxonomy

| Role Identifier | Role Display Name | Primary Scope | Core Responsibilities |
| :--- | :--- | :--- | :--- |
| `super_admin` | Super Administrator | Global Platform | Manages multi-tenant instances, server health, system-wide configuration, and global audit logs. |
| `univ_admin` | University / Board Admin | University System | Administers university-level regulations, common degree frameworks, and centralized board exam sessions. |
| `inst_admin` | Institution Admin | Institution / Campus | Manages college-level profiles, departmental rosters, faculty accounts, and institutional academic policies. |
| `faculty_dean` | Faculty Dean / School Head | Faculty / School | Supervises constituent departments (e.g., Dean of Engineering supervising CS, EE, and Mech). |
| `hod` | Head of Department | Department | Approves departmental questions, assigns setters and reviewers, reviews paper drafts, signs off on blueprints. |
| `coordinator` | Exam Coordinator | Department | Assists HOD with paper compilation, syllabus weightage balance, and cross-course scheduling. |
| `teacher` | Teacher / Question Setter | Subject / Department | Authors new draft questions, revises existing items, builds draft blueprints, and initiates paper generation. |
| `reviewer` | Subject Reviewer / Moderator | Subject / Department | Audits questions for technical accuracy, difficulty, and Bloom taxonomy; accepts or rejects with feedback. |
| `exam_cell` | Controller of Examinations (CoE)| Institution / University | Creates official exam timetables, locks approved papers, manages secret keys, and schedules paper printing. |
| `print_officer` | Custodian / Print Officer | Physical Exam Center | Authorized to decrypt, watermark, and physically print paper batches inside secure custody rooms. |
| `auditor` | Accreditation / Quality Auditor | Institution (Read-Only) | Reviews historical exam papers, Bloom distributions, and CO-PO attainment evidence for accreditation. |
| `viewer` | Read-Only Academic Viewer | Department | Read-only inspection of approved curriculum and published materials. |

---

## 2. Granular Permissions Taxonomy

Permissions adhere to the structured notation: `<module>:<resource>:<action>`

### Question Bank Permissions
- `qbank:question:create` — Create new draft questions.
- `qbank:question:read` — View questions within assigned department.
- `qbank:question:update_own` — Edit draft questions authored by self.
- `qbank:question:update_any` — Edit draft questions authored by others.
- `qbank:question:review` — Review and submit moderation comments.
- `qbank:question:approve` — Authorize question versions for official exam use.
- `qbank:question:archive` — Mark questions archived/deprecated.

### Question Paper & Generation Permissions
- `paper:blueprint:create` — Configure visual paper blueprints.
- `paper:generator:execute` — Trigger constraint-satisfaction generation runs.
- `paper:draft:edit` — Swap questions or modify draft sections.
- `paper:draft:submit` — Submit paper for departmental review.
- `paper:approval:sign` — Formally approve and sign examination papers.
- `paper:secrecy:lock` — Seal approved papers and move to CoE custody.
- `paper:custody:print` — Decrypt and print paper with dynamic watermark.
- `paper:history:view` — View historical examination archives.

### Administration & Audit Permissions
- `admin:academic:manage` — Add/edit departments, programs, and curriculum schemes.
- `admin:users:manage` — Provision users and assign departmental roles.
- `audit:logs:view` — Inspect immutable security audit trails.

---

## 3. Comprehensive Permission Matrix

| Permission String | `super_admin` | `univ_admin` | `inst_admin` | `hod` | `coordinator` | `teacher` | `reviewer` | `exam_cell` | `print_officer` | `auditor` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `qbank:question:create` | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `qbank:question:read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| `qbank:question:update_own` | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `qbank:question:update_any` | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `qbank:question:review` | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| `qbank:question:approve` | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `qbank:question:archive` | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `paper:blueprint:create` | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `paper:generator:execute` | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `paper:draft:edit` | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `paper:approval:sign` | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `paper:secrecy:lock` | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| `paper:custody:print` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ |
| `paper:history:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| `admin:academic:manage` | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `admin:users:manage` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `audit:logs:view` | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ |

*(Key: ✓ = Permitted within active scope; ✗ = Denied)*

---

## Current State vs. Proposed State

* **Current State:** The client has a simplistic 5-role check in `src/lib/permissions/permissionService.ts` that conflates role identity with department ownership.
* **Proposed State:** A formal 12-role matrix governed by granular permission strings and enforced within active tenant and department scopes.

## Decisions
1. Restrict paper decryption and printing strictly to `exam_cell` and `print_officer` roles, barring general teachers and reviewers once a paper enters `LOCKED` status.
2. Require HOD sign-off before a question paper can be considered eligible for examination custody locking.

## Open Questions
- None.

## Related Documents
- [AUTHENTICATION_AUTHORIZATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/AUTHENTICATION_AUTHORIZATION.md)
- [SECURITY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/SECURITY.md)
- [ADR-006-authorization-strategy.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-006-authorization-strategy.md)
