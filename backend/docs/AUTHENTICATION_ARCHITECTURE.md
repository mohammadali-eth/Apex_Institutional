# Phase 2 Authentication Architecture & Threat Model

## 1. Executive Summary

Phase 2 implements the **User Identity, Cryptographic Session Management, and Authentication Boundary** for the Question Paper Management System (QPMS). This architecture provides hardened, enterprise-grade authentication without introducing premature role-based access control (RBAC), complex JWT orchestration, or third-party identity dependencies.

---

## 2. Threat Model & Security Posture

### 2.1 Assets Under Protection
1. **User Identity Credentials:** Passwords, password reset digests, email verification tokens.
2. **Session Authenticity:** Active user sessions granting authenticated API access.
3. **Audit History:** Tamper-evident, privacy-preserving audit events of authentication lifecycle events.
4. **Institutional Integrity:** Ensuring only legitimate, active, verified users interact with sensitive examination subsystems.

### 2.2 Attack Vectors & Mitigations

| Threat Vector | Potential Impact | Defensive Architecture Mitigation |
| :--- | :--- | :--- |
| **Credential Stuffing / Brute Force** | Account takeover, credential testing | Argon2id hashing, IP- and account-based rate limiting, constant-time verification, generic auth failure messages. |
| **Session Hijacking / Sniffing** | Unauthorized access to authenticated state | Cryptographically random 256-bit opaque tokens, `HttpOnly`, `Secure`, `SameSite=Lax`, `__Host-` prefix in production. Only SHA-256 token digests stored in PostgreSQL. |
| **Session Fixation** | Re-using pre-authentication session tokens | Session rotation on login and password modification. Old session tokens revoked atomically. |
| **Cross-Site Request Forgery (CSRF)** | State-changing actions triggered via malicious sites | Double-submit CSRF cookies (`X-CSRF-Token` header validation) paired with strict Origin/Referer verification on state-changing mutation endpoints. |
| **Token Replay / Leakage** | Stolen reset or verification tokens reused | Tokens are cryptographically random, single-use, time-limited, and stored as SHA-256 digests. Consumed atomically in transactional DB writes. |
| **Account Enumeration** | Attackers map valid emails via login or forgot-password responses | Constant-time response behaviors, generic responses on password reset and verification resend ("If the account exists, an email has been sent"). |
| **Denial of Service via Password Hashing** | Flooding backend with ultra-long passwords to exhaust CPU/memory | Strict maximum password length limit (128 bytes) enforced before Argon2id processing. |
| **Audit Log Contamination / Leaks** | Passwords or session tokens leaked into logs | Sanitized audit logging schema: strictly records event types, sanitized request IP, client agent, and user ID without credentials or session cookies. |

---

## 3. Technology Stack & Protocol Specifications

- **Password Algorithm:** Argon2id (`time_cost=3`, `memory_cost=65536` KiB, `parallelism=4`, `hash_len=32`, `salt_len=16`).
- **Session Tokens:** 32-byte CSPRNG (`secrets.token_urlsafe(32)`), stored as hexadecimal SHA-256 digests.
- **Session Cookies:**
  - Name: `__Host-qpms_session` (Production HTTPS) / `qpms_session` (Local development HTTP fallback).
  - Flags: `HttpOnly=True`, `Secure=True` (prod), `SameSite=Lax`, `Path=/`.
- **CSRF Tokens:**
  - Name: `qpms_csrf`.
  - Header: `X-CSRF-Token`.
  - Cookie: `HttpOnly=False`, `Secure=True` (prod), `SameSite=Lax`, `Path=/`.
- **Persistence:** PostgreSQL 16 via SQLAlchemy 2.0 (asyncio + asyncpg) managed via Alembic.

---

## 4. Architectural Boundaries

- **Authentication vs. Authorization:**
  - Authentication confirms *who* a user is (`User.id`, `User.status`).
  - Authorization (RBAC, institutional memberships, department courses) is explicitly segregated for subsequent phases. The user identity model provides foreign-key-ready UUIDs without coupling to domain concepts.
- **Stateless Front-End, Stateful Back-End:**
  - The browser stores NO session tokens in `localStorage` or `sessionStorage`.
  - All session resolution happens on backend validation of the HttpOnly session cookie against PostgreSQL `user_sessions`.
