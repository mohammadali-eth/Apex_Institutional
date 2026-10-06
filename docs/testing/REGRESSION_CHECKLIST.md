# Regression Testing Checklist

## 1. Authentication & Department Flow
- [ ] Direct visit to `/` redirects to `/dashboard` (or `/login` if unauthenticated)
- [ ] Login screen displays all mock roles (Super Admin, Faculty, Reviewer, etc.)
- [ ] Logging in as user with single department lands on Dashboard with correct department badge
- [ ] Logging in as user with multiple departments prompts department selector
- [ ] Switching active department via top header dropdown updates context immediately
- [ ] Logging out returns user to login screen

## 2. Navigation & Layout
- [ ] Sidebar collapses/expands properly
- [ ] Active route is highlighted in sidebar
- [ ] Mobile navigation drawer opens and navigates correctly
- [ ] Top bar displays user initials, name, role badge, and department scope
- [ ] Footer renders branding, institute name, and confidentiality notices
- [ ] Language dropdown works (English, Gujarati, Hindi, Arabic, Urdu) and updates HTML dir (LTR/RTL)

## 3. Core Features
- [ ] **Dashboard**: Displays stats, KPI cards, pending approval counts, and recent papers
- [ ] **Academic Structure**: Displays tabs (Departments, Logins, Subjects, Programs, Institutions)
- [ ] **Materials**: Blueprint and syllabus management displays and filters work
- [ ] **Question Bank**:
  - [ ] Question list renders with status filters (All, Approved, Submitted, Archived)
  - [ ] Search input filters questions in real-time
  - [ ] "Create Question" loads form and creates new mock question
  - [ ] "View Question" renders question details and version history timeline
  - [ ] "Edit Question" loads pre-populated form and saves new revision
  - [ ] Version compare modal works
- [ ] **Paper Generator**:
  - [ ] Step 1 (Academic Selection) works
  - [ ] Step 2 (Distribution & Blueprints) works
  - [ ] Step 3 (Preview & Generate) displays paper preview with watermark
- [ ] **Paper Workflow**:
  - [ ] Paper statuses (All, Mine, Review, Changes, Approved, Final, Published, Archived) load correct subsets
- [ ] **Paper History**:
  - [ ] Previous papers list renders
  - [ ] "Use as Reference" transitions to Paper Generator with pre-populated reference
- [ ] **Approvals**:
  - [ ] Review modal opens with Approve / Request Changes actions
- [ ] **Reports**:
  - [ ] Analytical summaries and charts render
- [ ] **Enterprise / Admin Modules**:
  - [ ] `/users` displays user table and details
  - [ ] `/roles` displays role cards and permissions
  - [ ] `/examinations` displays examination schedules
  - [ ] `/audit` displays system audit trails
  - [ ] `/student` portal works when logged in as student
  - [ ] `/public` portal works for guest users
- [ ] **Access Control**:
  - [ ] Accessing unpermitted routes shows 403 Forbidden screen
