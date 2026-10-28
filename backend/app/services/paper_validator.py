import re
import string
from typing import Dict, List, Set, Any, Tuple
from sqlalchemy.orm import Session
from app.models.models import (
    QuestionPaper, QuestionPaperSection, QuestionPaperQuestion, Question,
    PaperBlueprint, PaperValidationReport, Subject, Syllabus, Unit
)
from app.schemas.paper import PaperValidationResult, PaperGenerationRequest, BlueprintValidationResponse
from app.services.marks_engine import calculate_paper_marks, calculate_blueprint_marks

def normalize_text(text: str) -> str:
    """Normalize text for exact and near-duplicate similarity analysis."""
    if not text:
        return ""
    # Lowercase, remove punctuation and extra whitespaces
    text = text.lower()
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"\s+", " ", text).strip()
    return text

def calculate_token_similarity(text1: str, text2: str) -> float:
    """Computes Jaccard similarity of word tokens."""
    tokens1 = set(normalize_text(text1).split())
    tokens2 = set(normalize_text(text2).split())
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)

def validate_blueprint_request(db: Session, req: PaperGenerationRequest) -> BlueprintValidationResponse:
    """Pre-generation blueprint validation engine."""
    errors: List[str] = []
    warnings: List[str] = []

    subject = db.query(Subject).filter(Subject.id == req.subject_id).first()
    if not subject:
        return BlueprintValidationResponse(
            is_valid=False,
            total_marks_expected=req.total_marks,
            total_marks_calculated=0,
            total_questions_calculated=0,
            errors=["Subject not found"],
            warnings=[]
        )

    if not req.distribution or len(req.distribution) == 0:
        errors.append("Blueprint must have at least one question distribution item configured.")
        return BlueprintValidationResponse(
            is_valid=False,
            total_marks_expected=req.total_marks,
            total_marks_calculated=0,
            total_questions_calculated=0,
            errors=errors,
            warnings=warnings
        )

    bp_marks = calculate_blueprint_marks(
        [item.model_dump() if hasattr(item, "model_dump") else dict(item) for item in req.distribution],
        req.total_marks
    )
    calculated_marks = bp_marks["total_candidate_attempt_marks"]
    calculated_questions = bp_marks["total_questions_calculated"]
    if not bp_marks["is_valid"]:
        errors.extend(bp_marks["errors"])

    if req.duration_minutes <= 0:
        errors.append("Exam duration must be greater than zero.")

    # Difficulty distribution check
    if req.difficulty:
        diff_sum = req.difficulty.easy + req.difficulty.medium + req.difficulty.hard
        if diff_sum != 100:
            warnings.append(f"Difficulty percentages sum to {diff_sum}% instead of 100%. System will normalize proportions.")

    # Bloom's taxonomy check
    if req.bloom_taxonomy:
        bloom_sum = (
            req.bloom_taxonomy.remember + req.bloom_taxonomy.understand +
            req.bloom_taxonomy.apply + req.bloom_taxonomy.analyze +
            req.bloom_taxonomy.evaluate + req.bloom_taxonomy.create
        )
        if bloom_sum != 100:
            warnings.append(f"Bloom's taxonomy percentages sum to {bloom_sum}% instead of 100%. Proportions will be normalized.")

    # Source ratio check
    if req.source_ratio:
        ratio_sum = req.source_ratio.bank_percentage + req.source_ratio.ai_percentage
        if ratio_sum != 100:
            warnings.append(f"Source ratio sums to {ratio_sum}% instead of 100%. Normalized automatically.")

    is_valid = len(errors) == 0
    return BlueprintValidationResponse(
        is_valid=is_valid,
        total_marks_expected=req.total_marks,
        total_marks_calculated=calculated_marks,
        total_questions_calculated=calculated_questions,
        errors=errors,
        warnings=warnings
    )

