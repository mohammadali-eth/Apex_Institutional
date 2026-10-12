# QPMS Frontend Application

The modern, responsive institutional web interface for the **Apex Question Paper Management System (QPMS)**, built with Next.js 14 App Router, React 18, TypeScript, and Tailwind CSS.

---

## 1. Technology Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Language**: TypeScript 5 (Strict Mode)
- **Styling**: Tailwind CSS with custom institutional design system
- **Icons**: Lucide React
- **Internationalization**: Custom multilingual provider (English, Urdu, Hindi, Gujarati, Arabic)

---

## 2. Directory Structure

```text
frontend/
├── public/                 # Static assets, institutional icons, logos
├── src/
│   ├── app/                # Next.js App Router (pages, layouts, error boundaries)
│   │   ├── (auth)/         # Authentication & login routes
│   │   ├── (dashboard)/    # Institutional dashboard & feature views
│   │   ├── layout.tsx      # Root application shell
│   │   └── globals.css     # Global Tailwind stylesheet
│   ├── components/         # Shared reusable UI primitives & layout shells
│   ├── data/               # Baseline demo datasets & schemas
│   ├── features/           # Modular domain feature components
│   │   ├── academic/       # Academic hierarchy & syllabus browsers
│   │   ├── approvals/      # Question & paper review workflows
│   │   ├── auth/           # Login & department persona selection
│   │   ├── dashboard/      # Institutional analytics & metrics
│   │   ├── generator/      # Automated question paper generator wizard
│   │   ├── question-bank/  # Question bank authoring & version timelines
│   │   └── settings/       # System preferences & security controls
│   ├── hooks/              # Custom React hooks (useAuth, useI18n, useToast, etc.)
│   ├── lib/                # Client-side services, utilities, and permissions
│   ├── providers/          # Application context providers (Auth, I18n, Toast)
│   └── types/              # Domain TypeScript interfaces
├── .eslintrc.json          # ESLint configuration
├── .gitignore              # Frontend Git exclusion rules
├── .env.example            # Environment variables template
├── next.config.mjs         # Next.js compiler & routing configuration
├── package.json            # Dependencies and scripts
├── postcss.config.js       # PostCSS processing
├── tailwind.config.js      # Tailwind design tokens & themes
└── tsconfig.json           # TypeScript compiler configuration
```

---

## 3. Getting Started

### Prerequisites

- **Node.js**: v18.17.0+ or v20.x LTS
- **npm**: v9.x or v10.x

### Installation

```bash
# From the frontend directory:
npm install

# Or from monorepo root:
npm install --prefix frontend
```

### Environment Configuration

```bash
cp .env.example .env.local
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Available Scripts

| Script | Purpose | Command |
| :--- | :--- | :--- |
| `npm run dev` | Start development server with Fast Refresh | `next dev` |
| `npm run build` | Compile optimized production bundle | `next build` |
| `npm run start` | Start production server | `next start` |
| `npm run lint` | Run Next.js ESLint validation | `next lint` |

---

## 5. Coding Standards

- **Strict TypeScript**: Do not use `any`; use strictly typed interfaces in `src/types/index.ts`.
- **Styling**: Use Tailwind CSS utilities matching the institutional green palette (`brand-primary: #80c343`) and slate neutrals.
- **Component Design**: Keep components modular, accessible, and responsive across mobile, tablet, and desktop screens.
