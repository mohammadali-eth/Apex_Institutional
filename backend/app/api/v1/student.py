import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.models import (
    User, Subject, Semester, Program, Department, Organization,
    Syllabus, Unit, Topic, Question, QuestionOption,
    StudentEnrollment, StudentSyllabusProgress,
    OnlineTest, TestQuestionSnapshot, TestAttempt, TestAttemptAnswer, TestLifecycleEvent,
    QuestionPaper, FacultyAssignment
)
from app.schemas.student import (
    StudentClassSummary, StudentClassDetail,
    TopicProgressItem, UnitSyllabusProgress, StudentSubjectSyllabusResponse,
    StudentSyllabusProgressRequest, StudentSyllabusProgressResponse,
    OnlineTestSummary, OnlineTestDetail, PracticeTestCreateRequest,
    TestStartResponse, StudentTestQuestion, TestAttemptDetail,
    AnswerSaveRequest, TestLifecycleEventRequest, TestSubmitResponse,
    TestResultSummary, TestResultDetail, QuestionReviewItem,
    StudentDashboardData
)
from app.schemas.common import StandardResponse
from app.api.deps import get_current_user
from app.services.audit_service import log_audit

router = APIRouter(prefix="/student", tags=["Student Assessment & Classroom"])

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

def ensure_student_enrollment(user: User, db: Session) -> Optional[StudentEnrollment]:
    """
    Ensures the student is enrolled in active program/semester coursework.
    If none exists, auto-enrolls into the primary semester course (e.g. BCA Sem 4).
    """
    enrollment = db.query(StudentEnrollment).filter(
        StudentEnrollment.user_id == user.id,
        StudentEnrollment.is_active == True
    ).first()

    if not enrollment:
        # Locate active semester with subjects (default BCA Sem 4)
        subj = db.query(Subject).filter(Subject.code == "BCA401").first()
        if subj and subj.semester_id:
            sem = subj.semester
            prog_id = sem.program_id
            enrollment = StudentEnrollment(
                user_id=user.id,
                program_id=prog_id,
                semester_id=sem.id,
                roll_number=f"APEX-STU-{user.id[:6].upper()}",
                is_active=True
            )
            db.add(enrollment)
            db.commit()
            db.refresh(enrollment)
    return enrollment

def get_enrolled_subjects(user: User, db: Session) -> List[Subject]:
    enrollment = ensure_student_enrollment(user, db)
    if not enrollment or not enrollment.semester_id:
        return []
    return db.query(Subject).filter(
        Subject.semester_id == enrollment.semester_id,
        Subject.is_active == True
    ).all()

# ==============================================================================
# 1. Classes & Classroom Section
# ==============================================================================

@router.get("/classes", response_model=StandardResponse[List[StudentClassSummary]])
def get_student_classes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all enrolled classes and subjects for the student"""
    subjects = get_enrolled_subjects(current_user, db)
    enrollment = ensure_student_enrollment(current_user, db)

    results: List[StudentClassSummary] = []
    for s in subjects:
        # Calculate syllabus progress
        units = []
        if s.syllabi and len(s.syllabi) > 0:
            units = s.syllabi[0].units

        total_topics = 0
        topic_ids = []
        for u in units:
            total_topics += len(u.topics)
            topic_ids.extend([t.id for t in u.topics])

        completed_topics = 0
        if topic_ids:
            completed_topics = db.query(StudentSyllabusProgress).filter(
                StudentSyllabusProgress.user_id == current_user.id,
                StudentSyllabusProgress.topic_id.in_(topic_ids),
                StudentSyllabusProgress.is_completed == True
            ).count()

        progress_pct = (completed_topics / total_topics * 100) if total_topics > 0 else 0.0

        # Teacher assignment
        teacher_assignment = db.query(FacultyAssignment).filter(
            FacultyAssignment.subject_id == s.id
        ).first()
        teacher_name = teacher_assignment.user.full_name if teacher_assignment and teacher_assignment.user else "Faculty Instructor"

        # Published papers count
        papers_count = db.query(QuestionPaper).filter(
            QuestionPaper.subject_id == s.id,
            QuestionPaper.status == "PUBLISHED"
        ).count()

        # Available tests count
        tests_count = db.query(OnlineTest).filter(
            OnlineTest.subject_id == s.id,
            OnlineTest.is_published == True
        ).count()

        results.append(StudentClassSummary(
            subject_id=s.id,
            subject_code=s.code,
            subject_name=s.name,
            program_name=enrollment.program.name if enrollment and enrollment.program else "Bachelor of Computer Applications",
            semester_name=s.semester.name if s.semester else "Semester 4",
            credits=s.credits,
            teacher_name=teacher_name,
            syllabus_units_count=len(units),
            syllabus_progress_pct=round(progress_pct, 1),
            published_papers_count=papers_count,
            available_tests_count=tests_count
        ))

    return StandardResponse(data=results)

@router.get("/classes/{subject_id}", response_model=StandardResponse[StudentClassDetail])
def get_student_class_detail(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full details, overview, and statistics for a single enrolled class"""
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Class subject not found")

    enrollment = ensure_student_enrollment(current_user, db)

    units = []
    if s.syllabi and len(s.syllabi) > 0:
        units = s.syllabi[0].units

    total_topics = 0
    topic_ids = []
    for u in units:
        total_topics += len(u.topics)
        topic_ids.extend([t.id for t in u.topics])

    completed_topics = 0
    if topic_ids:
        completed_topics = db.query(StudentSyllabusProgress).filter(
            StudentSyllabusProgress.user_id == current_user.id,
            StudentSyllabusProgress.topic_id.in_(topic_ids),
            StudentSyllabusProgress.is_completed == True
        ).count()

    progress_pct = (completed_topics / total_topics * 100) if total_topics > 0 else 0.0

    teacher_assignment = db.query(FacultyAssignment).filter(
        FacultyAssignment.subject_id == s.id
    ).first()
    teacher_name = teacher_assignment.user.full_name if teacher_assignment and teacher_assignment.user else "Faculty Instructor"

    papers_count = db.query(QuestionPaper).filter(
        QuestionPaper.subject_id == s.id,
        QuestionPaper.status == "PUBLISHED"
    ).count()

    tests_count = db.query(OnlineTest).filter(
        OnlineTest.subject_id == s.id,
        OnlineTest.is_published == True
    ).count()

    syl_resp = build_subject_syllabus_response(s, current_user.id, db)
    units_list = syl_resp.units if syl_resp else []

    return StandardResponse(data=StudentClassDetail(
        subject_id=s.id,
        subject_code=s.code,
        subject_name=s.name,
        program_name=enrollment.program.name if enrollment and enrollment.program else "Bachelor of Computer Applications",
        semester_name=s.semester.name if s.semester else "Semester 4",
        credits=s.credits,
        teacher_name=teacher_name,
        syllabus_units_count=len(units),
        syllabus_progress_pct=round(progress_pct, 1),
        progress_percent=round(progress_pct, 1),
        units_count=len(units),
        topics_count=total_topics,
        completed_topics_count=completed_topics,
        published_papers_count=papers_count,
        available_tests_count=tests_count,
        description=s.description or f"Standard university course curriculum covering theoretical foundations and practical laboratory components for {s.name}.",
        total_topics=total_topics,
        completed_topics=completed_topics,
        units=units_list
    ))