def validate_question_paper(db: Session, paper_id: str) -> PaperValidationResult:
    """Comprehensive Deterministic Validation Engine operating on structured paper."""
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        return PaperValidationResult(
            is_valid=False,
            status="FAILED",
            total_marks_expected=0,
            total_marks_actual=0,
            total_questions=0,
            duplicate_count=0,
            errors=["Question paper not found"],
            warnings=[]
        )

    errors: List[str] = []
    warnings: List[str] = []
    seen_question_ids: Set[str] = set()
    duplicate_count = 0
    total_questions = 0

    # 1. Deterministic calculation of candidate attempt marks & group consistency
    marks_summary = calculate_paper_marks(db, paper_id, update_db=True)
    total_marks_actual = marks_summary.total_candidate_attempt_marks
    for me_err in marks_summary.errors:
        if me_err not in errors:
            errors.append(me_err)
    for me_warn in marks_summary.warnings:
        if me_warn not in warnings:
            warnings.append(me_warn)
    
    unit_coverage: Dict[str, int] = {}
    difficulty_breakdown: Dict[str, int] = {"EASY": 0, "MEDIUM": 0, "HARD": 0}
    bloom_breakdown: Dict[str, int] = {
        "REMEMBER": 0, "UNDERSTAND": 0, "APPLY": 0,
        "ANALYZE": 0, "EVALUATE": 0, "CREATE": 0
    }
    source_composition: Dict[str, int] = {"QUESTION_BANK": 0, "AI_GENERATED": 0}
    
    # Store questions for pairwise similarity checks
    paper_question_texts: List[Tuple[str, str]] = [] # (q_id, normalized_text)
    
    # Check internal choice groups consistency
    or_groups: Dict[str, List[int]] = {}

    sections = db.query(QuestionPaperSection).filter(
        QuestionPaperSection.paper_id == paper_id
    ).order_by(QuestionPaperSection.order_index).all()

    if not sections:
        errors.append("Question paper has no sections configured.")

    for section in sections:
        section_questions = db.query(QuestionPaperQuestion).filter(
            QuestionPaperQuestion.section_id == section.id
        ).order_by(QuestionPaperQuestion.order_index).all()

        if not section_questions:
            warnings.append(f"Section '{section.name}' does not contain any questions.")

        section_marks = 0
        for pq in section_questions:
            total_questions += 1
            section_marks += pq.marks

            # Track internal choice group marks
            if pq.or_group_id:
                or_groups.setdefault(pq.or_group_id, []).append(pq.marks)

            # Duplicate question ID detection
            if pq.question_id in seen_question_ids:
                duplicate_count += 1
                errors.append(f"Duplicate question detected: Question ID '{pq.question_id}' appears multiple times.")
            else:
                seen_question_ids.add(pq.question_id)

            # Load question entity
            q = db.query(Question).filter(Question.id == pq.question_id).first()
            if not q:
                errors.append(f"Associated question '{pq.question_id}' was not found in the Question Bank.")
                continue

            # Completeness checks
            if not q.question_text or len(q.question_text.strip()) < 5:
                errors.append(f"Question in Section '{section.name}' has empty or trivially short text.")

            if q.question_type == "MCQ":
                if len(q.options) < 2:
                    errors.append(f"MCQ Question '{q.id[:8]}' has fewer than 2 options.")
                has_correct = any(opt.is_correct for opt in q.options)
                if not has_correct:
                    errors.append(f"MCQ Question '{q.id[:8]}' has no correct option selected.")
            
            # Answer key and marking scheme completeness
            has_answer = (
                (q.expected_answer and q.expected_answer.strip()) or
                (pq.expected_answer and pq.expected_answer.strip()) or
                (q.question_type == "MCQ" and any(opt.is_correct for opt in q.options)) or
                (q.explanation and q.explanation.strip())
            )
            if not has_answer:
                warnings.append(f"Question '{q.id[:8]}' lacks an expected answer or solution explanation.")

            if q.question_type in ["DESCRIPTIVE", "SHORT", "LONG"] and pq.marks >= 5:
                has_rubric = (
                    (q.marking_rubric and q.marking_rubric.strip()) or
                    (pq.marking_scheme and pq.marking_scheme.strip())
                )
                if not has_rubric:
                    warnings.append(f"Descriptive Question '{q.id[:8]}' ({pq.marks}M) lacks a step-wise marking rubric.")

            # Record text for near-duplicate comparison
            norm_q = normalize_text(q.question_text)
            paper_question_texts.append((q.id, norm_q))

            # Unit tracking
            unit_key = q.unit.title if q.unit else "Unassigned Unit"
            unit_coverage[unit_key] = unit_coverage.get(unit_key, 0) + 1

            # Difficulty tracking
            diff = (q.difficulty or "MEDIUM").upper()
            difficulty_breakdown[diff] = difficulty_breakdown.get(diff, 0) + 1

            # Bloom's taxonomy tracking
            bloom = (getattr(pq, 'bloom_level', None) or getattr(q, 'bloom_level', 'UNDERSTAND') or 'UNDERSTAND').upper()
            bloom_breakdown[bloom] = bloom_breakdown.get(bloom, 0) + 1

            # Source composition tracking
            src = (getattr(pq, 'source_type', None) or getattr(q, 'source_type', 'QUESTION_BANK') or 'QUESTION_BANK').upper()
            source_composition[src] = source_composition.get(src, 0) + 1

    # Near-duplicate pairwise semantic check within the paper
    dedup_warnings = []
    for i in range(len(paper_question_texts)):
        for j in range(i + 1, len(paper_question_texts)):
            id1, t1 = paper_question_texts[i]
            id2, t2 = paper_question_texts[j]
            sim = calculate_token_similarity(t1, t2)
            if sim > 0.85:
                duplicate_count += 1
                dedup_warnings.append(
                    f"High textual similarity ({int(sim*100)}%) between Question {id1[:6]} and Question {id2[:6]}."
                )

    if dedup_warnings:
        for dw in dedup_warnings[:3]:
            warnings.append(dw)

    # Unit distribution check
    if len(unit_coverage) < 2 and total_questions > 4:
        warnings.append(
            f"Low curriculum coverage: all questions are from only {len(unit_coverage)} unit(s). "
            f"Consider balancing questions across multiple syllabus units."
        )

    # Grounding check: Verify subject has syllabus
    syllabus = db.query(Syllabus).filter(Syllabus.subject_id == paper.subject_id).first()
    grounding_status = {
        "has_syllabus": syllabus is not None,
        "units_in_syllabus": len(syllabus.units) if syllabus else 0,
        "units_covered": len(unit_coverage)
    }

    # Evaluate validation status
    is_valid = len(errors) == 0
    if not is_valid:
        status_str = "FAILED"
    elif len(warnings) > 0:
        status_str = "PASSED_WITH_WARNINGS"
    else:
        status_str = "PASSED"

    deduplication_summary = {
        "exact_duplicates": duplicate_count,
        "high_similarity_pairs": len(dedup_warnings),
        "total_analyzed": len(paper_question_texts)
    }

    # Persist or update PaperValidationReport in database
    report = db.query(PaperValidationReport).filter(PaperValidationReport.paper_id == paper_id).first()
    if not report:
        report = PaperValidationReport(
            paper_id=paper_id,
            is_valid=is_valid,
            status=status_str,
            total_marks_expected=paper.total_marks,
            total_marks_actual=total_marks_actual,
            total_questions=total_questions,
            duplicate_count=duplicate_count,
            errors=errors,
            warnings=warnings,
            unit_coverage=unit_coverage,
            difficulty_breakdown=difficulty_breakdown,
            bloom_breakdown=bloom_breakdown,
            source_composition=source_composition,
            deduplication_summary=deduplication_summary,
            grounding_checks=grounding_status
        )
        db.add(report)
    else:
        report.is_valid = is_valid
        report.status = status_str
        report.total_marks_expected = paper.total_marks
        report.total_marks_actual = total_marks_actual
        report.total_questions = total_questions
        report.duplicate_count = duplicate_count
        report.errors = errors
        report.warnings = warnings
        report.unit_coverage = unit_coverage
        report.difficulty_breakdown = difficulty_breakdown
        report.bloom_breakdown = bloom_breakdown
        report.source_composition = source_composition
        report.deduplication_summary = deduplication_summary
        report.grounding_checks = grounding_status
    
    db.commit()

    return PaperValidationResult(
        is_valid=is_valid,
        status=status_str,
        total_marks_expected=paper.total_marks,
        total_marks_actual=total_marks_actual,
        total_questions=total_questions,
        duplicate_count=duplicate_count,
        errors=errors,
        warnings=warnings,
        unit_coverage=unit_coverage,
        difficulty_breakdown=difficulty_breakdown,
        bloom_breakdown=bloom_breakdown,
        source_composition=source_composition,
        deduplication_summary=deduplication_summary,
        grounding_checks=grounding_status
    )
