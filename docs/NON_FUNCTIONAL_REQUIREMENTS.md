# Non-Functional Requirements Specification: QPMS

## Purpose
This document defines the quality attributes, performance benchmarks, security guarantees, availability standards, scalability limits, and compliance mandates for the **University Question Paper Management & Generation System**.

## Scope
The specifications here apply across all system components, including frontend single-page applications, backend APIs, algorithmic generation workers, databases, caches, and storage infrastructure.

---

## 1. Security & Confidentiality (SEC)

### NFR-SEC-01: Data Encryption
- **In-Transit:** All client-to-server and inter-service communications must be encrypted using TLS 1.3 (with fallback to TLS 1.2 minimum). Plain HTTP traffic is strictly prohibited.
- **At-Rest:** All database volumes, backups, and cached documents must be encrypted using AES-256.
- **Sensitive Field-Level Encryption:** Question papers in `Locked` or `Approved` state, exam codes, and correct answer keys must be encrypted at the database column level using application-managed cryptographic keys (envelope encryption).

### NFR-SEC-02: Authentication & Token Lifecycle
- Tokens must be stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies to mitigate Cross-Site Scripting (XSS) token theft.
- Access token lifespan: Maximum 15 minutes.
- Refresh token lifespan: Maximum 7 days, with automatic token rotation and reuse detection.
- Multi-Factor Authentication (MFA) must be enforced for users possessing administrative or Exam Cell (`CoE`, `HOD`) privileges.

### NFR-SEC-03: Multi-Tenancy & Scope Isolation
- Strict Row-Level Security (RLS) in PostgreSQL enforced on `institution_id` and `department_id`.
- Tenant context must be injected from cryptographically verified JWT claims, not trustable client-provided URL parameters.

---

## 2. Performance & Latency Targets (PERF)

| Operation / Endpoint | 95th Percentile ($P_{95}$) | 99th Percentile ($P_{99}$) | Max Allowed | Test Conditions |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & Context Switch** | < 150 ms | < 300 ms | 500 ms | 500 concurrent sessions |
| **Question Bank Search / Filter** | < 200 ms | < 400 ms | 800 ms | 100,000 questions in bank |
| **Question Create / Edit / Bump** | < 100 ms | < 250 ms | 500 ms | Standard relational write |
| **Paper Generation (50-100 Marks)** | < 1,500 ms | < 3,000 ms | 5,000 ms | Full constraint solver run |
| **Multi-Set Synthesis (Sets A-D)** | < 2,500 ms | < 4,500 ms | 7,000 ms | 4 sets generated in batch |
| **PDF Rendering & Watermarking** | < 2,000 ms | < 3,500 ms | 5,000 ms | Server-side Chromium headless |

---

## 3. Scalability & Sizing Targets (SCAL)

### NFR-SCAL-01: Multi-Institution Capacity
- Support up to **50 affiliated institutions / colleges** within a single shared database deployment using Row-Level Security.
- Support up to **500 distinct academic departments**.

### NFR-SCAL-02: Concurrency & Volume
- Concurrently active faculty and administrators: **1,000 simultaneous users**.
- Total question bank repository capacity: **500,000+ versioned questions**.
- Historical paper archive: **50,000+ past examination papers** retrievable within query SLA.

---

## 4. Availability & Reliability (REL)

### NFR-REL-01: System Uptime SLA
- **Target Uptime:** 99.9% availability during normal academic cycles.
- **High-Stakes Examination Cycles:** 99.99% availability during designated University Examination Windows (typically two 3-week windows per academic year).

### NFR-REL-02: Disaster Recovery Objectives
- **Recovery Point Objective (RPO):** $\le$ 15 minutes (continuous WAL archiving to encrypted offsite object storage).
- **Recovery Time Objective (RTO):** $\le$ 1 hour in the event of primary database failure.

---

## 5. Auditability & Compliance (AUD)

### NFR-AUD-01: Non-Repudiation
- Every action on an examination paper must be non-repudiable. Audit records must be cryptographically chained (SHA-256 hash of previous audit entry included in subsequent entry).
- Audit logs must be stored in an append-only table with PostgreSQL triggers preventing `UPDATE` or `DELETE` operations.

### NFR-AUD-02: Data Retention & Compliance
- Examination papers and question version histories must be retained in immutable storage for a minimum of **10 years** to comply with statutory accreditation bodies (e.g., UGC, AICTE, NAAC, NBA, ABET).

---

## 6. Accessibility & Usability (A11Y)

### NFR-A11Y-01: WCAG Compliance
- The web application UI must conform to **WCAG 2.1 Level AA** standards.
- Contrast ratio between text and background must meet or exceed 4.5:1 for normal text and 3:1 for large text.
- Full keyboard navigation support across all data tables, modals, and generation wizards.

---

## Current State vs. Proposed State

* **Current State:** The current React prototype has no SLA monitoring, no encryption at rest, no session timeout, and client-side data is vulnerable to local storage tampering.
* **Proposed State:** Strict enterprise-grade NFRs enforced via automated load testing (k6), security scanning (OWASP ZAP, Trivy), and cryptographic logging.

## Decisions
1. Enforce TLS 1.3 and AES-256 as hard non-negotiable security baselines.
2. Establish continuous WAL archiving and automated failover testing before production deployment.

## Open Questions
* Refer to [OPEN_QUESTIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/OPEN_QUESTIONS.md) Q4 regarding cloud deployment vs. on-premise university data center hosting.

## Related Documents
- [SECURITY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/SECURITY.md)
- [PERFORMANCE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/PERFORMANCE.md)
- [SCALABILITY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/SCALABILITY.md)
- [TESTING_STRATEGY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/TESTING_STRATEGY.md)
