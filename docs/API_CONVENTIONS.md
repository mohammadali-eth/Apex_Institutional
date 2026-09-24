# API Design Standards & Conventions: QPMS

## Purpose
This document establishes the standardized design conventions, URL patterns, error envelope formats, HTTP status codes, pagination models, and versioning strategies for all REST APIs in the **University Question Paper Management & Generation System**.

## Scope
Applies to all backend API services, client-side API SDKs, and integration webhooks.

---

## 1. RESTful URL & Method Standards

1. **Base URL Prefix:** All endpoints are versioned under `/api/v1/`.
2. **Resource Naming:** Nouns in lowercase plural form (e.g., `/api/v1/questions`, `/api/v1/departments`, `/api/v1/papers`).
3. **Sub-Resource Nesting:** Maximum 2 levels of nesting to avoid deeply nested routes:
   - Allowed: `/api/v1/courses/:courseId/units`
   - Disallowed: `/api/v1/institutions/:id/departments/:id/programs/:id/courses/:id`
4. **HTTP Verb Semantics:**
   - `GET` — Retrieve resources (Idempotent, Safe).
   - `POST` — Create new resource or initiate compute-heavy action (e.g., `/papers/generate`).
   - `PUT` — Complete update / replacement of resource.
   - `PATCH` — Partial field update.
   - `DELETE` — Soft-delete or archive resource.

---

## 2. Standardized JSON Envelope Format

Every JSON response must adhere to the standard envelope structure:

### 2.1 Success Response (`2xx`)
```json
{
  "status": "SUCCESS",
  "data": {
    "id": "QP-2026-001",
    "totalMarks": 50
  },
  "meta": {
    "timestamp": "2026-03-24T14:32:10Z",
    "requestId": "req-99120-fa"
  }
}
```

### 2.2 Paginated List Response
```json
{
  "status": "SUCCESS",
  "data": {
    "items": [...],
    "pagination": {
      "totalItems": 142,
      "itemsPerPage": 20,
      "currentPage": 1,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

### 2.3 Error Response (`4xx`, `5xx`)
```json
{
  "status": "ERROR",
  "error": {
    "code": "INSUFFICIENT_QUESTION_POOL",
    "message": "Not enough approved questions exist to fulfill blueprint criteria.",
    "details": [
      { "field": "unit_4_hard_questions", "issue": "Shortfall of 2 questions" }
    ],
    "timestamp": "2026-03-24T14:32:10Z",
    "requestId": "req-99120-fa"
  }
}
```

---

## 3. Standard HTTP Status Codes

| Code | Status Meaning | Standard Usage in QPMS |
| :--- | :--- | :--- |
| **`200 OK`** | Request Succeeded | Successful `GET`, `PUT`, `PATCH`, or non-resource `POST`. |
| **`201 Created`** | Resource Created | Successful creation of question, course, or paper draft. |
| **`204 No Content`** | Action Completed | Successful deletion or silent status update. |
| **`400 Bad Request`** | Malformed Request | Syntax errors, JSON parse failures, invalid query parameters. |
| **`401 Unauthorized`** | Authentication Missing | Missing, expired, or invalid session cookie / token. |
| **`403 Forbidden`** | Scope / Role Blocked | User possesses valid login but lacks permission or belongs to another department. |
| **`404 Not Found`** | Resource Missing | Requested Question ID, Paper ID, or Course ID does not exist. |
| **`409 Conflict`** | Version / Code Conflict| Attempting to create duplicate course code or edit conflicting version. |
| **`422 Unprocessable`**| Business Rule Violation| Blueprint total marks mismatch, or generator deficit error. |
| **`429 Too Many Req`**| Rate Limit Exceeded | API token bucket exhausted (e.g., > 100 requests / minute). |
| **`500 Internal Error`**| Server Exception | Uncaught runtime error; triggers immediate developer alert. |

---

## Current State vs. Proposed State

* **Current State:** No API conventions exist because all services run in-memory within the client browser.
* **Proposed State:** A strict, production-grade API standard governing envelopes, status codes, error payloads, and pagination models.

## Decisions
1. Enforce a single standardized response envelope (`status`, `data`, `error`) across all endpoints.
2. Require every response to carry an `X-Request-ID` header for end-to-end tracing.

## Open Questions
- None.

## Related Documents
- [API_SPECIFICATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/API_SPECIFICATION.md)
- [SECURITY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/SECURITY.md)
