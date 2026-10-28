"""
Centralized Marks Calculation Engine for QPMS Apex.
Deterministic single source of truth for:
- Candidate attempt marks vs displayed marks
- OR / Alternative question groups (e.g. Q1(a) [3M] OR Q1(b) [3M] -> Attempt = 3M, Displayed = 6M)
- ATTEMPT_ANY_N section / group rules (e.g. Attempt 5 out of 8 [2M each] -> Attempt = 10M, Displayed = 16M)
- Mismatched marks validation in choice groups
- Consistent paper validation, preview, answer key, and PDF generation
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
from sqlalchemy.orm import Session
from app.models.models import QuestionPaper, QuestionPaperSection, QuestionPaperQuestion

@dataclass
class QuestionItemSummary:
    id: str
    question_id: str
    order_index: int
    marks: int
    group_id: Optional[str]
    group_type: str
    selection_rule: str
    required_attempts: int
    alternative_label: Optional[str]
    is_compulsory: bool

@dataclass
class QuestionGroupMarksSummary:
    group_id: Optional[str]
    group_type: str # SINGLE, OR_PAIR, OR_GROUP, ATTEMPT_ANY_N
    selection_rule: str
    required_attempts: int
    candidate_attempt_marks: int
    displayed_marks: int
    questions: List[QuestionItemSummary] = field(default_factory=list)

@dataclass
class SectionMarksSummary:
    section_id: str
    section_name: str
    section_type: str # STANDARD, CHOICE_SECTION
    selection_rule: str # ALL, ATTEMPT_ANY_N
    required_attempts: Optional[int]
    target_marks: int
    candidate_attempt_marks: int
    displayed_marks: int
    questions_count: int
    groups: List[QuestionGroupMarksSummary] = field(default_factory=list)

@dataclass
class PaperMarksSummary:
    paper_id: str
    total_target_marks: int
    total_candidate_attempt_marks: int
    total_displayed_marks: int
    total_questions_count: int
    total_groups_count: int
    is_valid: bool
    sections: List[SectionMarksSummary] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

def calculate_paper_marks(db: Session, paper_id: str, update_db: bool = False) -> PaperMarksSummary:
    """
    Computes deterministic marks breakdown for a Question Paper.
    Accurately accounts for OR pairs and ATTEMPT_ANY_N choice rules.
    """
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        return PaperMarksSummary(
            paper_id=paper_id,
            total_target_marks=0,
            total_candidate_attempt_marks=0,
            total_displayed_marks=0,
            total_questions_count=0,
            total_groups_count=0,
            is_valid=False,
            errors=["Question paper not found"]
        )

    sections = db.query(QuestionPaperSection).filter(
        QuestionPaperSection.paper_id == paper_id
    ).order_by(QuestionPaperSection.order_index).all()

    errors: List[str] = []
    warnings: List[str] = []
    sections_summary: List[SectionMarksSummary] = []
    total_paper_attempt_marks = 0
    total_paper_displayed_marks = 0
    total_paper_questions = 0
    total_paper_groups = 0

    if not sections:
        errors.append("Question paper has no sections configured.")

    for sec in sections:
        sec_questions = db.query(QuestionPaperQuestion).filter(
            QuestionPaperQuestion.section_id == sec.id
        ).order_by(QuestionPaperQuestion.order_index).all()

        sec_displayed_marks = sum(pq.marks for pq in sec_questions)
        sec_questions_count = len(sec_questions)
        total_paper_questions += sec_questions_count

        # Organize questions into groups
        # If question has group_id, bucket together; otherwise standalone
        group_buckets: Dict[str, List[QuestionPaperQuestion]] = {}
        standalone_pqs: List[QuestionPaperQuestion] = []

        for pq in sec_questions:
            # Sync legacy or_group_id if group_id is null
            gid = pq.group_id or pq.or_group_id
            if gid:
                group_buckets.setdefault(gid, []).append(pq)
            else:
                standalone_pqs.append(pq)

        groups_summary: List[QuestionGroupMarksSummary] = []
        sec_attempt_marks = 0

        # Handle Section-level ATTEMPT_ANY_N (e.g. Answer any 5 out of 8 questions)
        sec_rule = (sec.selection_rule or "ALL").upper()
        if sec_rule == "ATTEMPT_ANY_N" and sec.required_attempts and sec.required_attempts > 0:
            req_att = min(sec.required_attempts, sec_questions_count)
            # Check question mark uniformity in choice section
            distinct_marks = list({pq.marks for pq in sec_questions})
            if len(distinct_marks) > 1:
                warnings.append(
                    f"Section '{sec.name}' has 'Attempt any {req_att}' rule but contains questions with varying marks ({distinct_marks}). Average or standard per-question weight will apply."
                )
                # Compute attempt marks based on average or first
                mark_per_q = distinct_marks[0]
            elif len(distinct_marks) == 1:
                mark_per_q = distinct_marks[0]
            else:
                mark_per_q = 0

            sec_attempt_marks = req_att * mark_per_q
            # Add all as single group or individual items
            q_items = [
                QuestionItemSummary(
                    id=pq.id,
                    question_id=pq.question_id,
                    order_index=pq.order_index,
                    marks=pq.marks,
                    group_id=pq.group_id or pq.or_group_id,
                    group_type=pq.group_type or "ATTEMPT_ANY_N",
                    selection_rule="ATTEMPT_ANY_N",
                    required_attempts=req_att,
                    alternative_label=pq.alternative_label,
                    is_compulsory=False
                )
                for pq in sec_questions
            ]
            groups_summary.append(QuestionGroupMarksSummary(
                group_id=None,
                group_type="ATTEMPT_ANY_N",
                selection_rule="ATTEMPT_ANY_N",
                required_attempts=req_att,
                candidate_attempt_marks=sec_attempt_marks,
                displayed_marks=sec_displayed_marks,
                questions=q_items
            ))
            total_paper_groups += 1

        else:
            # Standard section: Evaluate each OR group and standalone question
            # 1. Evaluate Question Groups
            for gid, pqs in group_buckets.items():
                first_pq = pqs[0]
                g_type = (first_pq.group_type or "OR_PAIR").upper()
                g_rule = (first_pq.selection_rule or g_type).upper()
                g_req = first_pq.required_attempts or 1
                group_marks_list = [pq.marks for pq in pqs]

                # University rule: All alternatives in an OR group MUST carry identical marks!
                if len(set(group_marks_list)) > 1:
                    errors.append(
                        f"OR Group '{gid}' in Section '{sec.name}' contains alternatives with unequal marks: {group_marks_list}. All alternatives must have the same mark weight."
                    )

                # Attempt marks is the marks of ONE alternative (or req_att alternatives)
                single_alt_marks = group_marks_list[0] if group_marks_list else 0
                g_attempt_marks = single_alt_marks * g_req
                g_displayed_marks = sum(group_marks_list)

                sec_attempt_marks += g_attempt_marks

                q_items = [
                    QuestionItemSummary(
                        id=pq.id,
                        question_id=pq.question_id,
                        order_index=pq.order_index,
                        marks=pq.marks,
                        group_id=gid,
                        group_type=g_type,
                        selection_rule=g_rule,
                        required_attempts=g_req,
                        alternative_label=pq.alternative_label,
                        is_compulsory=pq.is_compulsory
                    )
                    for pq in pqs
                ]
                groups_summary.append(QuestionGroupMarksSummary(
                    group_id=gid,
                    group_type=g_type,
                    selection_rule=g_rule,
                    required_attempts=g_req,
                    candidate_attempt_marks=g_attempt_marks,
                    displayed_marks=g_displayed_marks,
                    questions=q_items
                ))
                total_paper_groups += 1

            # 2. Standalone questions
            for pq in standalone_pqs:
                q_attempt = pq.marks
                sec_attempt_marks += q_attempt
                q_item = QuestionItemSummary(
                    id=pq.id,
                    question_id=pq.question_id,
                    order_index=pq.order_index,
                    marks=pq.marks,
                    group_id=None,
                    group_type="SINGLE",
                    selection_rule="SINGLE",
                    required_attempts=1,
                    alternative_label=None,
                    is_compulsory=pq.is_compulsory
                )
                groups_summary.append(QuestionGroupMarksSummary(
                    group_id=None,
                    group_type="SINGLE",
                    selection_rule="SINGLE",
                    required_attempts=1,
                    candidate_attempt_marks=q_attempt,
                    displayed_marks=q_attempt,
                    questions=[q_item]
                ))
                total_paper_groups += 1

        total_paper_attempt_marks += sec_attempt_marks
        total_paper_displayed_marks += sec_displayed_marks

        sec_summary = SectionMarksSummary(
            section_id=sec.id,
            section_name=sec.name,
            section_type=getattr(sec, 'section_type', 'STANDARD') or 'STANDARD',
            selection_rule=sec_rule,
            required_attempts=sec.required_attempts,
            target_marks=sec.total_marks or sec_attempt_marks,
            candidate_attempt_marks=sec_attempt_marks,
            displayed_marks=sec_displayed_marks,
            questions_count=sec_questions_count,
            groups=groups_summary
        )
        sections_summary.append(sec_summary)

        # Update section cached marks if requested
        if update_db:
            sec.displayed_marks = sec_displayed_marks
            sec.total_marks = sec_attempt_marks

    if update_db:
        db.commit()

    # Reconcile Candidate Attempt Marks with Target Paper Total Marks
    if total_paper_attempt_marks != paper.total_marks:
        errors.append(
            f"Total marks mismatch: Question paper target maximum is {paper.total_marks} Marks, "
            f"but candidate attempt marks calculate to {total_paper_attempt_marks} Marks "
            f"(Total displayed marks across all alternatives: {total_paper_displayed_marks} Marks)."
        )

    is_valid = len(errors) == 0

    return PaperMarksSummary(
        paper_id=paper_id,
        total_target_marks=paper.total_marks,
        total_candidate_attempt_marks=total_paper_attempt_marks,
        total_displayed_marks=total_paper_displayed_marks,
        total_questions_count=total_paper_questions,
        total_groups_count=total_paper_groups,
        is_valid=is_valid,
        sections=sections_summary,
        errors=errors,
        warnings=warnings
    )

def calculate_blueprint_marks(
    distribution: List[Dict[str, Any]],
    total_target_marks: int
) -> Dict[str, Any]:
    """
    Computes pre-generation marks for a blueprint configuration.
    Recognizes items with OR choices and ATTEMPT_ANY_N sections.
    """
    attempt_marks = 0
    displayed_marks = 0
    question_count = 0
    errors: List[str] = []
    warnings: List[str] = []

    for item in distribution:
        # Handle dict or Pydantic object
        if hasattr(item, "model_dump"):
            d = item.model_dump()
        else:
            d = dict(item)

        count = d.get("count", 0)
        marks = d.get("marks", 0)
        has_or = d.get("has_or_alternative", False) or d.get("or_choice", False)
        sel_rule = (d.get("selection_rule") or "SINGLE").upper()
        req_attempts = d.get("required_attempts")

        if sel_rule == "ATTEMPT_ANY_N" and req_attempts and req_attempts > 0:
            item_displayed = count * marks
            item_attempt = min(req_attempts, count) * marks
            item_q_count = count
        elif has_or or sel_rule in ["OR_PAIR", "OR_GROUP"]:
            # For OR pairs: count pairs, each pair has 2 alternatives
            # E.g. count = 2 pairs: displayed = 4 * marks, attempt = 2 * marks
            # If count represents total questions with OR pairs, handle appropriately:
            item_attempt = count * marks
            item_displayed = (count * 2) * marks
            item_q_count = count * 2
        else:
            item_attempt = count * marks
            item_displayed = count * marks
            item_q_count = count

        attempt_marks += item_attempt
        displayed_marks += item_displayed
        question_count += item_q_count

    if attempt_marks != total_target_marks:
        errors.append(
            f"Configured blueprint candidate attempt marks sum to {attempt_marks} Marks, "
            f"which does not match target total marks of {total_target_marks} Marks "
            f"(Total displayed questions would equal {displayed_marks} Marks)."
        )

    return {
        "is_valid": len(errors) == 0,
        "total_marks_expected": total_target_marks,
        "total_candidate_attempt_marks": attempt_marks,
        "total_displayed_marks": displayed_marks,
        "total_questions_calculated": question_count,
        "errors": errors,
        "warnings": warnings
    }
