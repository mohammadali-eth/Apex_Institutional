<USER_REQUEST>
# MASTER IMPLEMENTATION PROMPT — KSV University Examination Paper Layout Redesign

## Objective

Redesign the **question paper preview, print layout, and PDF export** in my existing Question Paper Management System (QPMS) to closely match the uploaded Kadi Sarva Vishwavidyalaya (KSV) examination paper.

Treat the uploaded image as the primary visual reference. Reproduce its document structure, alignment, typography, question numbering, marks placement, OR alternatives, and formal university examination appearance.

**Important:** This is a layout and rendering enhancement to the existing system. Do not rebuild the application or replace the existing question-generation engine.

## Phase 1 — Audit the Existing Project

Before making changes:

1. Inspect the repository and identify the existing:
   - Question paper generation workflow.
   - Paper preview component.
   - PDF generation and download logic.
   - Paper templates and styling.
   - Question, section, marks, and OR-group data models.
   - Backend API endpoints and persistence logic.
2. Trace the complete rendering pipeline from generated paper data to browser preview and exported PDF.
3. Identify why the current output differs from the supplied university paper.
4. Reuse existing components and dependencies wherever possible.
5. Implement the changes in the correct frontend and backend files based on the actual repository structure.

Do not create a second paper generator, duplicate PDF implementation, or a separate hardcoded sample template.

## Phase 2 — Reproduce the University Paper Header

Create a clean, centered university examination header based on the reference image.

The header should support these configurable fields:

- University name.
- Examination name or examination session, if available.
- Semester.
- Programme or course name.
- Subject code.
- Subject name.
- Examination date.
- Examination duration.
- Maximum marks.

Use a structure similar to the following:

```text
                    KADI SARVA VISHWAVIDYALAYA
                         [Semester / Exam]

Candidate No.: ______________________________

Subject Code: MCA 36B    Subject Name: Advanced Web Development

Date: ______________     Time: 3 Hours     Total Marks: 50

Instructions:
1. Make suitable assumptions wherever necessary.
2. Figures to the right indicate full marks.
```

This is an illustrative structure, not fixed content. Use the actual values stored in the selected examination and paper configuration.

Requirements:

- University name centered and visually prominent.
- Semester and examination information centered underneath.
- Candidate number field near the top, matching the reference's position as closely as practical.
- Subject metadata arranged in compact horizontal rows.
- Date, duration, and maximum marks aligned neatly.
- Instructions displayed below the metadata with numbered lines.
- Use consistent margins and thin separators only where appropriate.
- Never hardcode the sample university, course, subject, date, duration, or marks as production defaults.

The institution name and other header fields must come from saved configuration or the selected examination record.

## Phase 3 — Question Layout and Numbering

Match the question presentation in the supplied reference.

### Main questions

Display main question numbers using a format such as:

`Q-1.`, `Q-2.`, `Q-3.`

Position the marks at the far right of the relevant question or section line:

`Q-1. Answer the following questions.                         [10]`

Use a layout that keeps marks aligned even when question text wraps onto multiple lines.

### Subquestions

Support lettered subquestions:

```text
Q-1. Answer the following questions.                         [10]

A. Explain the difference between GET and POST methods.
B. What is JSON, and why is it commonly used?
C. Define authentication and authorization.
D. Explain routing in ASP.NET MVC.
E. Describe the deployment of an ASP.NET MVC application.
```

Requirements:

- Consistent indentation for A, B, C, and subsequent items.
- Readable line spacing and wrapping.
- No overlapping question text or marks.
- Long questions must wrap beneath their own text, not beneath their labels.
- Preserve question numbering, subquestion ordering, and saved question content.

### Objective questions

Support sections such as:

```text
Q-2. [A] Answer the following objective questions.
     (All questions are compulsory.)                       [05]

1. Define routing in MVC.
2. What is a ViewBag?
3. Explain authentication.
4. What is JSON?
5. Define a controller.
```

The objective-question format must remain configurable rather than being restricted to five questions or five marks.

### Alternative questions — OR

Display alternative question groups in the following style:

```text
Q-2. [B] Describe the anatomy of an ASP.NET MVC 4 application. [05]

                              OR

Explain the roles of Models, Views, and Controllers in MVC.     [05]
```

Requirements:

- Display `OR` as a distinct separator between the alternative questions.
- Keep each alternative visually associated with the correct parent question or section.
- Preserve the existing OR-group data model and business rules.
- Support alternatives containing multiple subquestions.
- Prevent an OR group from splitting awkwardly across pages when it can reasonably fit on one page.
- Do not introduce duplicate marks when calculating candidate-attempt totals.
- Ensure the PDF output preserves the same alternatives and hierarchy as the preview.

If the existing system supports `OR_PAIR`, `OR_GROUP`, or `ATTEMPT_ANY_N`, retain and correctly render those structures. Do not replace them with plain text.

## Phase 4 — Visual Design and Typography

Create a formal university examination document rather than a modern dashboard-style report.

### Visual requirements

- White page background.
- Black text.
- No colorful cards, gradients, decorative illustrations, or dashboard components inside the paper.
- Compact, professional typography resembling a conventional printed university examination.
- Clear hierarchy between university name, subject metadata, main questions, subquestions, instructions, and marks.
- Thin borders or separator lines only when useful.
- Consistent indentation and spacing.
- A4 portrait layout by default.
- Print-safe margins.
- High-contrast, printer-friendly output.

