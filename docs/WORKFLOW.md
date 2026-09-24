# Multi-Role Academic Workflows: QPMS

## Purpose
This document specifies the end-to-end multi-party academic workflows, collaboration patterns, moderation procedures, and approval handovers within the **University Question Paper Management & Generation System**.

## Scope
Covers the three primary academic workflow chains:
1. Question Authoring, Peer Review & Department Approval Workflow.
2. Blueprint Design, Algorithmic Synthesis & Examination Paper Approval Workflow.
3. Secrecy Custody, Print Handover & Reconciliation Workflow.

---

## 1. Workflow 1: Question Bank Authoring & Moderation Chain

```mermaid
sequenceDiagram
    autonumber
    actor Setter as Faculty / Question Setter
    actor Reviewer as Designated Reviewer / Subject Expert
    actor HOD as Head of Department (HOD)
    participant System as QPMS Core Engine

    Setter->>System: Drafts Question (Course, Unit, Text, LaTeX, Marks, Bloom, Answer)
    Setter->>System: Submits Question for Review
    System->>System: Validates Input & Sets Status: SUBMITTED
    System->>Reviewer: Notifies Reviewer of Pending Item
    
    alt Reviewer Rejects Question
        Reviewer->>System: Submits Rejection with Required Comments
        System->>System: Sets Status: REJECTED
        System->>Setter: Notifies Setter of Rejection & Comments
        Setter->>System: Updates Draft & Re-submits
    else Reviewer Approves Question
        Reviewer->>System: Endorses Question & Passes to HOD
        System->>HOD: Adds to HOD Approval Queue
        HOD->>System: Signs Off on Question Version
        System->>System: Sets Status: APPROVED (Locks Version vN)
        System->>System: Question Becomes Eligible in Candidate Pool
    end
```

---

## 2. Workflow 2: Examination Paper Generation & Approval Chain

```mermaid
sequenceDiagram
    autonumber
    actor Setter as Question Paper Setter
    actor Board as Moderation Committee / Scrutinizers
    actor HOD as Head of Department
    actor CoE as Controller of Examinations
    participant Engine as Constraint Solver Engine
    participant System as QPMS Platform

    Setter->>System: Selects Program, Term, Subject & Target Marks
    Setter->>System: Configures Visual Blueprint & Lookback Years
    Setter->>Engine: Initiates Algorithmic Generation
    Engine->>System: Solves Constraints & Synthesizes Sets A, B, C, D
    Setter->>System: Previews Compiled Paper & Submits for Review
    System->>Board: Notifies Moderation Committee
    
    Board->>System: Audits Syllabus Balance & Technical Clarity
    alt Swaps Required
        Board->>System: Swaps Individual Question with Equivalent Bank Item
        System->>Engine: Re-validates Unit & Difficulty Totals
    end
    
    Board->>HOD: Endorses Compiled Sets A-D
    HOD->>System: Formally Signs Paper Approval
    System->>System: Freezes Manifest & Computes SHA-256 Checksum
    System->>CoE: Transfers Custody to Examination Vault
    CoE->>System: Seals Paper (Status: LOCKED)
```

---

## 3. Workflow 3: Secrecy Custody & Exam Day Printing Chain

```mermaid
sequenceDiagram
    autonumber
    actor Officer as Center Print Officer
    actor CoE as Controller of Examinations
    participant Vault as Encrypted Secrecy Vault
    participant PDFWorker as Headless Chromium PDF Worker
    participant Audit as Forensic Audit Logger

    Note over Vault: Paper is Sealed & Encrypted in Vault
    Note over Vault: Time T - 120 Minutes to Exam Start
    Vault->>Officer: Opens Time-Locked Decryption Window
    Officer->>Vault: Authenticates with Password & Hardware MFA
    Vault->>Vault: Validates Center Code & Candidate Quota
    Vault->>PDFWorker: Requests Decrypted Print Buffer
    PDFWorker->>PDFWorker: Injects Diagonal Forensic Watermark + QR Code
    PDFWorker->>Audit: Records Print Action (User, IP, Time, Copy Count)
    PDFWorker-->>Officer: Streams Watermarked PDF to Secure Printer
    Note over Officer: Physical Paper Distributed to Exam Halls
```

---

## Current State vs. Proposed State

* **Current State:** Basic UI buttons exist in [ApprovalsView.tsx](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/src/components/approvals/ApprovalsView.tsx) that update in-memory status strings. There are no multi-step state guards, no notification triggers, and no separation between moderation and secrecy custody.
* **Proposed State:** Fully orchestrated multi-party workflows powered by an event-driven architecture with email/push notifications, role-based transitions, and audit-logged handovers.

## Decisions
1. Enforce three distinct stages of approval: Peer Review $\rightarrow$ HOD Endorsement $\rightarrow$ CoE Secrecy Locking.
2. Require mandatory textual improvement comments for every rejected question or paper.

## Open Questions
- None.

## Related Documents
- [ROLES_PERMISSIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ROLES_PERMISSIONS.md)
- [QUESTION_LIFECYCLE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_LIFECYCLE.md)
- [QUESTION_PAPER_LIFECYCLE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_PAPER_LIFECYCLE.md)
- [AUDIT_LOGGING.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/AUDIT_LOGGING.md)
