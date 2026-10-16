# Server-Managed Opaque Session Architecture

## 1. Session Strategy & Lifecycles

The QPMS session management operates on **stateful, opaque, database-backed sessions** rather than stateless JWTs:

1. **Generation:** When a user successfully authenticates, the backend generates a 32-byte (256-bit) cryptographically random URL-safe token using `secrets.token_urlsafe(32)`.
2. **Digest Persistence:** The token is hashed with SHA-256 (`hash_token()`). Only the hexadecimal digest is saved in the `user_sessions` table in PostgreSQL.
3. **Transmission:** The raw token is returned to the client exclusively in an `HttpOnly`, `SameSite=Lax` cookie (`__Host-qpms_session` in production). Raw tokens are NEVER embedded in response JSON or stored in browser `localStorage`.

---

## 2. Expiration & Timeout Rules

Every session enforces two independent timeouts:
- **Absolute Expiration (`expires_at`):** Defaults to 24 hours from session creation. Once reached, the session is expired regardless of user activity.
- **Idle Inactivity Timeout (`last_activity_at`):** Defaults to 60 minutes. If no requests are received within this sliding window, the session is revoked.
- **Activity Updates:** On valid authenticated requests, `last_activity_at` is updated in the database.

---

## 3. Revocation & Invalidation

- **User Logout:** The active session is marked `revoked_at = NOW()` and the cookie is deleted.
- **Logout From All Sessions:** All active sessions associated with `user.id` have `revoked_at` set to `NOW()`.
- **Password Modification / Account Recovery:** Triggering a password change or password reset immediately revokes all existing sessions to terminate any unauthorized or compromised sessions.
- **Disabled / Locked Accounts:** If an account status is updated to `disabled` or `locked`, subsequent session lookups immediately reject the request and mark the session as revoked.

---

## 4. Session Rotation

When sensitive security events occur (such as re-authentication or privilege elevation), session tokens are rotated:
1. The old session is revoked.
2. A new session record is created with a newly generated random token.
3. The new token is set in the client's cookie, preserving continuity while mitigating fixation attacks.
