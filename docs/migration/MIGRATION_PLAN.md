# Phased Migration Plan: React Vite to Next.js App Router

## Phase 1: Full Repository Audit & Documentation
- [x] Audit entire codebase: directories, components, routes, mock data, and configs.
- [x] Create architecture and migration documentation in `docs/architecture/` and `docs/migration/`.
- [x] Define exact mapping for files, routes, dependencies, and state boundaries.

## Phase 2: Project Restructuring & Enterprise Setup
- [ ] Install Next.js dependencies (`next`, `@types/node`, `eslint-config-next`).
- [ ] Configure `next.config.mjs`, updated `tsconfig.json` with `@/*` aliases, and `tailwind.config.js`.
- [ ] Setup `public/` directory for static assets.
- [ ] Reorganize codebase into enterprise directories:
  - `src/components/ui`, `src/components/layout`
  - `src/features/*`
  - `src/lib/services/*`, `src/lib/permissions/*`, `src/lib/i18n/*`
  - `src/data/*`
  - `src/types/*`
  - `src/providers/*`
  - `src/hooks/*`
  - `src/app/*`

## Phase 3: Route, Layout & Provider Migration
- [ ] Set up Root Layout (`src/app/layout.tsx`) and global CSS (`src/app/globals.css`).
- [ ] Configure Providers wrapper (`AppProviders.tsx`) for Auth, Department, Toast, and i18n.
- [ ] Setup dashboard layout (`src/app/(dashboard)/layout.tsx`) with AppShell.
- [ ] Implement all route pages corresponding to original hash routes.

## Phase 4: Component & Feature Verification
- [ ] Verify clean import paths using `@/*`.
- [ ] Verify Client vs Server component boundaries (mark interactive components with `'use client'`).
- [ ] Preserve all mock data, types, and logic exactly.

## Phase 5: Verification, Validation & Vite Cleanup
- [ ] Run `npx tsc --noEmit` and ensure 0 TypeScript errors.
- [ ] Run Next.js build (`npm run build`).
- [ ] Verify dev server runs without issues (`npm run dev`).
- [ ] Remove legacy Vite files (`vite.config.ts`, `index.html`, `@vitejs/plugin-react`).
- [ ] Produce final migration and regression reports.
