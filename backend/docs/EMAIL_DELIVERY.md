# Outbound Email Delivery Architecture

## 1. Provider Boundary & Architecture

Outbound transactional emails (such as email verification and password recovery) are abstracted through the `BaseEmailProvider` interface:

- `EmailService` resolves the configured provider from `settings.email_delivery_provider`.
- Supported development providers:
  - `console`: Pretty-prints formatted message to stdout/logger.
  - `file`: Appends messages to `data/emails.log` for automated/manual inspection without polluting terminals.
- **Production Safety:**
  - In production (`app_env == "production"`), the development sinks refuse to simulate deliveries and log honest configuration errors.
  - No recovery URLs or raw reset tokens are logged to unauthenticated HTTP response bodies.

---

## 2. Token Security in Emails

1. Tokens generated for emails are cryptographically randomized strings (`secrets.token_urlsafe(32)`).
2. The database stores ONLY the SHA-256 digest (`token_hash`).
3. Single-use and time-bound:
   - Verification tokens expire in 24 hours.
   - Password reset tokens expire in 30 minutes.
   - Upon consumption, `consumed_at` is updated atomically, preventing token replay.
