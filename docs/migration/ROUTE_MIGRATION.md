# Complete Route Migration Specification

## 1. Route Strategy
In the Vite application, routing was handled through hash fragments (`#dashboard`, `#questions`, etc.) managed by a `hashchange` listener in `src/App.tsx`.
In Next.js App Router, these map cleanly to true URL paths:

### Route Definitions
- `/` -> Redirects to `/dashboard` (or `/login` if unauthenticated).
- `/login` -> Authentication screen (`src/app/(auth)/login/page.tsx`).
- `/(dashboard)/dashboard` -> System Dashboard.
- `/(dashboard)/academic` -> Academic Structure & Hierarchy Management.
- `/(dashboard)/materials` -> Syllabus & Blueprint Repository.
- `/(dashboard)/questions` -> Question Bank browser with filter params (`?status=all|Approved|Submitted|Archived`).
- `/(dashboard)/questions/create` -> Create new Question form.
- `/(dashboard)/questions/[id]` -> Question Details View.
- `/(dashboard)/questions/[id]/edit` -> Question Edit Form.
- `/(dashboard)/generator` -> Paper Generator creation step.
- `/(dashboard)/papers` -> Paper Workflow Overview.
- `/(dashboard)/papers/[slug]` -> Sub-views: `dashboard`, `all`, `mine`, `create`, `review`, `changes`, `approved`, `final`, `published`, `archived`.
- `/(dashboard)/history` -> Previous Question Papers archive.
- `/(dashboard)/approvals` -> Paper Approvals View.
- `/(dashboard)/reports` -> Reports & Analytics View.
- `/(dashboard)/settings` -> System Settings View.
- `/(dashboard)/users` -> User Administration (`EnterpriseModule`).
- `/(dashboard)/users/[id]` -> User Details.
- `/(dashboard)/roles` -> Role Administration.
- `/(dashboard)/roles/[id]` -> Role Details.
- `/(dashboard)/permissions` -> Permissions matrix.
- `/(dashboard)/examinations` -> Exam Management.
- `/(dashboard)/examinations/[id]` -> Exam Details.
- `/(dashboard)/quality` -> Quality Control.
- `/(dashboard)/student` -> Student Portal.
- `/(dashboard)/public` -> Public Portal.
- `/(dashboard)/public-papers` -> Public Published Papers.
- `/(dashboard)/public-exams` -> Public Exam Schedules.
- `/(dashboard)/audit` -> Audit Log Explorer.
- `/(dashboard)/organization/[...slug]` -> Organization Browser (`universities`, `institutions`, `departments`, `programs`, `subjects`).
- `/forbidden` -> 403 Forbidden Access Screen.
- Global 404 handled via `src/app/not-found.tsx`.

---

## 2. Navigation Adaptation
To preserve exact behavior without changing UI code unnecessarily:
- The navigation contract `onNavigate(route: string, id?: string)` used by components is implemented in `AppShell` and page wrappers using Next.js `useRouter()`.
- Routes accepting query params or dynamic ids seamlessly route to the new paths while preserving full state in contexts and demoState.
