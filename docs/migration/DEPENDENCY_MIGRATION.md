# Dependency Migration Specification

## 1. Dependency Analysis

### Removed Dependencies (Vite specific)
- `vite`
- `@vitejs/plugin-react`

### Retained Production Dependencies
- `react`: `^18.3.1`
- `react-dom`: `^18.3.1`
- `clsx`: `^2.1.1`
- `lucide-react`: `^0.395.0`
- `tailwind-merge`: `^2.3.0`

### Added Dependencies (Next.js specific)
- `next`: `^14.2.15` (Modern, stable enterprise Next.js App Router release)

### DevDependencies
- `typescript`: `^5.4.5`
- `@types/react`: `^18.3.3`
- `@types/react-dom`: `^18.3.0`
- `@types/node`: `^20.14.9`
- `tailwindcss`: `^3.4.4`
- `postcss`: `^8.4.38`
- `autoprefixer`: `^10.4.19`
- `eslint`: `^8.57.0`
- `eslint-config-next`: `^14.2.15`

---

## 2. Script Updates
- `dev`: `next dev`
- `build`: `next build`
- `start`: `next start`
- `lint`: `next lint`
