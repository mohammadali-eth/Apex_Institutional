# Monorepo Engineering & Coding Standards
**Question Paper Management System (QPMS)**  
*Quality Standards, Git Hygiene, Code Conventions & Architectural Compliance*

---

## 1. General Monorepo Principles

1. **Independent Manageability**: Both `frontend/` and `backend/` must remain self-contained with isolated dependencies, configurations, and test runners.
2. **Explicit Contracts**: Communication between presentation and backend services is governed strictly by versioned REST contracts (`/api/v1`).
3. **Zero Secrets in Git**: No credentials, private tokens, internal IP mappings, or production connection strings may be committed. Always use `.env.example` templates.
4. **Reproducibility**: Lockfiles (`package-lock.json`, `pyproject.toml`) are authoritative. Never modify dependencies without committing updated lockfiles.

---

## 2. Frontend Engineering Standards (TypeScript & Next.js)

### 2.1 Language & Types
- **Strict Typing**: The `tsconfig.json` enforces `strict: true`. The use of `any` is strictly prohibited. Use typed interfaces defined in `src/types/`.
- **Imports & Aliasing**: Always use the path alias `@/*` to reference `src/*`. Avoid relative upward paths (`../../../`).
- **Props Typing**: All React components must explicitly define their props interface:
  ```typescript
  interface QuestionCardProps {
    readonly question: Question;
    readonly onSelect: (id: string) => void;
  }
  ```

### 2.2 React & Next.js Best Practices
- **Server vs. Client Components**: Mark client interactive components with `"use client";` at line 1. Keep stateful boundaries localized.
- **Hook Rules**: Follow React Hooks rules strictly (`eslint-plugin-react-hooks`). Ensure dependency arrays in `useEffect` and `useCallback` are complete.
- **Accessibility & HTML Entities**: Never leave raw unescaped quotes or apostrophes in JSX text (use `&apos;`, `&quot;`, `&ldquo;`, `&rdquo;`).

### 2.3 Styling & Design Tokens
- Style exclusively via Tailwind CSS classes.
- Use the institutional design token palette:
  - `brand-primary`: `#80c343` / `#83c441` (Institutional green)
  - `slate-*`: Neutral text, borders, and card backdrops
  - Accessible contrast ratios (minimum 4.5:1 for standard text).

---

## 3. Backend Engineering Standards (Python & FastAPI)

### 3.1 Python 3.12+ Language Standards
- **Strict Type Hints**: Every function parameter and return type must have explicit type annotations. Code must pass `mypy --strict app`.
- **Async I/O**: All database, network, and disk I/O operations must be asynchronous (`async def`, `await session.execute(...)`). Never introduce blocking sync I/O in async request handlers.
- **Data Validation**: Request payloads and response models must be defined using Pydantic v2 `BaseModel` with strict attribute types.

### 3.2 Linter & Formatter Conventions
Code must adhere strictly to `ruff` rules configured in `pyproject.toml`:
- Line length: 100 characters.
- Quotes: Double quotes (`"`).
- Imports: Sorted via isort (`I`) rules.
- Run `ruff check .` and `ruff format --check .` before committing.

### 3.3 Database & Migrations
- Use SQLAlchemy 2.0 `select(...)` statement syntax (avoid legacy query API).
- All schema alterations must be scripted and versioned with Alembic.

---

## 4. Git Hygiene & Commit Conventions

### 4.1 Commit Message Structure (Conventional Commits)
Commits must follow the Conventional Commits specification:
```text
<type>(<scope>): <short description in present tense>

[optional body explaining rationale]

[optional issue reference, e.g. Closes #12]
```

#### Allowed Types:
- `feat`: New user-facing or platform functionality
- `fix`: Bug fix
- `refactor`: Code reorganization without functional changes
- `chore`: Tooling, dependency, or configuration updates
- `docs`: Documentation additions or revisions
- `test`: Adding or updating test suites
- `ci`: CI/CD workflow updates

### 4.2 Branch Naming Conventions
- `feature/<ticket>-<short-description>`
- `fix/<ticket>-<short-description>`
- `refactor/<short-description>`
- `chore/<short-description>`

---

## 5. Definition of Done (DoD) for Pull Requests

A pull request is ready for merge only when:
1. **Frontend Verification**: `npm run lint` and `npx tsc --noEmit` pass with 0 errors, and `npm run build` succeeds.
2. **Backend Verification**: `ruff check .`, `mypy app`, and `pytest` pass with 100% success.
3. **No Regressions**: No existing functionality, UI components, or routes are broken.
4. **Documentation**: Architecture changes or configuration updates are documented in the appropriate `docs/` section.
5. **Clean Review**: Approved by at least one peer reviewer.
