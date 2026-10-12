# API Guidelines & Conventions

This document establishes standards and conventions for future API endpoints in the Question Paper Management System.

---

## 1. URL Path Structure & Versioning

- All business endpoints must be namespaced under `/api/v1/`.
- Plural nouns must be used for resources:
  - `/api/v1/question-papers`
  - `/api/v1/questions`
  - `/api/v1/courses`
  - `/api/v1/examinations`
- Sub-resources follow hierarchical patterns:
  - `/api/v1/question-papers/{paper_id}/questions`
- System probes are mounted at the root:
  - `/health` (aggregated)
  - `/health/live` (liveness)
  - `/health/ready` (readiness)

---

## 2. HTTP Verbs & Standard Status Codes

| Action | HTTP Verb | Success Status | Description |
|---|---|---|---|
| List Resources | `GET` | `200 OK` | Returns array of resource objects or paginated envelope. |
| Retrieve Resource | `GET` | `200 OK` | Returns single resource object. |
| Create Resource | `POST` | `201 Created` | Creates a new record. Returns the created resource. |
| Full Update | `PUT` | `200 OK` | Idempotent replacement of resource entity. |
| Partial Update | `PATCH` | `200 OK` | Updates only the supplied fields. |
| Delete Resource | `DELETE` | `204 No Content` | Removes the resource or marks as soft-deleted. |

---

## 3. Standard Response Formats

### Single Resource Response
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Data Structures & Algorithms Midterm",
  "created_at": "2026-10-12T10:00:00Z",
  "updated_at": "2026-10-12T10:00:00Z"
}
```

### Paginated List Response Envelope
```json
{
  "items": [ ... ],
  "total": 128,
  "page": 1,
  "page_size": 20,
  "total_pages": 7
}
```

---

## 4. Standard Error Envelope (`app/core/exceptions.py`)

All HTTP errors must conform to the standard error envelope:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested question paper was not found.",
    "details": null,
    "request_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }
}
```

### Core Error Types Provided
- `AppException`: Base exception class.
- `EntityNotFoundException`: Maps to HTTP 404 with code `NOT_FOUND`.
- `ConflictException`: Maps to HTTP 409 with code `CONFLICT`.
- `ValidationException`: Maps to HTTP 422 with code `VALIDATION_ERROR`.
- `AuthenticationException`: Maps to HTTP 401 with code `UNAUTHORIZED`.
- `ForbiddenException`: Maps to HTTP 403 with code `FORBIDDEN`.

---

## 5. Request Tracing with Correlation IDs

Every incoming request passes through `RequestIdMiddleware`.
- If the incoming request has an `X-Request-ID` header, that value is propagated.
- If absent, a new UUID v4 is generated.
- The `X-Request-ID` header is attached to the HTTP response and included in all server log messages for cross-service diagnostics.