# ==============================================================================
# 2. Syllabus & Topic Progress Section
# ==============================================================================

@router.get("/syllabus", response_model=StandardResponse[List[StudentSubjectSyllabusResponse]])
def get_all_student_syllabi(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all enrolled subjects and their syllabus progress"""
    subjects = get_enrolled_subjects(current_user, db)
    results: List[StudentSubjectSyllabusResponse] = []

    for s in subjects:
        resp = build_subject_syllabus_response(s, current_user.id, db)
        if resp:
            results.append(resp)

    return StandardResponse(data=results)

@router.get("/syllabus/{subject_id}", response_model=StandardResponse[StudentSubjectSyllabusResponse])
def get_student_subject_syllabus(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve detailed syllabus units and topics for a specific enrolled subject"""
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subject not found")

    resp = build_subject_syllabus_response(s, current_user.id, db)
    if not resp:
        raise HTTPException(status_code=404, detail="No syllabus published for this subject")

    return StandardResponse(data=resp)

def build_subject_syllabus_response(subject: Subject, user_id: str, db: Session) -> Optional[StudentSubjectSyllabusResponse]:
    if not subject.syllabi or len(subject.syllabi) == 0:
        return None

    syl = subject.syllabi[0]
    completed_map = {
        p.topic_id: p.completed_at
        for p in db.query(StudentSyllabusProgress).filter(
            StudentSyllabusProgress.user_id == user_id,
            StudentSyllabusProgress.subject_id == subject.id,
            StudentSyllabusProgress.is_completed == True
        ).all()
    }

    total_topics = 0
    completed_topics = 0
    units_resp: List[UnitSyllabusProgress] = []

    for u in syl.units:
        unit_topics: List[TopicProgressItem] = []
        u_completed = 0
        for t in u.topics:
            total_topics += 1
            is_comp = t.id in completed_map
            if is_comp:
                completed_topics += 1
                u_completed += 1
            unit_topics.append(TopicProgressItem(
                id=t.id,
                topic_id=t.id,
                title=t.title,
                order_index=getattr(t, "topic_number", 1),
                is_completed=is_comp,
                completed_at=completed_map.get(t.id)
            ))

        units_resp.append(UnitSyllabusProgress(
            unit_id=u.id,
            unit_number=u.unit_number,
            title=u.title,
            description=u.description,
            topics_count=len(u.topics),
            completed_topics_count=u_completed,
            topics=unit_topics
        ))

    pct = (completed_topics / total_topics * 100) if total_topics > 0 else 0.0

    return StudentSubjectSyllabusResponse(
        subject_id=subject.id,
        subject_code=subject.code,
        subject_name=subject.name,
        syllabus_title=syl.title,
        version=syl.version,
        total_topics=total_topics,
        completed_topics=completed_topics,
        progress_percentage=round(pct, 1),
        units=units_resp
    )

@router.post("/syllabus/progress", response_model=StandardResponse[StudentSyllabusProgressResponse])
def update_syllabus_progress(
    req: StudentSyllabusProgressRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a syllabus topic as studied or uncompleted, persisting in PostgreSQL"""
    topic = db.query(Topic).filter(Topic.id == req.topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Syllabus topic not found")

    existing = db.query(StudentSyllabusProgress).filter(
        StudentSyllabusProgress.user_id == current_user.id,
        StudentSyllabusProgress.topic_id == req.topic_id
    ).first()

    subj_id = req.subject_id
    if not subj_id and topic.unit and topic.unit.syllabus:
        subj_id = topic.unit.syllabus.subject_id

    if req.is_completed:
        if not existing:
            rec = StudentSyllabusProgress(
                user_id=current_user.id,
                subject_id=subj_id,
                topic_id=req.topic_id,
                is_completed=True,
                completed_at=get_utc_now()
            )
            db.add(rec)
        else:
            existing.is_completed = True
            existing.completed_at = get_utc_now()
    else:
        if existing:
            db.delete(existing)

    db.commit()

    # Recalculate progress
    s = db.query(Subject).filter(Subject.id == subj_id).first()
    total_topics = 0
    if s and s.syllabi and len(s.syllabi) > 0:
        for u in s.syllabi[0].units:
            total_topics += len(u.topics)

    completed_count = db.query(StudentSyllabusProgress).filter(
        StudentSyllabusProgress.user_id == current_user.id,
        StudentSyllabusProgress.subject_id == subj_id,
        StudentSyllabusProgress.is_completed == True
    ).count()

    pct = (completed_count / total_topics * 100) if total_topics > 0 else 0.0

    log_audit(
        db,
        action="SYLLABUS_PROGRESS_UPDATED",
        entity_type="StudentSyllabusProgress",
        user_id=current_user.id,
        entity_id=req.topic_id,
        metadata={"subject_id": subj_id, "is_completed": req.is_completed}
    )

    return StandardResponse(
        success=True,
        message="Syllabus progress updated successfully",
        data=StudentSyllabusProgressResponse(
            subject_id=subj_id or "",
            total_topics=total_topics,
            completed_topics=completed_count,
            progress_percentage=round(pct, 1),
            updated_topic_id=req.topic_id,
            is_completed=req.is_completed
        )
    )

# ==============================================================================
# 3. Online Tests & Practice Test Builder
# ==============================================================================

@router.get("/tests", response_model=StandardResponse[List[OnlineTestSummary]])
def get_available_tests(
    subject_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve official and practice tests available for the student"""
    enrolled_subjects = get_enrolled_subjects(current_user, db)
    enrolled_ids = [s.id for s in enrolled_subjects]

    query = db.query(OnlineTest).filter(
        OnlineTest.subject_id.in_(enrolled_ids),
        OnlineTest.is_published == True
    )

    if subject_id:
        query = query.filter(OnlineTest.subject_id == subject_id)

    tests = query.order_by(OnlineTest.created_at.desc()).all()
    results: List[OnlineTestSummary] = []

    for t in tests:
        attempts = db.query(TestAttempt).filter(
            TestAttempt.test_id == t.id,
            TestAttempt.student_id == current_user.id
        ).all()

        attempts_taken = len(attempts)
        can_attempt = attempts_taken < t.attempt_limit
        best_score = max([a.total_score for a in attempts]) if attempts else None

        results.append(OnlineTestSummary(
            id=t.id,
            title=t.title,
            description=t.description,
            subject_id=t.subject_id,
            subject_code=t.subject.code if t.subject else "",
            subject_name=t.subject.name if t.subject else "",
            test_type=t.test_type,
            difficulty=t.difficulty,
            duration_minutes=t.duration_minutes,
            total_marks=t.total_marks,
            passing_marks=t.passing_marks,
            question_count=len(t.questions),
            attempt_limit=t.attempt_limit,
            attempts_taken=attempts_taken,
            best_score=best_score,
            can_attempt=can_attempt,
            is_published=t.is_published
        ))

    return StandardResponse(data=results)

@router.get("/tests/{test_id}", response_model=StandardResponse[OnlineTestDetail])
def get_test_details(
    test_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full test instructions, question types, and rules before starting"""
    t = db.query(OnlineTest).filter(OnlineTest.id == test_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Test not found")

    attempts = db.query(TestAttempt).filter(
        TestAttempt.test_id == t.id,
        TestAttempt.student_id == current_user.id
    ).all()

    attempts_taken = len(attempts)
    can_attempt = attempts_taken < t.attempt_limit
    best_score = max([a.total_score for a in attempts]) if attempts else None

    mcq_count = sum(1 for q in t.questions if q.question_type == "MCQ")
    tf_count = sum(1 for q in t.questions if q.question_type == "TRUE_FALSE")
    fill_count = sum(1 for q in t.questions if q.question_type == "FILL_BLANK")
    desc_count = sum(1 for q in t.questions if q.question_type == "DESCRIPTIVE")

    return StandardResponse(data=OnlineTestDetail(
        id=t.id,
        title=t.title,
        description=t.description,
        subject_id=t.subject_id,
        subject_code=t.subject.code if t.subject else "",
        subject_name=t.subject.name if t.subject else "",
        test_type=t.test_type,
        difficulty=t.difficulty,
        duration_minutes=t.duration_minutes,
        total_marks=t.total_marks,
        passing_marks=t.passing_marks,
        question_count=len(t.questions),
        attempt_limit=t.attempt_limit,
        attempts_taken=attempts_taken,
        best_score=best_score,
        can_attempt=can_attempt,
        is_published=t.is_published,
        instructions=t.instructions or "Answer all questions within the allocated time. Autosaver is active.",
        negative_marking=t.negative_marking,
        mcq_count=mcq_count,
        true_false_count=tf_count,
        fill_blank_count=fill_count,
        descriptive_count=desc_count
    ))

@router.post("/tests/practice", response_model=StandardResponse[OnlineTestSummary])
def create_practice_test(
    req: PracticeTestCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate an AI/Question-Bank assisted practice test for an enrolled subject.
    Extracts approved questions from question bank and freezes question snapshots.
    """
    # Verify enrollment
    enrolled_subjects = get_enrolled_subjects(current_user, db)
    if not any(s.id == req.subject_id for s in enrolled_subjects):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot generate practice test for a subject in which you are not enrolled."
        )

    subj = db.query(Subject).filter(Subject.id == req.subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Query approved questions
    query = db.query(Question).filter(
        Question.subject_id == req.subject_id,
        Question.status == "APPROVED"
    )

    if req.unit_ids and len(req.unit_ids) > 0:
        query = query.filter(Question.unit_id.in_(req.unit_ids))

    if req.difficulty != "MIXED":
        query = query.filter(Question.difficulty == req.difficulty)

    if req.question_types and len(req.question_types) > 0:
        query = query.filter(Question.question_type.in_(req.question_types))

    available_questions = query.order_by(func.random()).limit(req.question_count).all()

    # Fallback to broader difficulty if strict match yielded fewer than 3
    if len(available_questions) < 3:
        available_questions = db.query(Question).filter(
            Question.subject_id == req.subject_id,
            Question.status == "APPROVED"
        ).order_by(func.random()).limit(req.question_count).all()

    if len(available_questions) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient approved questions found in the question bank for this subject. Try selecting all units and mixed difficulty."
        )

    total_marks = sum(q.marks for q in available_questions)
    passing_marks = max(1, int(total_marks * 0.4))

    # Create OnlineTest
    practice_test = OnlineTest(
        subject_id=req.subject_id,
        title=f"Practice Test — {subj.code} ({req.difficulty.title()})",
        description=f"Automated AI/Question-Bank revision quiz covering {len(available_questions)} questions across chosen units.",
        test_type="PRACTICE_BANK",
        difficulty=req.difficulty,
        duration_minutes=req.duration_minutes,
        total_marks=total_marks,
        passing_marks=passing_marks,
        instructions="1. This is an adaptive self-assessment test.\n2. Automated auto-grading is available upon submission.\n3. Questions are chosen from university-approved question bank.",
        is_published=True,
        attempt_limit=10,
        negative_marking=0.0,
        created_by=current_user.id
    )
    db.add(practice_test)
    db.flush()

    # Create frozen question snapshots
    for idx, q in enumerate(available_questions):
        options_data = None
        correct_key = None

        if q.question_type == "MCQ" and q.options:
            options_data = json.dumps([{"key": o.option_key, "text": o.option_text} for o in q.options])
            correct_opt = next((o.option_key for o in q.options if o.is_correct), None)
            correct_key = correct_opt or "A"
        elif q.question_type == "TRUE_FALSE":
            correct_key = q.expected_answer or "True"
        elif q.question_type == "FILL_BLANK":
            correct_key = q.expected_answer or ""
        elif q.question_type == "DESCRIPTIVE":
            correct_key = q.expected_answer or ""

        snapshot = TestQuestionSnapshot(
            test_id=practice_test.id,
            question_id=q.id,
            order_index=idx + 1,
            question_text=q.question_text,
            question_type=q.question_type,
            marks=q.marks,
            options_json=options_data,
            correct_answer_key=correct_key,
            explanation=q.explanation
        )
        db.add(snapshot)

    db.commit()
    db.refresh(practice_test)

    log_audit(
        db,
        action="PRACTICE_TEST_CREATED",
        entity_type="OnlineTest",
        user_id=current_user.id,
        entity_id=practice_test.id,
        metadata={"subject_id": req.subject_id, "question_count": len(available_questions)}
    )

    return StandardResponse(
        success=True,
        message="Practice test generated successfully! You can start the assessment now.",
        data=OnlineTestSummary(
            id=practice_test.id,
            test_id=practice_test.id,
            title=practice_test.title,
            description=practice_test.description,
            subject_id=practice_test.subject_id,
            subject_code=subj.code,
            subject_name=subj.name,
            test_type=practice_test.test_type,
            difficulty=practice_test.difficulty,
            duration_minutes=practice_test.duration_minutes,
            total_marks=practice_test.total_marks,
            passing_marks=practice_test.passing_marks,
            question_count=len(available_questions),
            attempt_limit=practice_test.attempt_limit,
            attempts_taken=0,
            best_score=None,
            can_attempt=True,
            is_published=True
        )
    )

# ==============================================================================
# 4. Exam Sitting, Live Answering & Submissions
# ==============================================================================

@router.post("/tests/{test_id}/start", response_model=StandardResponse[TestStartResponse])
def start_test_attempt(
    test_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiates a new test attempt or resumes an existing in-progress sitting.
    Computes server-authoritative deadline.
    """
    t = db.query(OnlineTest).filter(OnlineTest.id == test_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Test not found")

    now = get_utc_now()

    # Check for active in-progress attempt
    active_attempt = db.query(TestAttempt).filter(
        TestAttempt.test_id == t.id,
        TestAttempt.student_id == current_user.id,
        TestAttempt.status == "IN_PROGRESS"
    ).first()

    if active_attempt:
        # Check if deadline expired
        deadline = active_attempt.deadline_at
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        if now > deadline:
            # Auto-submit expired attempt
            finalize_attempt(active_attempt, db, status="TIMED_OUT")
        else:
            # Resume sitting
            return StandardResponse(
                success=True,
                message="Resuming active test attempt",
                data=TestStartResponse(
                    attempt_id=active_attempt.id,
                    test_id=t.id,
                    attempt_number=active_attempt.attempt_number,
                    started_at=active_attempt.started_at,
                    deadline_at=active_attempt.deadline_at,
                    duration_minutes=t.duration_minutes,
                    total_questions=len(t.questions)
                )
            )

    # Check attempt limit
    attempts_count = db.query(TestAttempt).filter(
        TestAttempt.test_id == t.id,
        TestAttempt.student_id == current_user.id
    ).count()

    if attempts_count >= t.attempt_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You have reached the maximum attempt limit ({t.attempt_limit}) for this examination."
        )

    # Create new attempt with server deadline
    deadline_at = now + timedelta(minutes=t.duration_minutes)

    attempt = TestAttempt(
        test_id=t.id,
        student_id=current_user.id,
        attempt_number=attempts_count + 1,
        status="IN_PROGRESS",
        started_at=now,
        deadline_at=deadline_at
    )
    db.add(attempt)
    db.flush()

    # Pre-create empty answers for all snapshots
    for q in t.questions:
        ans = TestAttemptAnswer(
            attempt_id=attempt.id,
            question_snapshot_id=q.id,
            selected_option_key=None,
            answer_text=None,
            is_marked_for_review=False
        )
        db.add(ans)

    # Record event
    event = TestLifecycleEvent(
        attempt_id=attempt.id,
        event_type="STARTED",
        event_data=json.dumps({"started_at": now.isoformat(), "client_duration_min": t.duration_minutes})
    )
    db.add(event)

    db.commit()
    db.refresh(attempt)

    log_audit(
        db,
        action="TEST_ATTEMPT_STARTED",
        entity_type="TestAttempt",
        user_id=current_user.id,
        entity_id=attempt.id,
        metadata={"test_id": t.id, "attempt_number": attempt.attempt_number}
    )

    return StandardResponse(
        success=True,
        message="Examination attempt initialized successfully",
        data=TestStartResponse(
            attempt_id=attempt.id,
            test_id=t.id,
            attempt_number=attempt.attempt_number,
            started_at=attempt.started_at,
            deadline_at=attempt.deadline_at,
            duration_minutes=t.duration_minutes,
            total_questions=len(t.questions)
        )
    )

@router.get("/attempts/{attempt_id}", response_model=StandardResponse[TestAttemptDetail])
def get_attempt_workspace(
    attempt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve questions and saved answers for an active sitting.
    STRICT SECURITY RULE: Correct keys and explanations are NEVER exposed during test!
    """
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if attempt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another student's test attempt")

    now = get_utc_now()
    deadline = attempt.deadline_at
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)

    # Auto-finalize if deadline passed
    if attempt.status == "IN_PROGRESS" and now > deadline:
        finalize_attempt(attempt, db, status="TIMED_OUT")

    remaining_seconds = max(0, int((deadline - now).total_seconds()))

    # Build sanitized question list (no correct keys!)
    questions_list: List[StudentTestQuestion] = []
    for q in attempt.test.questions:
        options = None
        if q.options_json:
            try:
                options = json.loads(q.options_json)
            except:
                options = None

        questions_list.append(StudentTestQuestion(
            snapshot_id=q.id,
            order_index=q.order_index,
            question_text=q.question_text,
            question_type=q.question_type,
            marks=q.marks,
            options=options
        ))

    # Saved answers map
    saved_answers: Dict[str, Dict[str, Any]] = {}
    for a in attempt.answers:
        saved_answers[a.question_snapshot_id] = {
            "selected_option_key": a.selected_option_key,
            "answer_text": a.answer_text,
            "is_marked_for_review": a.is_marked_for_review
        }

    return StandardResponse(data=TestAttemptDetail(
        attempt_id=attempt.id,
        test_id=attempt.test_id,
        test_title=attempt.test.title,
        subject_name=attempt.test.subject.name if attempt.test.subject else "",
        status=attempt.status,
        started_at=attempt.started_at,
        deadline_at=attempt.deadline_at,
        remaining_seconds=remaining_seconds,
        total_marks=attempt.test.total_marks,
        questions=questions_list,
        saved_answers=saved_answers
    ))

@router.put("/attempts/{attempt_id}/answers/{snapshot_id}", response_model=StandardResponse[bool])
def autosave_answer(
    attempt_id: str,
    snapshot_id: str,
    req: AnswerSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Autosave answer response for a specific question snapshot"""
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    if not attempt or attempt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized attempt access")

    if attempt.status != "IN_PROGRESS":
        raise HTTPException(status_code=400, detail="Cannot save answers to a finalized examination")

    now = get_utc_now()
    deadline = attempt.deadline_at
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)

    if now > deadline:
        finalize_attempt(attempt, db, status="TIMED_OUT")
        raise HTTPException(status_code=400, detail="Examination deadline expired. Attempt auto-submitted.")

    ans = db.query(TestAttemptAnswer).filter(
        TestAttemptAnswer.attempt_id == attempt.id,
        TestAttemptAnswer.question_snapshot_id == snapshot_id
    ).first()

    if not ans:
        ans = TestAttemptAnswer(
            attempt_id=attempt.id,
            question_snapshot_id=snapshot_id
        )
        db.add(ans)

    if req.selected_option_key is not None:
        ans.selected_option_key = req.selected_option_key
    if req.answer_text is not None:
        ans.answer_text = req.answer_text
    if req.is_marked_for_review is not None:
        ans.is_marked_for_review = req.is_marked_for_review

    ans.updated_at = now
    db.commit()
    return StandardResponse(success=True, data=True)

@router.post("/attempts/{attempt_id}/event", response_model=StandardResponse[bool])
def log_test_event(
    attempt_id: str,
    req: TestLifecycleEventRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log browser fullscreen, focus loss, and integrity events"""
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    if not attempt or attempt.student_id != current_user.id:
        return StandardResponse(data=False)

    data_str = None
    if req.details is not None:
        data_str = json.dumps(req.details) if isinstance(req.details, (dict, list)) else str(req.details)
    elif req.event_data is not None:
        data_str = json.dumps(req.event_data) if isinstance(req.event_data, (dict, list)) else str(req.event_data)

    ev = TestLifecycleEvent(
        attempt_id=attempt.id,
        event_type=req.event_type,
        event_data=data_str
    )
    db.add(ev)
    db.commit()
    return StandardResponse(success=True, data=True)

def finalize_attempt(attempt: TestAttempt, db: Session, status: str = "SUBMITTED") -> TestAttempt:
    """Server-authoritative auto-grading and finalization algorithm"""
    if attempt.status in ["SUBMITTED", "TIMED_OUT"]:
        return attempt

    now = get_utc_now()
    attempt.status = status
    attempt.submitted_at = now

    auto_score = 0.0
    has_desc = False

    snapshots = {q.id: q for q in attempt.test.questions}

    for ans in attempt.answers:
        snap = snapshots.get(ans.question_snapshot_id)
        if not snap:
            continue

        if snap.question_type == "MCQ":
            ans.is_graded = True
            if ans.selected_option_key and snap.correct_answer_key:
                if ans.selected_option_key.strip().upper() == snap.correct_answer_key.strip().upper():
                    ans.marks_awarded = float(snap.marks)
                    auto_score += float(snap.marks)
                else:
                    ans.marks_awarded = -float(attempt.test.negative_marking) if attempt.test.negative_marking else 0.0
                    auto_score += ans.marks_awarded
            else:
                ans.marks_awarded = 0.0

        elif snap.question_type == "TRUE_FALSE":
            ans.is_graded = True
            if ans.selected_option_key and snap.correct_answer_key:
                if ans.selected_option_key.strip().lower() == snap.correct_answer_key.strip().lower():
                    ans.marks_awarded = float(snap.marks)
                    auto_score += float(snap.marks)
                else:
                    ans.marks_awarded = 0.0
            else:
                ans.marks_awarded = 0.0

        elif snap.question_type == "FILL_BLANK":
            ans.is_graded = True
            if ans.answer_text and snap.correct_answer_key:
                # Normalized string comparison
                if ans.answer_text.strip().lower() == snap.correct_answer_key.strip().lower():
                    ans.marks_awarded = float(snap.marks)
                    auto_score += float(snap.marks)
                else:
                    ans.marks_awarded = 0.0
            else:
                ans.marks_awarded = 0.0

        elif snap.question_type == "DESCRIPTIVE":
            # Descriptive questions require manual evaluation
            ans.is_graded = False
            ans.marks_awarded = 0.0
            has_desc = True

    attempt.auto_graded_score = max(0.0, auto_score)
    attempt.total_score = attempt.auto_graded_score
    attempt.has_pending_descriptive = has_desc
    attempt.is_graded = not has_desc # Fully graded if no descriptive items

    db.commit()
    db.refresh(attempt)
    return attempt

@router.post("/attempts/{attempt_id}/submit", response_model=StandardResponse[TestSubmitResponse])
def submit_test(
    attempt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Finalize, grade, and record official submission"""
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    if not attempt or attempt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized attempt submission")

    finalized = finalize_attempt(attempt, db, status="SUBMITTED")

    log_audit(
        db,
        action="TEST_SUBMITTED",
        entity_type="TestAttempt",
        user_id=current_user.id,
        entity_id=finalized.id,
        metadata={"total_score": finalized.total_score, "is_graded": finalized.is_graded}
    )

    msg = "Test submitted and graded successfully!"
    if finalized.has_pending_descriptive:
        msg = "Test submitted! Objective sections auto-graded; descriptive answers sent for instructor evaluation."

    return StandardResponse(
        success=True,
        message=msg,
        data=TestSubmitResponse(
            attempt_id=finalized.id,
            status=finalized.status,
            submitted_at=finalized.submitted_at or get_utc_now(),
            total_score=finalized.total_score,
            obtained_marks=finalized.total_score,
            total_marks=finalized.test.total_marks,
            percentage=round((finalized.total_score / finalized.test.total_marks * 100) if finalized.test.total_marks > 0 else 0.0, 1),
            auto_graded_score=finalized.auto_graded_score,
            is_graded=finalized.is_graded,
            has_pending_descriptive=finalized.has_pending_descriptive,
            message=msg
        )
    )

@router.post("/attempts/{attempt_id}/quit", response_model=StandardResponse[TestSubmitResponse])
def quit_test_early(
    attempt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Confirmed early exit from test — persists available answers and finalizes attempt"""
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    if not attempt or attempt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    ev = TestLifecycleEvent(
        attempt_id=attempt.id,
        event_type="QUIT",
        event_data=json.dumps({"quit_at": get_utc_now().isoformat()})
    )
    db.add(ev)

    finalized = finalize_attempt(attempt, db, status="SUBMITTED")
    return StandardResponse(
        success=True,
        message="Examination submitted upon early exit.",
        data=TestSubmitResponse(
            attempt_id=finalized.id,
            status=finalized.status,
            submitted_at=finalized.submitted_at or get_utc_now(),
            total_score=finalized.total_score,
            total_marks=finalized.test.total_marks,
            auto_graded_score=finalized.auto_graded_score,
            is_graded=finalized.is_graded,
            has_pending_descriptive=finalized.has_pending_descriptive,
            message="Examination submitted upon early exit."
        )
    )

# ==============================================================================
# 5. Results & Review Section
# ==============================================================================

@router.get("/results", response_model=StandardResponse[List[TestResultSummary]])
def get_student_results(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve history of submitted test results for authenticated student"""
    attempts = db.query(TestAttempt).filter(
        TestAttempt.student_id == current_user.id,
        TestAttempt.status.in_(["SUBMITTED", "TIMED_OUT"])
    ).order_by(TestAttempt.submitted_at.desc()).all()

    results: List[TestResultSummary] = []
    for a in attempts:
        total_marks = a.test.total_marks if a.test else 100
        pct = (a.total_score / total_marks * 100) if total_marks > 0 else 0.0

        results.append(TestResultSummary(
            attempt_id=a.id,
            test_id=a.test_id,
            test_title=a.test.title if a.test else "Examination",
            subject_name=a.test.subject.name if (a.test and a.test.subject) else "",
            submitted_at=a.submitted_at,
            total_score=a.total_score,
            total_marks=total_marks,
            percentage=round(pct, 1),
            status=a.status,
            is_graded=a.is_graded,
            has_pending_descriptive=a.has_pending_descriptive
        ))

    return StandardResponse(data=results)

@router.get("/results/{attempt_id}", response_model=StandardResponse[TestResultDetail])
def get_detailed_test_result(
    attempt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve score breakdown and question-by-question review with answer keys and explanations"""
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    if not attempt or attempt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to results")

    if attempt.status not in ["SUBMITTED", "TIMED_OUT"]:
        raise HTTPException(status_code=400, detail="Test is still in progress; results are not yet available.")

    total_marks = attempt.test.total_marks if attempt.test else 100
    pct = (attempt.total_score / total_marks * 100) if total_marks > 0 else 0.0
    passing = attempt.test.passing_marks if attempt.test else int(total_marks * 0.4)
    is_passed = attempt.total_score >= passing

    duration_sec = 0
    if attempt.started_at and attempt.submitted_at:
        duration_sec = max(0, int((attempt.submitted_at - attempt.started_at).total_seconds()))

    # Build review list
    ans_map = {a.question_snapshot_id: a for a in attempt.answers}
    reviews: List[QuestionReviewItem] = []

    for q in attempt.test.questions:
        a = ans_map.get(q.id)
        opts = None
        if q.options_json:
            try:
                opts = json.loads(q.options_json)
            except:
                opts = None

        is_corr = None
        marks_awarded = 0.0
        student_opt = None
        student_text = None
        eval_comment = None

        if a:
            student_opt = a.selected_option_key
            student_text = a.answer_text
            marks_awarded = a.marks_awarded
            eval_comment = a.evaluator_comment

            if a.is_graded:
                is_corr = a.marks_awarded > 0

        reviews.append(QuestionReviewItem(
            snapshot_id=q.id,
            order_index=q.order_index,
            question_text=q.question_text,
            question_type=q.question_type,
            marks=q.marks,
            marks_awarded=marks_awarded,
            obtained_marks=marks_awarded,
            student_selected_option=student_opt,
            student_answer_text=student_text,
            student_answer=student_opt or student_text,
            correct_answer_key=q.correct_answer_key,
            is_correct=is_corr,
            explanation=q.explanation,
            evaluator_comment=eval_comment,
            options=opts
        ))

    return StandardResponse(data=TestResultDetail(
        attempt_id=attempt.id,
        test_id=attempt.test_id,
        test_title=attempt.test.title if attempt.test else "Examination",
        subject_name=attempt.test.subject.name if (attempt.test and attempt.test.subject) else "",
        submitted_at=attempt.submitted_at,
        total_score=attempt.total_score,
        obtained_marks=attempt.total_score,
        total_marks=total_marks,
        percentage=round(pct, 1),
        status=attempt.status,
        is_graded=attempt.is_graded,
        has_pending_descriptive=attempt.has_pending_descriptive,
        passing_marks=passing,
        is_passed=is_passed,
        time_taken_seconds=duration_sec,
        evaluator_feedback=attempt.evaluator_feedback,
        questions_review=reviews,
        questions=reviews,
        total_questions=len(reviews),
        correct_count=sum(1 for r in reviews if r.is_correct is True),
        pending_eval_count=sum(1 for r in reviews if r.question_type == "DESCRIPTIVE" and not r.evaluator_comment)
    ))

# ==============================================================================
# 6. Student Dashboard Aggregator
# ==============================================================================

@router.get("/dashboard", response_model=StandardResponse[StudentDashboardData])
def get_student_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Single unified call providing all Google Classroom-style dashboard data"""
    enrollment = ensure_student_enrollment(current_user, db)
    subjects = get_enrolled_subjects(current_user, db)
    enrolled_ids = [s.id for s in subjects]

    # Classes summary
    classes_summary: List[StudentClassSummary] = []
    total_curriculum_topics = 0
    total_completed_topics = 0

    for s in subjects:
        units = s.syllabi[0].units if (s.syllabi and len(s.syllabi) > 0) else []
        u_topics = []
        for u in units:
            u_topics.extend([t.id for t in u.topics])

        t_cnt = len(u_topics)
        total_curriculum_topics += t_cnt

        comp_cnt = 0
        if u_topics:
            comp_cnt = db.query(StudentSyllabusProgress).filter(
                StudentSyllabusProgress.user_id == current_user.id,
                StudentSyllabusProgress.topic_id.in_(u_topics),
                StudentSyllabusProgress.is_completed == True
            ).count()

        total_completed_topics += comp_cnt
        prog_pct = (comp_cnt / t_cnt * 100) if t_cnt > 0 else 0.0

        teacher_assignment = db.query(FacultyAssignment).filter(FacultyAssignment.subject_id == s.id).first()
        t_name = teacher_assignment.user.full_name if teacher_assignment and teacher_assignment.user else "Faculty Instructor"

        p_cnt = db.query(QuestionPaper).filter(QuestionPaper.subject_id == s.id, QuestionPaper.status == "PUBLISHED").count()
        test_cnt = db.query(OnlineTest).filter(OnlineTest.subject_id == s.id, OnlineTest.is_published == True).count()

        classes_summary.append(StudentClassSummary(
            subject_id=s.id,
            subject_code=s.code,
            subject_name=s.name,
            program_name=enrollment.program.name if enrollment and enrollment.program else "Bachelor of Computer Applications",
            semester_name=s.semester.name if s.semester else "Semester 4",
            credits=s.credits,
            teacher_name=t_name,
            syllabus_units_count=len(units),
            syllabus_progress_pct=round(prog_pct, 1),
            published_papers_count=p_cnt,
            available_tests_count=test_cnt
        ))

    overall_progress = (total_completed_topics / total_curriculum_topics * 100) if total_curriculum_topics > 0 else 0.0

    # Upcoming / Available tests
    tests = db.query(OnlineTest).filter(
        OnlineTest.subject_id.in_(enrolled_ids),
        OnlineTest.is_published == True
    ).order_by(OnlineTest.created_at.desc()).limit(6).all()

    upcoming_tests_summary: List[OnlineTestSummary] = []
    for t in tests:
        attempts = db.query(TestAttempt).filter(
            TestAttempt.test_id == t.id,
            TestAttempt.student_id == current_user.id
        ).all()
        upcoming_tests_summary.append(OnlineTestSummary(
            id=t.id,
            title=t.title,
            description=t.description,
            subject_id=t.subject_id,
            subject_code=t.subject.code if t.subject else "",
            subject_name=t.subject.name if t.subject else "",
            test_type=t.test_type,
            difficulty=t.difficulty,
            duration_minutes=t.duration_minutes,
            total_marks=t.total_marks,
            passing_marks=t.passing_marks,
            question_count=len(t.questions),
            attempt_limit=t.attempt_limit,
            attempts_taken=len(attempts),
            best_score=max([a.total_score for a in attempts]) if attempts else None,
            can_attempt=len(attempts) < t.attempt_limit,
            is_published=t.is_published
        ))

    # Recent Results
    recent_attempts = db.query(TestAttempt).filter(
        TestAttempt.student_id == current_user.id,
        TestAttempt.status.in_(["SUBMITTED", "TIMED_OUT"])
    ).order_by(TestAttempt.submitted_at.desc()).limit(5).all()

    recent_results_summary: List[TestResultSummary] = []
    for a in recent_attempts:
        tot_m = a.test.total_marks if a.test else 100
        recent_results_summary.append(TestResultSummary(
            attempt_id=a.id,
            test_id=a.test_id,
            test_title=a.test.title if a.test else "Examination",
            subject_name=a.test.subject.name if (a.test and a.test.subject) else "",
            submitted_at=a.submitted_at,
            total_score=a.total_score,
            total_marks=tot_m,
            percentage=round((a.total_score / tot_m * 100) if tot_m > 0 else 0.0, 1),
            status=a.status,
            is_graded=a.is_graded,
            has_pending_descriptive=a.has_pending_descriptive
        ))

    # Recent Published Papers
    recent_papers = db.query(QuestionPaper).filter(
        QuestionPaper.subject_id.in_(enrolled_ids),
        QuestionPaper.status == "PUBLISHED"
    ).order_by(QuestionPaper.created_at.desc()).limit(5).all()

    papers_data = [
        {
            "id": p.id,
            "title": p.title,
            "subject_name": p.subject.name if p.subject else "",
            "subject_code": p.subject.code if p.subject else "",
            "exam_name": p.exam_name,
            "total_marks": p.total_marks,
            "duration_minutes": p.duration_minutes,
            "created_at": p.created_at.isoformat() if p.created_at else None
        }
        for p in recent_papers
    ]

    return StandardResponse(data=StudentDashboardData(
        student_name=current_user.full_name,
        roll_number=enrollment.roll_number if enrollment else None,
        program_name=enrollment.program.name if enrollment and enrollment.program else "Bachelor of Computer Applications",
        semester_name=enrollment.semester.name if enrollment and enrollment.semester else "Semester 4",
        classes=classes_summary,
        enrolled_classes=classes_summary,
        upcoming_tests=upcoming_tests_summary,
        recent_results=recent_results_summary,
        recent_papers=papers_data,
        published_papers=papers_data,
        overall_syllabus_progress=round(overall_progress, 1),
        overall_syllabus_percent=round(overall_progress, 1)
    ))
