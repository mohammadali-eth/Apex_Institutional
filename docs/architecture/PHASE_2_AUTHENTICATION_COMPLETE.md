# Phase 2 — Secure Authentication & User Identity Completion Report

**Project:** Apex Question Paper Management System (QPMS)  
**Phase:** Phase 2 (Authentication + User Identity + Secure Session Management)  
**Status:** COMPLETED & VERIFIED  
**Date:** October 2026  

---

## 1. Executive Summary & Implemented Features

Phase 2 implements the **User Identity, Cryptographic Session Management, and Authentication Boundary** for QPMS. This security architecture replaces stateless JWT complexity and client-side token storage with server-managed, opaque PostgreSQL sessions, Argon2id credential protection, and double-submit CSRF defenses.

### Implemented Capabilities:
- **Server-Managed Opaque Sessions:** Cryptographically secure 256-bit random tokens (`secrets.token_urlsafe(32)`); only SHA-256 digests persisted in PostgreSQL.
- **HttpOnly Cookie Delivery:** Session tokens transmitted exclusively via `HttpOnly`, `SameSite=Lax`, `Secure` cookies with automatic `__Host-` prefix in production HTTPS.
- **Argon2id Password Security:** Parameterized password hashing (`time_cost=3`, `memory_cost=64MiB`, `parallelism=4`) aligned with NIST SP 800-63B guidelines.
- **CSRF Defense Foundation:** Double-submit cookie pattern (`qpms_csrf` cookie + `X-CSRF-Token` header) paired with Origin and Referer validation on state-changing requests.
- **Single-Use Recovery & Verification Tokens:** Cryptographic digests for email verification and password reset; atomic single-use consumption and replay prevention.
- **Sliding-Window Rate Limiting:** Abuse protection on login and recovery endpoints with `Retry-After` headers.
- **Audit Logging:** Structured, tamper-evident audit events for all authentication lifecycle events without persisting passwords, tokens, or PII.
- **Account Lifecycle Enforcement:** Explicit account statuses (`pending_verification`, `active`, `locked`, `disabled`) with immediate session revocation on status changes.
- **Seamless Next.js Frontend Integration:** Integrated into existing `AuthProvider` and `LoginPage` with zero localStorage token usage, preserving demo fallback.

---

## 2. Database Schema & Alembic Migrations

All tables are versioned and managed through Alembic revision `20261012_0001` (`create_auth_tables.py`).

### Table Inventory:

1. **`users`**:
   - `id`: UUID (Primary Key, default `uuid.uuid4`)
   - `email`: VARCHAR(255) (Unique, lowercase normalized index)
   - `password_hash`: VARCHAR(255) (Argon2id format string)
   - `status`: VARCHAR(32) (`pending_verification`, `active`, `locked`, `disabled`)
   - `email_verified_at`: TIMESTAMP WITH TIME ZONE (nullable)
   - `last_login_at`: TIMESTAMP WITH TIME ZONE (nullable)
   - `password_changed_at`: TIMESTAMP WITH TIME ZONE (nullable)
   - `disabled_at`: TIMESTAMP WITH TIME ZONE (nullable)
   - `created_at`: TIMESTAMP WITH TIME ZONE (server default `now()`)
   - `updated_at`: TIMESTAMP WITH TIME ZONE (server default `now()`)

2. **`user_sessions`**:
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (Foreign Key -> `users.id` ON DELETE CASCADE, indexed)
   - `token_hash`: VARCHAR(64) (SHA-256 hexadecimal digest, unique index)
   - `created_at`: TIMESTAMP WITH TIME ZONE
   - `expires_at`: TIMESTAMP WITH TIME ZONE (indexed)
   - `last_activity_at`: TIMESTAMP WITH TIME ZONE
   - `revoked_at`: TIMESTAMP WITH TIME ZONE (nullable, indexed)
   - `ip_address`: VARCHAR(45) (nullable)
   - `user_agent`: VARCHAR(512) (nullable)
   - Composite Index: `(token_hash, revoked_at, expires_at)`

