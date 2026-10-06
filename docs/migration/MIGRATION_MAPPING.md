# Migration Mapping: Vite SPA to Next.js App Router

## 1. Directory and File Migration Mapping

| Original Vite File | Migrated Next.js File | Architectural Purpose |
|-------------------|----------------------|-----------------------|
| `src/main.tsx` | `src/app/layout.tsx` + `src/providers/AppProviders.tsx` | Entry point & root providers |
| `src/App.tsx` | `src/app/(dashboard)/layout.tsx` + route `page.tsx` files | Central routing decomposed into App Router |
| `src/index.css` | `src/app/globals.css` | Global styling & theme css |
| `src/contexts/AuthContext.tsx` | `src/providers/AuthProvider.tsx` + `src/hooks/useAuth.ts` | Auth state context & hook |
| `src/contexts/DepartmentContext.tsx` | `src/providers/DepartmentProvider.tsx` + `src/hooks/useDepartment.ts` | Department context & hook |
| `src/contexts/ToastContext.tsx` | `src/providers/ToastProvider.tsx` + `src/hooks/useToast.ts` | Toast notification provider & hook |
| `src/lib/i18n.tsx` | `src/providers/I18nProvider.tsx` + `src/hooks/useI18n.ts` | Translation provider & hook |
| `src/messages/*.json` | `src/lib/i18n/messages/*.json` | Translation dictionaries |
| `src/mock/academicData.ts` | `src/data/academicData.ts` | Centralized academic mock dataset |
| `src/mock/questionData.ts` | `src/data/questionData.ts` | Centralized question mock dataset |
| `src/mock/previousPaperData.ts` | `src/data/previousPaperData.ts` | Centralized previous paper dataset |
| `src/store/demoState.ts` | `src/data/demoState.ts` | In-memory demo state store |
| `src/services/*` | `src/lib/services/*` | Domain services & business logic |
| `src/lib/permissions/*` | `src/lib/permissions/*` | RBAC & permission checking |
| `src/types/index.ts` | `src/types/index.ts` | Shared TypeScript interfaces |

### UI Components Mapping
| Original Location | Migrated Location | Category |
|-------------------|-------------------|----------|
| `src/components/common/Badge.tsx` | `src/components/ui/Badge.tsx` | Reusable UI |
| `src/components/common/Modal.tsx` | `src/components/ui/Modal.tsx` | Reusable UI |
| `src/components/common/UnsavedChangesModal.tsx` | `src/components/ui/UnsavedChangesModal.tsx` | Reusable UI |
| `src/components/common/Header.tsx` | `src/components/layout/Header.tsx` | Reusable UI Layout |
| `src/components/layout/AppShell.tsx` | `src/components/layout/AppShell.tsx` | App Layout Shell |

### Domain Feature Mapping
| Original Location | Migrated Location | Feature Domain |
|-------------------|-------------------|----------------|
| `src/components/academic/*` | `src/features/academic/*` | Academic Hierarchy & Browser |
| `src/components/admin/*` | `src/features/admin/*` | Enterprise Administration |
| `src/components/approvals/*` | `src/features/approvals/*` | Paper Approvals Workflow |
| `src/components/auth/*` | `src/features/auth/*` | Authentication & Dept Picker |
| `src/components/dashboard/*` | `src/features/dashboard/*` | Dashboard Analytics & Cards |
| `src/components/generator/*` | `src/features/generator/*` | Blueprint & Paper Generator |
| `src/components/history/*` | `src/features/history/*` | Paper Archive & Duplication |
| `src/components/materials/*` | `src/features/materials/*` | Syllabus & Blueprint Materials |
| `src/components/papers/*` | `src/features/papers/*` | Paper Generation Wizard & Workflow |
| `src/components/questionBank/*` | `src/features/question-bank/*` | Question Bank, Edit, Review |
| `src/components/reports/*` | `src/features/reports/*` | Analytics & Quality Reports |
| `src/components/settings/*` | `src/features/settings/*` | System & Profile Settings |

---

## 2. Route Migration Mapping

| Hash / Logical Route in Vite | Next.js App Router Path | Route Component |
|------------------------------|-------------------------|-----------------|
| `#/login` | `/login` | `src/app/(auth)/login/page.tsx` |
| `#/dashboard` or `#` | `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` |
| `#/academic` | `/academic` | `src/app/(dashboard)/academic/page.tsx` |
| `#/materials` | `/materials` | `src/app/(dashboard)/materials/page.tsx` |
| `#/questions` / `#/question-bank` | `/questions` | `src/app/(dashboard)/questions/page.tsx` |
| `#/create-question` | `/questions/create` | `src/app/(dashboard)/questions/create/page.tsx` |
| `#/questions/:id` | `/questions/[id]` | `src/app/(dashboard)/questions/[id]/page.tsx` |
| `#/questions/:id/edit` | `/questions/[id]/edit` | `src/app/(dashboard)/questions/[id]/edit/page.tsx` |
| `#/generator` | `/generator` | `src/app/(dashboard)/generator/page.tsx` |
| `#/papers` | `/papers` | `src/app/(dashboard)/papers/page.tsx` |
| `#/papers/:slug` | `/papers/[slug]` | `src/app/(dashboard)/papers/[slug]/page.tsx` |
| `#/history` | `/history` | `src/app/(dashboard)/history/page.tsx` |
| `#/approvals` | `/approvals` | `src/app/(dashboard)/approvals/page.tsx` |
| `#/reports` | `/reports` | `src/app/(dashboard)/reports/page.tsx` |
| `#/settings` | `/settings` | `src/app/(dashboard)/settings/page.tsx` |
| `#/users` | `/users` | `src/app/(dashboard)/users/page.tsx` |
| `#/users/:id` | `/users/[id]` | `src/app/(dashboard)/users/[id]/page.tsx` |
| `#/roles` | `/roles` | `src/app/(dashboard)/roles/page.tsx` |
| `#/roles/:id` | `/roles/[id]` | `src/app/(dashboard)/roles/[id]/page.tsx` |
| `#/permissions` | `/permissions` | `src/app/(dashboard)/permissions/page.tsx` |
| `#/examinations` | `/examinations` | `src/app/(dashboard)/examinations/page.tsx` |
| `#/examinations/:id` | `/examinations/[id]` | `src/app/(dashboard)/examinations/[id]/page.tsx` |
| `#/quality` | `/quality` | `src/app/(dashboard)/quality/page.tsx` |
| `#/student` | `/student` | `src/app/(dashboard)/student/page.tsx` |
| `#/public` | `/public` | `src/app/(dashboard)/public/page.tsx` |
| `#/public-papers` | `/public-papers` | `src/app/(dashboard)/public-papers/page.tsx` |
| `#/public-exams` | `/public-exams` | `src/app/(dashboard)/public-exams/page.tsx` |
| `#/audit` | `/audit` | `src/app/(dashboard)/audit/page.tsx` |
| `#/forbidden` | `/forbidden` | `src/app/forbidden/page.tsx` |
| `#/not-found` | `/not-found` | `src/app/not-found.tsx` |
| `#/universities`, `institutions`, etc. | `/organization/[...slug]` | `src/app/(dashboard)/organization/[...slug]/page.tsx` |
