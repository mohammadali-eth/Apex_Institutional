# Target Next.js Architecture: QPMS

## 1. Overview
The migrated QPMS application adopts Next.js App Router with TypeScript, Tailwind CSS, and enterprise feature-slice architecture while preserving exact styling, mock behaviors, and UI fidelity.

---

## 2. Directory Structure (Next.js Enterprise)
```
src/
├── app/                                 # Next.js App Router (Layouts, Routing & Route Handlers)
│   ├── layout.tsx                       # Root Layout (Fonts, Metadata, Provider wrapper)
│   ├── page.tsx                         # Root page (Default redirect to /dashboard or /login)
│   ├── globals.css                      # Global Tailwind and brand color tokens
│   ├── not-found.tsx                    # Global 404 page
│   ├── error.tsx                        # Global error boundary
│   │
│   ├── (auth)/                          # Auth route group
│   │   └── login/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/                     # Protected Core Application Route Group
│   │   ├── layout.tsx                   # Layout wrapping AppShell + Auth & Dept guards
│   │   ├── dashboard/page.tsx
│   │   ├── academic/page.tsx
│   │   ├── materials/page.tsx
│   │   ├── generator/page.tsx
│   │   ├── history/page.tsx
│   │   ├── approvals/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── audit/page.tsx
│   │   ├── quality/page.tsx
│   │   ├── student/page.tsx
│   │   ├── public/page.tsx
│   │   ├── public-papers/page.tsx
│   │   ├── public-exams/page.tsx
│   │   │
│   │   ├── questions/
│   │   │   ├── page.tsx                 # Question Bank list
│   │   │   ├── create/page.tsx          # Create question
│   │   │   ├── [id]/page.tsx            # View question details
│   │   │   └── [id]/edit/page.tsx       # Edit question
│   │   │
│   │   ├── papers/
│   │   │   ├── page.tsx                 # Paper workflow default
│   │   │   └── [slug]/page.tsx          # papers/all, papers/mine, papers/create, etc.
│   │   │
│   │   ├── users/
│   │   │   ├── page.tsx                 # Users list
│   │   │   └── [id]/page.tsx            # User details
│   │   │
│   │   ├── roles/
│   │   │   ├── page.tsx                 # Roles list
│   │   │   └── [id]/page.tsx            # Role details
│   │   │
│   │   ├── permissions/page.tsx         # Permissions matrix
│   │   ├── examinations/
│   │   │   ├── page.tsx                 # Examinations list
│   │   │   └── [id]/page.tsx            # Exam details
│   │   │
│   │   └── organization/
│   │       └── [...slug]/page.tsx       # Dynamic hierarchy (universities, institutions, departments, programs, subjects)
│   │
│   └── forbidden/page.tsx               # 403 Access Denied page
│
├── components/                          # Truly Reusable UI Components
│   ├── ui/
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   └── UnsavedChangesModal.tsx
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   └── Header.tsx
│   └── shared/
│
├── features/                            # Domain-Driven Feature Slices
│   ├── academic/                        # AcademicStructureView, OrganizationBrowser
│   ├── admin/                           # EnterpriseModule
│   ├── approvals/                       # ApprovalsView
│   ├── auth/                            # LoginPage, SelectDepartmentPage, NoDepartmentPage
│   ├── dashboard/                       # DashboardView
│   ├── generator/                       # GeneratorAcademicStep, GeneratorDistributionStep, GeneratorPreviewStep, PaperGeneratorView, PaperPreviewModal, PreviousPaperCard, ReferenceConfirmationModal
│   ├── history/                         # PaperHistoryView, DuplicatePaperModal
│   ├── materials/                       # MaterialsView
│   ├── papers/                          # PaperGeneratorWizard, PaperWorkflowView
│   ├── question-bank/                   # QuestionBankView, QuestionDetailsView, QuestionEditForm, VersionCompareModal, VersionHistoryTimeline
│   ├── reports/                         # ReportsView
│   └── settings/                        # SettingsView
│
├── providers/                           # Application Providers
│   ├── AppProviders.tsx                 # Combined Provider Wrapper
│   ├── AuthProvider.tsx
│   ├── DepartmentProvider.tsx
│   ├── ToastProvider.tsx
│   └── I18nProvider.tsx
│
├── hooks/                               # Reusable Hooks
│   ├── useAuth.ts
│   ├── useDepartment.ts
│   ├── useToast.ts
│   └── useI18n.ts
│
├── lib/                                 # Technical Utilities
│   ├── i18n/
│   │   ├── config.ts
│   │   └── messages/ (en, ar, gu, hi, ur)
│   ├── permissions/
│   │   ├── permissionService.ts
│   │   └── rolePermissions.ts
│   ├── services/                        # All business domain service singletons
│   └── utils.ts
│
├── data/                                # Centralized Mock & Static Datasets
│   ├── academicData.ts
│   ├── questionData.ts
│   ├── previousPaperData.ts
│   └── demoState.ts
│
└── types/                               # TypeScript Definitions
    └── index.ts
```

---

## 3. Server vs Client Component Strategy
- **Root Layout (`src/app/layout.tsx`)**: Server Component. Configures `html`, `body`, metadata, and sets font attributes.
- **Provider Container (`src/providers/AppProviders.tsx`)**: Client Component (`'use client'`). Wraps child trees in Auth, Department, Toast, and I18n context providers.
- **AppShell & Navigation (`src/components/layout/AppShell.tsx`)**: Client Component (`'use client'`). Manages sidebar state, responsive drawer, user profile popover, and department switching.
- **Interactive Feature Views**: Components utilizing state, forms, modals, tabs, and client mutation of `demoState` maintain `'use client'`.
- **Route Pages**: Thin wrappers that load the respective feature modules or handle route parameter delegation to client features cleanly.