3. **`email_verification_tokens`**:
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (Foreign Key -> `users.id` ON DELETE CASCADE, indexed)
   - `token_hash`: VARCHAR(64) (SHA-256 hexadecimal digest, unique index)
   - `created_at`: TIMESTAMP WITH TIME ZONE
   - `expires_at`: TIMESTAMP WITH TIME ZONE (24-hour default)
   - `consumed_at`: TIMESTAMP WITH TIME ZONE (nullable)
   - Composite Index: `(token_hash, consumed_at, expires_at)`

4. **`password_reset_tokens`**:
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (Foreign Key -> `users.id` ON DELETE CASCADE, indexed)
   - `token_hash`: VARCHAR(64) (SHA-256 hexadecimal digest, unique index)
   - `created_at`: TIMESTAMP WITH TIME ZONE
   - `expires_at`: TIMESTAMP WITH TIME ZONE (30-minute default)
   - `consumed_at`: TIMESTAMP WITH TIME ZONE (nullable)
   - Composite Index: `(token_hash, consumed_at, expires_at)`

5. **`authentication_audit_events`**:
   - `id`: UUID (Primary Key)
   - `event_type`: VARCHAR(64) (indexed)
   - `user_id`: UUID (nullable, indexed)
   - `timestamp`: TIMESTAMP WITH TIME ZONE (indexed)
   - `ip_address`: VARCHAR(45) (nullable)
   - `user_agent`: VARCHAR(512) (nullable)
   - `request_id`: VARCHAR(64) (nullable, indexed)
   - `details`: VARCHAR(1024) (sanitized, non-enumerating)

### Migration Commands:
```bash
# Review offline SQL generation without connecting:
alembic upgrade head --sql

# Check current revision:
alembic current

# Apply migration to target database:
alembic upgrade head

# Rollback migration if necessary:
alembic downgrade -1
```

---

## 3. Endpoint Inventory

Mounted under the versioned prefix `/api/v1/auth`:

