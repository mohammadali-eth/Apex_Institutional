# Migration Checklist

- [ ] 1. Audit complete & documented
- [ ] 2. Next.js and peer dependencies installed
- [ ] 3. `next.config.mjs` created and configured
- [ ] 4. `tsconfig.json` updated with Next.js plugin & `@/*` path aliases
- [ ] 5. `tailwind.config.js` content paths updated for Next.js app directory
- [ ] 6. Static files moved to `public/`
- [ ] 7. Mock data centralized in `src/data/`
- [ ] 8. Core contexts converted into enterprise providers under `src/providers/`
- [ ] 9. Hooks separated into `src/hooks/`
- [ ] 10. Reusable UI components moved to `src/components/ui/` and `src/components/layout/`
- [ ] 11. Feature-specific views moved to `src/features/`
- [ ] 12. App Router routes created under `src/app/`
- [ ] 13. Route navigation verified with Next.js router
- [ ] 14. TypeScript passes with 0 errors (`npx tsc --noEmit`)
- [ ] 15. Next.js production build succeeds (`npm run build`)
- [ ] 16. Obsolete Vite configuration and files removed
- [ ] 17. Regression checklist completed