Use the existing styling approach and dependencies wherever possible. Do not introduce unnecessary UI libraries.

Make typography and spacing configurable through a paper template or design settings if the current architecture supports templates.

## Phase 5 — A4 Pagination and Page Breaks

Implement reliable pagination for both browser preview and PDF export.

Requirements:

1. Use A4 portrait pages with consistent margins.
2. Keep the university header and examination metadata together.
3. Avoid splitting a question heading from its first subquestion.
4. Keep OR separators with the alternative questions they connect.
5. Avoid splitting short questions across pages unnecessarily.
6. Allow long questions to continue naturally when they cannot fit on one page.
7. Prevent overlapping content, clipped text, blank pages, and unexpected page breaks.
8. Add page numbers only if appropriate to the reference or the existing paper configuration.
9. Ensure all questions remain present in the final PDF.
10. Validate page breaks at different question counts and text lengths.

Do not force every question onto a new page. Paginate naturally while preserving logical groups.

## Phase 6 — Preview and PDF Must Match

The browser preview and downloaded PDF must render the same paper structure.

- Use a shared paper-layout component or shared rendering rules where feasible.
- Ensure the PDF uses the correct page size, margins, font metrics, and line wrapping.
- Preserve bold formatting, labels, numbering, marks, and OR separators.
- Avoid generating a PDF that differs from the paper shown in the preview.
- Retain existing PDF download and printing functionality.
- Verify the exported PDF by rendering its pages and visually checking the result.

If the project uses a server-side PDF renderer, browser printing, or an existing PDF library, improve the current implementation rather than introducing an unnecessary parallel solution.

## Phase 7 — Dynamic Paper Configuration

The layout must work for all supported universities, programmes, semesters, subjects, and examination types.

Do not hardcode:

- University name.
- Semester.
- Course or programme.
- Subject code or subject name.
- Date or duration.
- Maximum marks.
- Number of questions.
- Marks per question.
- Number of pages.
- Fixed A/B/C/D/E subquestion counts.
- A specific syllabus or question set.

All values must be derived from the selected paper, institution settings, and existing question-generation configuration.

Allow the system to reuse the same university-style template for different subjects and maximum marks.

## Phase 8 — Preserve Existing Marks Validation

The redesigned layout must not break the current marks-calculation engine.

- Display marks from the validated paper data.
- Show the configured maximum marks in the header.
- Preserve marks at the appropriate main-question or section level.
- Avoid double-counting parent and child marks.
- Preserve the distinction between printed question marks and the marks a candidate is required to attempt.
- If a paper is configured for 50 marks, its validated candidate-attempt total must remain exactly 50.
- If the marks validation fails, show a clear error and do not silently render the paper as valid.
- Do not modify question marks merely to make the new layout look correct.

## Phase 9 — Testing

Implement or update automated tests for:

1. Header rendering with dynamic university and subject metadata.
2. Main question and subquestion formatting.
3. Objective-question numbering.
4. OR-pair and OR-group rendering.
5. `ATTEMPT_ANY_N` rendering where supported.
6. Correct display of section and question marks.
7. Exact maximum-marks validation.
8. Long-question wrapping.
9. Multi-page A4 pagination.
10. Preview and PDF consistency.
11. Missing optional metadata.
12. Empty, incomplete, or invalid paper data.
13. Regression coverage for existing paper-generation functionality.

Generate a representative test paper and inspect the actual PDF pages. Do not rely exclusively on unit tests for visual correctness.

## Phase 10 — Acceptance Criteria

The task is complete only when:

- [ ] The paper resembles the uploaded KSV university examination paper.
- [ ] The university header is centered and professionally formatted.
- [ ] Candidate number, subject metadata, date, duration, total marks, and instructions are properly aligned.
- [ ] Main questions and subquestions follow the expected examination style.
- [ ] Marks appear in the correct positions.
- [ ] OR alternatives are clearly distinguishable and logically grouped.
- [ ] A4 page breaks are clean and printable.
- [ ] Preview and downloaded PDF are consistent.
- [ ] The design works dynamically for different universities, subjects, and marks.
- [ ] Existing AI generation, syllabus integration, approval workflow, and question-bank functionality remain intact.
- [ ] Marks validation remains accurate.
- [ ] Automated tests pass, and visual PDF verification is completed.

## Final Instructions

Work directly in the existing repository. First audit the current implementation, then make targeted changes, and finally run the relevant tests.

Do not rewrite unrelated pages or change the overall dashboard theme. The university examination paper itself should have a traditional, monochrome print design, even if the surrounding application uses its existing green-and-grey theme.

Do not insert the uploaded reference paper's questions as hardcoded production content. Use it only as a layout reference.

At completion, report:
1. Files changed.
2. Components and PDF rendering logic updated.
3. Pagination and marks-validation changes.
4. Tests executed and their actual results.
5. Any remaining differences from the supplied reference.

Do not claim that the redesign or tests are complete unless the changes have actually been implemented and verified.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-27T19:27:21+05:30.
</ADDITIONAL_METADATA>