| Method | Path | Auth Required | CSRF Required | Rate Limited | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/auth/csrf` | No | No | No | Issues fresh CSRF token and sets `qpms_csrf` cookie |
| `POST` | `/api/v1/auth/login` | No | No | Yes (5 / 5m) | Authenticates credentials; sets `HttpOnly` session cookie |
| `POST` | `/api/v1/auth/logout` | Yes | Yes | No | Revokes active session and clears session cookie |
| `POST` | `/api/v1/auth/logout-all` | Yes | Yes | No | Revokes all active sessions for current user |
| `GET` | `/api/v1/auth/me` | Yes | No | No | Returns safe user identity schema |
| `POST` | `/api/v1/auth/change-password` | Yes | Yes | No | Modifies password, revokes existing sessions, rotates session |
| `POST` | `/api/v1/auth/forgot-password` | No | No | Yes (3 / 15m) | Dispatches recovery token; enumeration resistant |
| `POST` | `/api/v1/auth/reset-password` | No | No | Yes (3 / 15m) | Consumes single-use token; resets password and revokes sessions |
| `POST` | `/api/v1/auth/verify-email` | No | No | No | Consumes verification token; activates account |
| `POST` | `/api/v1/auth/resend-verification` | No | No | Yes (3 / 15m) | Dispatches fresh verification token; enumeration resistant |

---

## 4. Session Design & Lifecycle

1. **Opaque Tokens:** CSPRNG tokens generated via `secrets.token_urlsafe(32)`. Raw token strings exist in memory only during token issuance and validation.
2. **Database Persistence:** PostgreSQL stores solely `hash_token(raw_token)` (SHA-256). In the event of a database dump or read replica breach, active sessions cannot be spoofed.
3. **Dual Timeout Boundaries:**
   - **Absolute Expiration (`expires_at`):** Hard limit (default 24 hours).
   - **Idle Inactivity Timeout (`last_activity_at`):** Sliding inactivity limit (default 60 minutes).
4. **Immediate Invalidation Scenarios:**
   - User logout (`/logout`)
   - Global logout (`/logout-all`)
   - Password change or reset (all active sessions revoked)
   - Account status transition to `disabled` or `locked`
5. **Anti-Fixation Rotation:** When logging in or changing passwords, existing sessions on the client are revoked and replaced with freshly minted tokens.

---

## 5. Password Security & NIST SP 800-63B Alignment

- **Algorithm:** Argon2id (`time_cost=3`, `memory_cost=65536` KiB, `parallelism=4`, `salt_len=16`, `hash_len=32`).
- **Length Boundaries:** Minimum 12 characters; maximum 128 characters (mitigating CPU exhaustion attacks).
- **Composition Rules:** Avoids arbitrary composition requirements (e.g. forced symbols/numbers) to encourage long, memorable passphrases.
- **Common Password Rejection:** Rejects common dictionary terms and weak passphrases.
- **Timing Attack Mitigation:** Executes constant-time dummy verification (`verify_dummy_password()`) when an email is not found, ensuring uniform response times across valid and invalid identities.
- **No Plaintext Retention:** Passwords are never logged or stored unhashed.

---

## 6. Cookie & CSRF Architecture

### Cookie Flags:
- **Session Cookie:**
  - Name: `__Host-qpms_session` (Production HTTPS) / `qpms_session` (Local dev HTTP)
  - `HttpOnly`: `True` (Inaccessible to client-side scripts)
  - `Secure`: `True` in production (enforced at startup)
  - `SameSite`: `Lax`
  - `Path`: `/`
- **CSRF Cookie:**
  - Name: `qpms_csrf`
  - `HttpOnly`: `False` (Readable by frontend client to populate `X-CSRF-Token` header)
  - `Secure`: `True` in production
  - `SameSite`: `Lax`
  - `Path`: `/`

### CSRF Defense Strategy:
- State-changing requests (`POST`, `PUT`, `DELETE`, `PATCH`) with active sessions require both:
  1. Origin/Referer matching against `cors_origins`.
  2. Constant-time digest comparison (`secrets.compare_digest`) between the `X-CSRF-Token` header and the `qpms_csrf` cookie.

---

## 7. Rate Limiting & Abuse Defense

- **Sliding-Window Limiter:** Tracks IP and action timestamps.
- **Login Defense:** 5 attempts per 5-minute sliding window per IP. Exceeding limit returns `HTTP 429 Too Many Requests` with a dynamic `Retry-After` header.
- **Recovery Defense:** 3 attempts per 15-minute sliding window on password reset and verification resend.
- **No Permanent Account Lockouts:** Prevents denial-of-service against legitimate users while throttling automated credential stuffing.

---

## 8. Outbound Email Delivery Status

- **Provider Boundary:** Abstracted via `BaseEmailProvider` (`app.services.email.base`).
- **Configurable Sinks:**
  - `console`: Pretty-prints formatted emails to stdout during local development.
  - `file`: Records emails to `data/emails.log` for automated verification.
  - `disabled`: Honest no-op.
- **Production Guard:** If `app_env == "production"` and a development sink is invoked, delivery fails safely with an explicit error. No raw tokens or recovery links are leaked in HTTP responses.

---

## 9. Frontend Integration

- **Auth Service Client:** Implemented in `frontend/src/lib/services/authService.ts`. Communicates via `credentials: 'include'` with automatic CSRF token management.
- **Zero Browser Storage:** Session tokens are never saved to `localStorage` or `sessionStorage`.
- **Auth Provider:** `frontend/src/providers/AuthProvider.tsx` probes `/api/v1/auth/me` on mount. If an active session cookie exists, user state is restored automatically.
- **Demo Fallback Preserved:** When backend is disconnected, the frontend falls back gracefully to local demo state, ensuring UI testing and prototyping continue uninterrupted.

---

## 10. Security Controls Summary

| Security Risk | Mitigation Implemented |
| :--- | :--- |
| **Credential Stuffing** | Argon2id + Sliding-window IP rate limiting + Generic 401 messages |
| **Session Hijacking** | 256-bit CSPRNG tokens + `HttpOnly` + `Secure` + `__Host-` prefix |
| **Database Compromise** | Only SHA-256 token digests stored in PostgreSQL |
| **Session Fixation** | Token rotation on login and password update |
| **Cross-Site Request Forgery** | Double-submit CSRF cookie + `X-CSRF-Token` header + Origin/Referer validation |
| **Account Enumeration** | Constant-time dummy verification + Identical messages on forgot-password |
| **Token Replay** | Atomic token consumption (`consumed_at = now()`) in transactional writes |
| **DoS via Password Hashing** | 128-character maximum length limit enforced before hashing |
| **Audit Log PII Leakage** | Sanitized event details; no raw passwords, tokens, or cookies recorded |

---

## 11. Test Results

### Test Execution:
```text
tests/unit/test_security.py:
  test_argon2id_hash_and_verify_success               PASSED
  test_argon2id_verify_failure                        PASSED
  test_verify_dummy_password_does_not_raise           PASSED
  test_password_policy_minimum_length                 PASSED
  test_password_policy_maximum_length                 PASSED
  test_password_policy_rejects_common_passwords       PASSED
  test_password_policy_accepts_secure_passphrase      PASSED
  test_email_normalization                           PASSED
  test_token_generation_and_hashing                   PASSED

