# Open Architectural & Product Questions: QPMS

## Purpose
This document catalogs all currently unresolved architectural decisions, domain ambiguities, technical tradeoffs, and policy questions identified during the analysis of the **University Question Paper Management & Generation System**, along with proposed recommendations.

## Scope
Covers unresolved options across Multi-Tenancy Governance, Backend Technology Selection, Answer Key Generation, Student Mock Tests, and Hosting Infrastructure.

---

## 1. Unresolved Technical & Domain Questions

### Q1: Institutional Autonomy vs. Central University Syllabus Sharing
- **Context:** In large state university systems (e.g., Gujarat Technological University), the central university defines the master syllabus, but autonomous constituent colleges can set their own internal examinations, while affiliated colleges share common centralized board papers.
- **The Question:** Should the question bank allow affiliated colleges to draw questions from a shared university-wide "Central Board Pool", or should every institution maintain 100% physically isolated question pools?
- **Options Considered:**
  1. *Complete Isolation:* Every institution authors 100% of its own questions.
  2. *Federated Hybrid (Recommended):* Central university publishes master question banks tagged as `IS_BOARD_SHARED = TRUE`; constituent colleges can view and utilize these questions in their blueprints while maintaining private local pools for internal midterms.
- **Recommendation:** Adopt Option 2 (Federated Hybrid) via a shared grant table in PostgreSQL.

---

### Q2: Scope of Student Access & Mock Practice Tests
- **Context:** The prompt defines the system as a "University-level Multi-Institution Question Paper Management & Generation System".
- **The Question:** Is the platform intended strictly for faculty, reviewers, HODs, and the Controller of Examinations (CoE) for official examination custody, or should students have access to self-service practice test generation?
- **Options Considered:**
  1. *Faculty & Exam Cell Exclusive (Recommended for Phase 1-12):* Focus exclusively on high-stakes official examination authoring, approval, secrecy locking, and print custody.
  2. *Student Self-Service Portal (Future Phase 13):* Add a student portal for practice tests drawing from archived historical papers.
- **Recommendation:** Maintain strict faculty/exam custody focus for the core roadmap.

---

### Q3: Automated Answer-Key & Marking Scheme PDF Compilation
- **Context:** When an examination paper is approved, evaluators require an official answer key and marking rubric.
- **The Question:** Should the PDF generator engine automatically synthesize a companion **Evaluator Answer Key & Scheme of Valuation** PDF alongside every student question paper?
- **Options Considered:**
  1. *Manual Answer Key Creation:* Evaluators write their own keys.
  2. *Automated Companion PDF (Recommended):* The generator automatically extracts the `answer` and `rubric` fields of all selected questions, compiling a password-protected companion PDF (e.g., `QP-2026-001-ANSWER-KEY.pdf`) accessible only to approved evaluators after the exam ends.
- **Recommendation:** Implement automated companion answer-key generation in Phase 9 (PDF & Export).

---

### Q4: Cloud Hosting vs. Air-Gapped On-Premise University Deployment
- **Context:** Some government universities mandate that examination software run on air-gapped on-premise servers inside the university physical data center with zero cloud connectivity.
- **The Question:** Should the deployment architecture assume cloud infrastructure (AWS/GCP) or support containerized on-premise air-gapped deployments?
- **Options Considered:**
  1. *Cloud-Native Only (AWS/GCP):* Relies on AWS KMS, S3, and managed RDS.
  2. *Cloud-Agnostic Containerized Deployment (Recommended):* Use standard Docker containers, MinIO for S3 storage, HashiCorp Vault for KMS, and generic PostgreSQL 16+. Can run on AWS, GCP, Azure, or air-gapped on-premise Linux hardware.
- **Recommendation:** Build cloud-agnostic containers using standard open-source tools (MinIO, PostgreSQL, Redis) so the platform can deploy anywhere.

---

### Q5: Backend Stack Selection: Node.js (NestJS) vs. Python (FastAPI)
- **Context:** The frontend is TypeScript/React. The backend can be implemented in TypeScript/NestJS (unified language across the team) or Python/FastAPI (rich mathematical and algorithmic libraries).
- **The Question:** Which backend framework should be selected for the production REST API and generation engine?
- **Options Considered:**
  1. *Node.js / NestJS with TypeScript (Recommended):* Share TypeScript interfaces between frontend and backend; single language stack; excellent async performance; robust enterprise modularity.
  2. *Python / FastAPI:* Excellent if machine learning or NLP question similarity checks are required in Phase 13.
- **Recommendation:** Use Node.js/NestJS for core API and workflow services, with an optional Python microservice if advanced semantic vector embedding checks are added later.

---

## Current State vs. Proposed State

* **Current State:** Open questions were untracked, creating the risk of silent architectural assumptions.
* **Proposed State:** A transparent open questions register with evaluated options, impact analyses, and clear engineering recommendations.

## Decisions
1. Present these 5 open questions to institutional stakeholders during the Phase 0 architecture alignment review.
2. Default to the documented recommendations until stakeholder feedback specifies otherwise.

## Open Questions
- Stakeholder feedback on Q1-Q5 is pending.

## Related Documents
- [PROJECT_OVERVIEW.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/PROJECT_OVERVIEW.md)
- [ASSUMPTIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ASSUMPTIONS.md)
- [ROADMAP.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ROADMAP.md)
