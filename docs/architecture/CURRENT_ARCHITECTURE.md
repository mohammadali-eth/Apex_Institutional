# Current Architecture Audit: QPMS (React + Vite)

## 1. Overview
The Question Paper Management System (QPMS) is an enterprise single-page application built on:
- **Framework & Bundler**: Vite 5.2.13, React 18.3.1, TypeScript 5.4.5
- **Styling**: Tailwind CSS 3.4.4 with custom theme brand colors (`brand-primary`, `brand-secondary`, `brand-bg`, etc.)
- **Icons**: `lucide-react`
- **Utility Libraries**: `clsx`, `tailwind-merge`
- **State & Data Layer**: Client-side state in memory (`demoState.ts`) and mock data modules (`academicData.ts`, `questionData.ts`, `previousPaperData.ts`).
- **Internationalization**: Custom `I18nProvider` supporting English, Gujarati, Hindi, Arabic (RTL), and Urdu (RTL) via JSON dictionaries.

---

## 2. Directory Structure (Pre-Migration)
```
mj_question_paper_genrator/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── components/
│   │   ├── academic/          # AcademicStructureView, OrganizationBrowser
│   │   ├── admin/             # EnterpriseModule
│   │   ├── approvals/         # ApprovalsView
│   │   ├── auth/              # LoginPage, SelectDepartmentPage, NoDepartmentPage
│   │   ├── common/            # Badge, Header, Modal, UnsavedChangesModal
│   │   ├── dashboard/         # DashboardView
│   │   ├── generator/         # GeneratorAcademicStep, GeneratorDistributionStep, GeneratorPreviewStep, PaperGeneratorView, PaperPreviewModal, PreviousPaperCard, ReferenceConfirmationModal
│   │   ├── history/           # PaperHistoryView, DuplicatePaperModal
│   │   ├── layout/            # AppShell
│   │   ├── materials/         # MaterialsView
│   │   ├── papers/            # PaperGeneratorWizard, PaperWorkflowView
│   │   ├── questionBank/      # QuestionBankView, QuestionDetailsView, QuestionEditForm, VersionCompareModal, VersionHistoryTimeline
│   │   ├── reports/           # ReportsView
│   │   └── settings/          # SettingsView
│   ├── contexts/              # AuthContext, DepartmentContext, ToastContext
│   ├── lib/
│   │   ├── i18n.tsx
│   │   └── permissions/       # permissionService, rolePermissions
│   ├── messages/              # ar.json, en.json, gu.json, hi.json, ur.json
│   ├── mock/                  # academicData, previousPaperData, questionData
│   ├── services/              # academicService, approvalService, auditService, examService, materialService, paperService, permissionService, questionService, roleService, userService
│   ├── store/                 # demoState.ts
│   └── types/                 # index.ts
└── docs/
```

---

## 3. Routing Mechanism
The pre-migration application uses window hash-based routing (`window.location.hash`) inside `App.tsx`:
- Synchronized via `window.addEventListener('hashchange', ...)`
- Routes parsed:
  - `login`
  - `dashboard`
  - `create-question`
  - `questions/:questionId/edit`
  - `questions/:questionId`
  - `questions` / `question-bank` / `archived-questions` / `question-review`
  - `universities`, `institutions`, `departments`, `programs`, `subjects` (+ detail views with ID)
  - `users`, `users/:id`
  - `roles`, `roles/:id`
  - `permissions`
  - `examinations`, `examinations/:id`
  - `quality`, `student`, `public`, `public-papers`, `public-exams`, `audit`, `reports`, `settings`
  - `papers/:page` (e.g. `dashboard`, `all`, `mine`, `create`, `review`, `changes`, `approved`, `final`, `published`, `archived`)
  - `generator`, `history`, `approvals`, `materials`, `academic`

---

## 4. State Management & Contexts
- **AuthContext**: Manages active mock user, switching users, login/logout, and available sample users across roles (`super_admin`, `faculty`, `reviewer`, `student`, etc.).
- **DepartmentContext**: Manages user department scoping and isolation (`status`: `active`, `no_department`, `requires_selection`).
- **ToastContext**: Notification system for warnings, success, and errors.
- **demoState**: In-memory state store with operations to mutate questions, papers, audit trails, and materials dynamically during session.

---

## 5. Security & Permission Architecture
- Granular permission matrix based on `rolePermissions.ts` and `permissionService.ts`.
- Evaluates resource-level scoping (department ID matching, status checks).
- Gates access to views, edit forms, workflow stages, and export tools.