tests/unit/test_session_service.py:
  test_create_and_validate_session                    PASSED
  test_session_absolute_expiration                    PASSED
  test_session_idle_inactivity_expiration             PASSED
  test_session_revocation                             PASSED
  test_revoke_all_user_sessions                       PASSED
  test_session_rotation                               PASSED
  test_disabled_user_session_rejection                PASSED

tests/integration/test_auth_endpoints.py:
  test_get_csrf_token                                 PASSED
  test_login_success_and_cookies                      PASSED
  test_login_invalid_password                         PASSED
  test_login_disabled_account_rejected                PASSED
  test_get_me_authenticated                           PASSED
  test_get_me_unauthenticated                         PASSED
  test_csrf_protection_on_state_changing_request      PASSED
  test_change_password_with_valid_csrf                PASSED
  test_logout_revokes_session                         PASSED
  test_forgot_password_enumeration_resistance         PASSED
  test_password_recovery_and_reset_flow               PASSED
  test_email_verification_flow                        PASSED
  test_login_rate_limiting                            PASSED
  test_login_locked_account_rejected                  PASSED
  test_logout_all_endpoint                            PASSED
  test_resend_verification_endpoint                   PASSED
  test_absence_of_secrets_in_responses                PASSED
  test_cors_preflight_and_headers                     PASSED
  test_user_email_uniqueness_db_constraint            PASSED
  test_user_foreign_key_cascades                      PASSED
  test_production_security_validation                 PASSED

Total Passed: 41 / 41 (100%) in 8.70s
```

---

## 12. Build and Lint Results

- **Backend Linting (Ruff):** `ruff check .` -> **0 errors, all checks passed**
- **Backend Type Analysis (Mypy):** `mypy app` -> **Success: no issues found in 39 source files**
- **Frontend TypeScript Validation (tsc):** `tsc --noEmit` -> **0 errors**
- **Frontend Production Build (Next.js):** `npm run build` -> **Compiled successfully; 28/28 routes generated**

---

## 13. Known Limitations

- **Rate Limiting Persistence:** The current rate limiter is an in-memory sliding-window limiter suitable for single-process development. Horizontally-scaled production deployments require a shared store or reverse-proxy/API gateway rate limiting (e.g. NGINX, Cloudflare).
- **Email Delivery:** Development environments utilize `console` or `file` sinks. Production requires configuring an SMTP or transactional email provider.

---

## 14. Production Configuration Requirements

At application startup in production (`app_env="production"`):
1. `SECRET_KEY` must be set to a cryptographically secure string of at least 32 characters (enforced via fail-fast validation in `main.py`).
2. `AUTH_SESSION_COOKIE_SECURE` defaults to `True`.
3. `auth_session_cookie_name` automatically enforces the `__Host-` prefix (`__Host-qpms_session`).
4. `CORS_ORIGINS` must list only trusted institutional HTTPS domains.

---

## 15. Explicitly Deferred Features (Phase 3+)

In strict accordance with Phase 2 scope boundaries, the following were intentionally deferred:
- Full RBAC role hierarchies and permission assignments
- Institutional and departmental memberships
- Multi-factor authentication (MFA / WebAuthn)
- Distributed Redis caching and token stores
- Administrative audit log management UI
