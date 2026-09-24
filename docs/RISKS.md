# Architectural & Operational Risk Register: QPMS

## Purpose
This document identifies, analyzes, and outlines mitigation strategies for technical, architectural, operational, security, and academic compliance risks facing the **University Question Paper Management & Generation System**.

## Scope
Covers risks spanning examination confidentiality, algorithmic generation failures, database scalability, multi-tenancy leakage, academic adoption resistance, and legal/statutory compliance.

---

## 1. Risk Assessment Matrix

```mermaid
quadrantChart
    title Risk Severity & Likelihood Matrix
    x-axis Low Likelihood --> High Likelihood
    y-axis Low Impact --> High Impact
    quadrant-1 High Impact / High Likelihood (Urgent Action)
    quadrant-2 High Impact / Low Likelihood (Strict Contingency)
    quadrant-3 Low Impact / Low Likelihood (Monitor)
    quadrant-4 Low Impact / High Likelihood (Standard Mitigations)

    "R-01: Examination Paper Leak": [0.35, 0.95]
    "R-02: Generator Solver Timeout": [0.65, 0.85]
    "R-03: Cross-Tenant Data Contamination": [0.20, 0.90]
    "R-04: Insufficient Question Bank Pool": [0.80, 0.75]
    "R-05: Missing Complex Script Glyphs": [0.60, 0.50]
    "R-06: Browser Storage Data Loss": [0.85, 0.65]
    "R-07: Faculty Resistance to Strict Moderation": [0.75, 0.60]
    "R-08: Legal Non-Repudiation Failure": [0.25, 0.80]
```

---

## 2. Detailed Risk Register & Mitigations

### 2.1 Security & Confidentiality Risks

#### `R-01`: Examination Paper Confidentiality Breach (Paper Leak)
- **Likelihood:** Medium | **Impact:** Catastrophic | **Risk Score:** Critical
- **Scenario:** A faculty member's account is compromised, or an insider with database access dumps active question papers prior to exam morning.
- **Impact:** Cancellation of university-wide examinations, severe reputational damage, legal liability.
- **Mitigation Strategy:**
  1. Mandatory Multi-Factor Authentication (MFA) for all users with review or exam privileges.
  2. Envelope encryption on all `LOCKED` papers using AWS KMS / HashiCorp Vault.
  3. Time-locked decryption APIs strictly prohibiting pre-exam decryption until $T - 120$ minutes.
  4. Dynamic forensic watermarks stamping the officer's name, user ID, IP address, and timestamp on every printed page.

#### `R-03`: Cross-Tenant or Cross-Department Data Contamination
- **Likelihood:** Low | **Impact:** Critical | **Risk Score:** High
- **Scenario:** A software bug in an API endpoint allows College A to query and inspect exam questions drafted by College B.
- **Mitigation Strategy:**
  1. Enforce PostgreSQL Row-Level Security (RLS) directly at the database engine level.
  2. Automatically inject tenant context from cryptographically signed JWT tokens, disallowing client-provided tenant parameters.

---

### 2.2 Algorithmic & Operational Risks

#### `R-02`: Combinatorial Explosion / Generator Solver Timeout
- **Likelihood:** High | **Impact:** High | **Risk Score:** High
- **Scenario:** Faculty configures tight constraints (e.g., specific Bloom levels, narrow difficulty tolerances, multiple units) and the backtracking algorithm enters an exponential loop, freezing the server.
- **Mitigation Strategy:**
  1. Set a hard solver timeout of **3,000 milliseconds**.
  2. Use linear-time $O(N)$ stratified candidate bucketing and forward-checking to prune non-viable branches immediately.
  3. If no combination is found within 3 seconds, terminate and return a detailed **Deficit Diagnostic Matrix** rather than looping.

#### `R-04`: Question Bank Pool Starvation (Insufficient Questions)
- **Likelihood:** High | **Impact:** Medium | **Risk Score:** High
- **Scenario:** Faculty attempts to generate a 100-mark paper for a new subject where only 12 questions have been approved in the bank.
- **Mitigation Strategy:**
  1. Pre-generation validation check validating pool sufficiency before launching the solver.
  2. Clear in-wizard diagnostic alerts (Requirement #29) displaying exact shortfall by unit and question type.
  3. Provide an option for HODs to relax difficulty tolerances or draft required questions directly.

---

### 2.3 Compliance & Forensic Risks

#### `R-08`: Legal Inability to Prove Historical Paper Authenticity (Non-Repudiation Failure)
- **Likelihood:** Low | **Impact:** High | **Risk Score:** High
- **Scenario:** A student challenges an examination question in high court; the university cannot prove the exact wording approved by the moderation board due to in-place edits.
- **Mitigation Strategy:**
  1. Absolute prohibition of in-place edits on approved questions.
  2. Frozen, cryptographically signed JSON manifest in `paper_snapshots` with SHA-256 integrity hash.
  3. Append-only audit logging with Merkle hash chaining and WORM storage retention for 10 years.

---

## Current State vs. Proposed State

* **Current State:** The client prototype is exposed to almost all high-severity risks: unencrypted localStorage, vulnerable to client manipulation, no MFA, no real solver timeout guards, and no audit trail.
* **Proposed State:** A comprehensive defense-in-depth risk management matrix with technical mitigations engineered into the database, API middleware, cryptographic services, and algorithmic solvers.

## Decisions
1. Treat paper confidentiality and tenant isolation as P0 non-negotiable architectural constraints.
2. Terminate generation solver execution after 3,000 ms with an actionable deficit diagnostic report.

## Open Questions
- None.

## Related Documents
- [GAP_ANALYSIS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/GAP_ANALYSIS.md)
- [SECURITY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/SECURITY.md)
- [QUESTION_PAPER_GENERATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_PAPER_GENERATION.md)
