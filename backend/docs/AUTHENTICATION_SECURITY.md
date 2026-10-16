# Authentication Security & Credential Protection

## 1. Password Security Standards

The QPMS authentication system enforces modern credential security aligned with **NIST Special Publication 800-63B (Digital Identity Guidelines: Authentication and Lifecycle Management)**.

### 1.1 Password Storage: Argon2id
- **Algorithm:** Argon2id (hybrid version resilient to both side-channel and GPU/ASIC-based attacks).
- **Parameters:**
  - `time_cost`: 3 iterations
  - `memory_cost`: 65,536 KiB (64 MiB)
  - `parallelism`: 4 lanes
  - `salt_length`: 16 bytes (cryptographically randomized per hash)
  - `hash_length`: 32 bytes
- **Plaintext Safeguards:**
  - Raw passwords are NEVER persisted to the database.
  - Raw passwords are NEVER output to structured or unhandled application logs.
  - No secret keys are used as fixed peppers without rotatability; salt is embedded per hash.

### 1.2 NIST SP 800-63B Aligned Password Policy
- **Minimum Length:** 12 characters (encourages long passphrases).
- **Maximum Length:** 128 characters (mitigates denial-of-service attempts targeting CPU/memory exhaustion during hashing).
- **No Truncation:** Passwords are never silently truncated.
- **Composition Rules Avoidance:** Arbitrary rules requiring mandatory symbols or numbers are omitted in accordance with NIST guidance, prioritizing entropy and passphrase length.
- **Blocklist for Breached / Trivial Passwords:** Known weak patterns and dictionary terms are rejected at registration, reset, and password modification.

---

## 2. Timing-Attack Resistance

To prevent attackers from enumerating valid account emails through execution duration differences:
1. When an email is not located during login, a constant-time dummy Argon2id verification (`verify_dummy_password()`) is executed.
2. Identical error responses (`Invalid email or password`) and HTTP 401 status codes are returned whether the email does not exist, the password is wrong, or the account is locked/disabled.

---

## 3. Token Hashing Architecture

For all stateful tokens (sessions, email verification, password reset):
- Tokens sent to clients are 32-byte (256-bit) cryptographically secure random strings generated via `secrets.token_urlsafe(32)`.
- **Database Persistence:** The database stores ONLY the SHA-256 hexadecimal digest (`hash_token(raw_token)`).
- If the database is compromised, attackers cannot reconstruct raw session tokens or reset links.
