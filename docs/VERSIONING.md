# Versioning & Immutability Architecture: QPMS

## Purpose
This document specifies the bitemporal versioning architecture, question mutation semantics, and historic examination snapshotting protocols for the **University Question Paper Management & Generation System**.

## Scope
Governs data versioning across Question Bank items, Curriculum Schemes, Blueprints, Question Papers, and historical exam reproductions.

---

## 1. Core Architectural Invariant: Historical Non-Destruction

In university accreditation reviews (e.g., NAAC, NBA, ABET) or student grade appeals, examiners must inspect the **exact examination paper administered on that date**.

The QPMS enforces an absolute architectural invariant:
> **NO APPROVED QUESTION OR FINALIZED QUESTION PAPER MAY EVER BE MUTATED IN PLACE.**

```mermaid
graph TD
    Root[Question Root: Q-1024]
    Root --> V1[v1: Created 2024 | Approved | Used in Exam 2024-25]
    Root --> V2[v2: Edited 2025 | Typo Fixed | Approved | Used in Exam 2025-26]
    Root --> V3[v3: Edited 2026 | New Marks / Option D | Draft / Pending Review]

    Paper2024[Exam Paper 2024-25] -->|Permanently References| V1
    Paper2025[Exam Paper 2025-26] -->|Permanently References| V2
    FuturePaper[Future Exam Paper 2026-27] -.->|Will Use when Approved| V3
```

---

## 2. Bitemporal Versioning Model

Entities subject to evolution over time (Curriculums and Questions) track two distinct time axes:
1. **Valid Time (Real-World Academic Validity):** The academic session during which the version is active (e.g., `academic_year = '2025-26'`).
2. **Transaction Time (System Recording Time):** The physical database timestamp when the row was committed (`created_at`).

### 2.1 Question Versioning Schema Representation
- `question_roots`: Holds permanent identity.
- `question_versions`:
  - `version_number`: Monotonically increasing integer ($1, 2, 3\dots$).
  - `is_current_active`: Boolean indicating the latest approved version used by default in candidate pools.
  - `superseded_at`: Timestamp when a newer version achieved approval.

---

## 3. Paper Snapshotting Protocol (The Frozen Manifest)

When a question paper is marked `APPROVED`, the system executes an automated freeze routine:
1. Resolves every question in the paper down to its exact `question_version_id`.
2. Compiles a standalone, self-contained JSON manifest:
   - Complete question text and diagram URLs.
   - Exact option sequence for that specific set (Sets A, B, C, D).
   - Expected answer keys and marking rubrics.
   - Course, Department, and University metadata.
3. Computes the SHA-256 checksum of the manifest string.
4. Stores the record in `paper_snapshots`:
   ```sql
   INSERT INTO paper_snapshots (paper_id, manifest_payload, sha256_hash, sealed_at)
   VALUES ('QP-2026-001', :manifestJson, :sha256Hex, NOW());
   ```

### Historical Reproduction Guarantee
Even if a course is deleted, syllabus units reorganized, or original authors leave the university 8 years later, the paper render engine queries `paper_snapshots.manifest_payload` directly, rendering an exact pixel-perfect duplicate of the paper printed on exam day.

---

## Current State vs. Proposed State

* **Current State:** Basic version numbers are incremented in `src/services/questionService.ts`, and paper questions reference versions in a client array. No database-backed manifest freezing or cryptographic integrity validation exists.
* **Proposed State:** A formal bitemporal versioning architecture with immutable version rows, zero in-place mutations of approved assets, and cryptographic JSON snapshotting.

## Decisions
1. Direct all paper question foreign keys to `question_versions.id` rather than parent `question_roots.id`.
2. Generate an immutable, self-contained JSON manifest upon paper approval to insulate historical archives against future schema migrations.

## Open Questions
- None.

## Related Documents
- [QUESTION_LIFECYCLE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_LIFECYCLE.md)
- [QUESTION_PAPER_LIFECYCLE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_PAPER_LIFECYCLE.md)
- [ADR-003-question-versioning-strategy.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-003-question-versioning-strategy.md)
- [ADR-004-question-paper-versioning-strategy.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-004-question-paper-versioning-strategy.md)
