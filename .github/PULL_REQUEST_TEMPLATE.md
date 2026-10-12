## Pull Request Overview

### Summary of Changes
<!-- Provide a clear, concise summary of what this PR changes and why. -->

### Related Issues
- Closes #<!-- issue number -->

---

## Type of Change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Refactoring / Code quality (no behavior change)
- [ ] Architecture / Platform / DevOps / Documentation
- [ ] Breaking change (fix or feature requiring downstream updates)

---

## Verification & Test Evidence

### Frontend Verification
- [ ] `npm run lint` passes with 0 errors
- [ ] `npx tsc --noEmit` passes with 0 type errors
- [ ] `npm run build` succeeds cleanly

### Backend Verification
- [ ] `ruff check .` and `ruff format --check .` pass
- [ ] `mypy app` passes with 0 issues
- [ ] `pytest` passes with 100% success

---

## Security & Architectural Checklist

- [ ] No secrets, credentials, or private tokens are committed or logged
- [ ] Changes adhere to domain boundaries and repository architecture standards
- [ ] Documentation has been updated where appropriate
- [ ] Backward compatibility is maintained
