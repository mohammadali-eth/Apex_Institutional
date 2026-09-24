# Visual Paper Blueprint Specification: QPMS

## Purpose
This document specifies the structure, mathematical validation rules, section partitioning, and real-time calculation mechanics for Visual Examination Blueprints in the **University Question Paper Management & Generation System**.

## Scope
Covers blueprint templates, sectional division, question type quotas, marks-per-question rules, choice modeling (compulsory vs optional items), and dynamic client/server validation.

---

## 1. Blueprint Conceptual Model

A Blueprint serves as the authoritative architectural specification for synthesizing an examination paper:

```mermaid
graph TD
    BP[Examination Blueprint: Total Marks = 100, Time = 3 Hours]
    BP --> SecA[Section A: Objective Conceptual]
    BP --> SecB[Section B: Short Technical]
    BP --> SecC[Section C: Analytical Problem Solving]
    BP --> SecD[Section D: Comprehensive System Design]

    SecA --> RuleA[10 MCQs x 1 Mark = 10 Marks | Compulsory]
    SecB --> RuleB[5 Short Answers x 2 Marks = 10 Marks | Answer 5 of 6]
    SecC --> RuleC[4 Analytical Problems x 5 Marks = 20 Marks | Answer 4 of 6]
    SecD --> RuleD[6 Comprehensive Design x 10 Marks = 60 Marks | Answer 6 of 8]
```

---

## 2. Real-Time Mathematical Validation (Requirement #30 Enforcement)

To guarantee that an examination paper is mathematically valid before generation or printing, the blueprint engine enforces strict arithmetic consistency:

### 2.1 Sectional Mark Calculations
For each section $s \in \{1, 2, \dots, S\}$:
$$\text{SectionTotalMarks}_s = \text{AttemptCount}_s \times \text{MarksPerQuestion}_s$$
$$\text{MaxAvailableMarks}_s = \text{QuestionCountInPaper}_s \times \text{MarksPerQuestion}_s$$

### 2.2 Global Paper Invariant
$$\sum_{s=1}^{S} \text{SectionTotalMarks}_s \equiv \text{PaperTargetMarks}$$

If $\sum \text{SectionTotalMarks}_s \neq \text{PaperTargetMarks}$, the user interface flags a real-time validation error, disabling the "Next" button in the wizard:
```text
VALIDATION ERROR: Blueprint marks sum to 90 Marks, but Target Examination requires 100 Marks. Please adjust Section C question count (+2 questions) or marks per question.
```

---

## 3. Blueprint Data Schema

```json
{
  "blueprintId": "bp-ds-sem3-std100",
  "title": "Autonomous BCA Semester 3 Standard Blueprint (100 Marks)",
  "courseId": "sub-ds",
  "courseCode": "CS-301",
  "totalMarks": 100,
  "durationMinutes": 180,
  "sections": [
    {
      "sectionId": "sec-a",
      "sectionOrder": 1,
      "title": "SECTION A: Conceptual Fundamentals",
      "instructions": "Answer all questions. Each question carries 1 mark.",
      "questionType": "mcq",
      "totalQuestionsInPaper": 10,
      "totalQuestionsToAttempt": 10,
      "marksPerQuestion": 1,
      "subtotalMarks": 10,
      "choiceType": "compulsory"
    },
    {
      "sectionId": "sec-b",
      "sectionOrder": 2,
      "title": "SECTION B: Short Technical Answers",
      "instructions": "Answer any 5 out of 7 questions. (5 x 2 = 10 Marks)",
      "questionType": "short",
      "totalQuestionsInPaper": 7,
      "totalQuestionsToAttempt": 5,
      "marksPerQuestion": 2,
      "subtotalMarks": 10,
      "choiceType": "internal_choice"
    },
    {
      "sectionId": "sec-c",
      "sectionOrder": 3,
      "title": "SECTION C: Analytical Data Structure Problems",
      "instructions": "Answer any 4 out of 6 questions. (4 x 5 = 20 Marks)",
      "questionType": "short",
      "totalQuestionsInPaper": 6,
      "totalQuestionsToAttempt": 4,
      "marksPerQuestion": 5,
      "subtotalMarks": 20,
      "choiceType": "internal_choice"
    },
    {
      "sectionId": "sec-d",
      "sectionOrder": 4,
      "title": "SECTION D: Comprehensive System Design & Implementation",
      "instructions": "Answer any 6 out of 8 questions. (6 x 10 = 60 Marks)",
      "questionType": "long",
      "totalQuestionsInPaper": 8,
      "totalQuestionsToAttempt": 6,
      "marksPerQuestion": 10,
      "subtotalMarks": 60,
      "choiceType": "internal_choice"
    }
  ]
}
```

---

## 4. Reusable Blueprint Templates

Institutions and Academic Boards can save blueprints as **Reusable Master Templates** (e.g., "Standard 50-Mark Midterm Template", "Standard 70-Mark University End-Sem Template", "Standard 100-Mark Autonomous Template").
When faculty configure an exam, they can instantiate a pre-approved template with one click, ensuring institutional compliance across dozens of parallel courses.

---

## Current State vs. Proposed State

* **Current State:** Basic editable table in `PaperGeneratorWizard.tsx` (Stage 4) that calculates total marks on the client. It lacks section choice modeling (e.g., "Answer 4 of 6"), template libraries, and server-side validation.
* **Proposed State:** A rich visual blueprint designer supporting internal choice modeling, reusable institutional templates, and real-time mathematical validation enforced on both client and server.

## Decisions
1. Enforce strict mathematical equivalence between the sum of sectional attempt marks and the overall target paper marks.
2. Allow departments to publish locked blueprint templates that faculty cannot deviate from for official university examinations.

## Open Questions
- None.

## Related Documents
- [QUESTION_PAPER_GENERATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_PAPER_GENERATION.md)
- [QUESTION_PAPER_LIFECYCLE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_PAPER_LIFECYCLE.md)
- [QUESTION_TYPES.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_TYPES.md)
