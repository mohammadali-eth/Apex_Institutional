# Architectural & Product Assumptions: QPMS

## Purpose
This document catalogs the explicit product, technical, organizational, and operational assumptions underlying the architectural design and implementation roadmap of the **University Question Paper Management & Generation System**.

## Scope
Covers assumptions regarding infrastructure availability, network connectivity, user behaviors, institutional governance, and technical dependencies.

---

## 1. Technical & Infrastructure Assumptions

| Assumption ID | Category | Statement of Assumption | Impact if Invalid |
| :--- | :--- | :--- | :--- |
| **ASM-TECH-01** | **Database** | PostgreSQL 16+ is available in the deployment environment with support for UUIDs and Row-Level Security. | If constrained to legacy MySQL or SQLite, RLS and advanced JSONB indexing must be rewritten in application middleware. |
| **ASM-TECH-02** | **PDF Workers** | The deployment cluster can host headless Chromium worker pods with at least 2 GB RAM per instance. | If memory is severely constrained, server-side PDF compilation must be replaced with a lightweight alternative. |
| **ASM-TECH-03** | **Network** | Examination centers possess reliable internet connectivity at least 2 hours prior to scheduled exam start times. | If remote centers are completely offline, a secure offline cryptographic token/USB handover protocol must be introduced. |
| **ASM-TECH-04** | **Browser Standards** | Faculty and administrators access the web application via modern evergreen browsers (Chrome, Edge, Firefox, Safari $\ge$ 2022 versions). | If legacy IE11 or ancient browsers must be supported, modern CSS flex/grid and ES2022 features must be polyfilled. |

---

## 2. Product & Domain Assumptions

| Assumption ID | Category | Statement of Assumption | Impact if Invalid |
| :--- | :--- | :--- | :--- |
| **ASM-PROD-01** | **Academic Hierarchy** | The sequence `Institution -> Faculty -> Department -> Program -> Curriculum -> Term -> Course -> Unit` sufficiently covers collegiate structures. | If an institution introduces intermediate tiers (e.g., Campus Centers), the entity model must be expanded. |
| **ASM-PROD-02** | **Question Re-use** | Once an approved question is modified, historical papers referencing its earlier version should remain permanently linked to the earlier version. | If academic boards demand retroactive updates to historic papers (violating audit laws), a policy override must be built. |
| **ASM-PROD-03** | **Lookback Policy** | Historical lookback avoidance over a 1 to 5-year window is sufficient to prevent rote memorization and predictability. | If an institution requires cross-subject lookback or infinite lookback, candidate pool starvation will occur. |
| **ASM-PROD-04** | **Student Access** | The core QPMS platform is strictly for faculty, reviewers, HODs, and Exam Cells. Students do NOT log in to view papers before exams. | If student mock test functionality is required, a separate public student portal and grading engine must be architected. |

---

## 3. Organizational & Governance Assumptions

| Assumption ID | Category | Statement of Assumption | Impact if Invalid |
| :--- | :--- | :--- | :--- |
| **ASM-ORG-01** | **HOD Authority** | The Head of Department (HOD) or designated board chair possesses ultimate academic authority to approve papers before sealing. | If approval requires multi-campus voting or consensus quorum, the workflow engine must support multi-signature sign-offs. |
| **ASM-ORG-02** | **Subject Assignment** | Department administrators will maintain up-to-date mappings of which teachers are assigned to which departments and subjects. | If teachers author questions across unauthorized departments, departmental boundaries will be challenged. |

---

## Current State vs. Proposed State

* **Current State:** Assumptions were undocumented and implicitly embedded in code comments (e.g., hardcoded department lists, hardcoded semester numbers).
* **Proposed State:** A formal assumptions register documenting every technical, operational, and organizational baseline, with clear risk assessments should any assumption be invalidated.

## Decisions
1. Base all future database DDL and API contracts on the validity of assumptions ASM-TECH-01 through ASM-PROD-04.
2. Review this assumptions register at the inception of each development phase.

## Open Questions
- None.

## Related Documents
- [OPEN_QUESTIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/OPEN_QUESTIONS.md)
- [RISKS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/RISKS.md)
- [PROJECT_OVERVIEW.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/PROJECT_OVERVIEW.md)
