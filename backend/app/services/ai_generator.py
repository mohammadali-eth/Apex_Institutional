import json
import random
import re
import string
import uuid
from typing import List, Dict, Set, Optional, Tuple, Any
import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.models import (
    QuestionPaper, QuestionPaperSection, QuestionPaperQuestion, Question,
    QuestionOption, Subject, Syllabus, Unit, Topic, PaperBlueprint, GenerationJob
)
from app.schemas.paper import (
    PaperGenerationRequest, QuestionRegenerateRequest, SectionRegenerateRequest
)
from app.services.paper_validator import (
    validate_question_paper, validate_blueprint_request, normalize_text, calculate_token_similarity
)
from app.services.marks_engine import calculate_paper_marks
from app.services.syllabus_service import check_syllabus_readiness, get_grounded_curriculum
from app.services.ai_provider_service import ai_provider_service

BLOOM_VERBS = {
    "REMEMBER": ["Define", "State", "List", "Identify", "Recall", "Name"],
    "UNDERSTAND": ["Explain", "Describe", "Distinguish between", "Summarize", "Illustrate", "Interpret"],
    "APPLY": ["Apply", "Demonstrate", "Calculate", "Solve", "Construct", "Implement"],
    "ANALYZE": ["Analyze", "Compare and contrast", "Differentiate", "Investigate", "Deconstruct"],
    "EVALUATE": ["Evaluate", "Assess", "Justify", "Critique", "Defend", "Determine the validity of"],
    "CREATE": ["Design", "Formulate", "Propose", "Develop", "Synthesize", "Plan an architecture for"]
}

def generate_question_via_llm_api(
    provider: str,
    prompt: str,
    system_instruction: str
) -> Optional[Dict[str, Any]]:
    """Calls configured LLM provider (Gemini or OpenAI) with bounded timeout and JSON response parsing."""
    try:
        if provider == "gemini" and settings.GEMINI_API_KEY:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
            payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": f"{system_instruction}\n\n{prompt}"}]}
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.4
                }
            }
            with httpx.Client(timeout=25.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text_val = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        return json.loads(text_val)
        elif provider == "openai" and settings.OPENAI_API_KEY:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
            payload = {
                "model": settings.OPENAI_MODEL,
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.4
            }
            with httpx.Client(timeout=25.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content_str = data["choices"][0]["message"]["content"]
                    return json.loads(content_str)
    except Exception as e:
        print(f"[AI Provider Fallback] LLM API call error ({provider}): {e}")
    return None

def synthesize_grounded_question(
    subject: Subject,
    unit: Optional[Unit],
    topic: Optional[Topic],
    q_type: str,
    marks: int,
    difficulty: str,
    bloom_level: str,
    rng: random.Random
) -> Dict[str, Any]:
    """
    Deterministically synthesizes a syllabus-grounded academic question conforming to
    Bloom's taxonomy level, subject curriculum, and university examination standards.
    """
    unit_title = unit.title if unit else subject.name
    clean_unit = re.sub(r"^Unit\s+\d+:\s*", "", unit_title).strip()
    topic_title = topic.title if topic else clean_unit
    clean_topic = re.sub(r"^(Topic\s+)?[\d\.]+:\s*", "", topic_title).strip()

    verbs = BLOOM_VERBS.get(bloom_level.upper(), BLOOM_VERBS["UNDERSTAND"])
    chosen_verb = rng.choice(verbs)

    if q_type.upper() == "MCQ":
        q_text = f"Which of the following statements best illustrates '{clean_topic}' in the context of {clean_unit}?"
        options = [
            {"key": "A", "text": f"It establishes optimal state guarantees and consistency protocols for {clean_topic}.", "is_correct": True},
            {"key": "B", "text": f"It completely bypasses verification and schema constraints during query runtime.", "is_correct": False},
            {"key": "C", "text": f"It deprecates transaction logs in favor of unverified memory buffers.", "is_correct": False},
            {"key": "D", "text": f"It restricts all processing to single-threaded sequential execution without indexing.", "is_correct": False}
        ]
        rng.shuffle(options)
        # Re-assign keys A, B, C, D
        for idx, k in enumerate(["A", "B", "C", "D"]):
            options[idx]["key"] = k

        explanation = f"Option correctly identifies the foundational principle of '{clean_topic}', adhering to {bloom_level} specifications."
        expected_ans = next(opt["key"] for opt in options if opt["is_correct"])
        rubric = f"1 Mark for selecting the correct option ({expected_ans}). Zero marks for incorrect or multiple options."
    
    elif q_type.upper() in ["TRUE_FALSE"]:
        q_text = f"In {clean_unit}, '{clean_topic}' strictly guarantees predictable state transitions without side effects."
        options = [
            {"key": "A", "text": "True", "is_correct": True},
            {"key": "B", "text": "False", "is_correct": False}
        ]
        explanation = f"True: {clean_topic} enforces verified invariants within standard curriculum guidelines."
        expected_ans = "True"
        rubric = "1 Mark for the correct response. 0 marks otherwise."
    
    elif q_type.upper() in ["FILL_BLANK"]:
        q_text = f"The primary design principle governing {clean_topic} in {clean_unit} is known as __________."
        options = []
        expected_ans = clean_topic.split()[0] if clean_topic else "Invariant"
        explanation = f"The required term is '{expected_ans}' which defines the core invariant."
        rubric = f"1 Mark for exact term '{expected_ans}' or acceptable academic synonym."
    
    else: # SHORT, DESCRIPTIVE, LONG
        if marks <= 3:
            q_text = f"{chosen_verb} the foundational concept of {clean_topic} and identify two key operational benefits in {clean_unit}."
            expected_ans = f"1. Formal definition of {clean_topic}.\n2. Two distinct operational benefits with brief technical rationale."
            rubric = f"Definition: 1.5 Marks; Benefits & Technical Rationale: 1.5 Marks (Total {marks} Marks)."
            explanation = f"Short response addressing core principles of {clean_topic}."
            options = []
        elif marks <= 6:
            q_text = f"{chosen_verb} the structural mechanism and architecture of {clean_topic}. Provide a clear analytical justification of its role in {clean_unit}."
            expected_ans = f"1. Architectural overview and core component interactions of {clean_topic}.\n2. Mathematical/structural justification.\n3. Practical constraints and error recovery procedures."
            rubric = f"Architecture & Component Diagram: 2.5 Marks; Analytical Justification: 2.5 Marks (Total {marks} Marks)."
            explanation = f"Descriptive response detailing architectural tradeoffs and invariants of {clean_topic}."
            options = []
        else:
            q_text = f"Comprehensive Problem: {chosen_verb} an end-to-end framework utilizing {clean_topic} within modern {clean_unit}. Evaluate edge cases, algorithmic complexity, and failure modes."
            expected_ans = f"1. Comprehensive system model and architecture.\n2. In-depth algorithmic/conceptual analysis.\n3. Detailed evaluation of failure modes and mitigations."
            rubric = f"System Model & Design: 4 Marks; Algorithmic Analysis: 3 Marks; Failure Modes & Tradeoffs: 3 Marks (Total {marks} Marks)."
            explanation = f"Advanced essay question testing synthesis, evaluation, and system design."
            options = []

    return {
        "question_text": q_text,
        "question_type": q_type.upper(),
        "marks": marks,
        "difficulty": difficulty.upper(),
        "bloom_level": bloom_level.upper(),
        "options": options,
        "expected_answer": expected_ans,
        "marking_rubric": rubric,
        "explanation": explanation
    }

def generate_question_paper_hybrid(
    db: Session,
    request: PaperGenerationRequest,
    user_id: Optional[str] = None,
    job_id: Optional[str] = None
) -> QuestionPaper:
    """
    Phase 1, 3, 4, 5 Grounded Hybrid Generation Engine.
    Combines approved Question Bank questions with newly generated AI questions
    grounded in syllabus units and topics, observing strict blueprints and deduplication.
    """
    # 1. Blueprint Validation
    val_bp = validate_blueprint_request(db, request)
    if not val_bp.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Blueprint validation failed: {'; '.join(val_bp.errors)}"
        )

    # 2. Check Subject & Syllabus Readiness
    readiness = check_syllabus_readiness(db, request.subject_id)
    readiness_msg = readiness.get("message") or readiness.get("status_message", "Syllabus not available")
    if readiness["status"] in ["UNAVAILABLE", "INCOMPLETE"] and not request.allow_fallback:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Syllabus is {readiness['status'].lower()} for this subject ({readiness_msg}). Explicit consent (allow_fallback=true) is required to generate in Fallback Mode."
        )

    subject = db.query(Subject).filter(Subject.id == request.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    is_syllabus_grounded = (readiness["status"] == "AVAILABLE")
    generation_mode = "SYLLABUS_GROUNDED" if is_syllabus_grounded else "FALLBACK_ACADEMIC"
    syllabus_version = readiness.get("syllabus_version", 1) if is_syllabus_grounded else None
    
    if is_syllabus_grounded:
        syllabus_obj, curriculum_units, unit_topics = get_grounded_curriculum(db, request.subject_id)
        units = curriculum_units
    else:
        syllabus = db.query(Syllabus).filter(Syllabus.subject_id == subject.id).first()
        units = syllabus.units if syllabus and syllabus.units else []
        curriculum_units = units
        unit_topics = {}
        for u in units:
            unit_topics[u.id] = u.topics if u.topics else []

    unit_cursor = 0

    # 3. Source ratio targets
    bank_pct = 50
    ai_pct = 50
    if request.source_ratio:
        bank_pct = max(0, min(100, request.source_ratio.bank_percentage))
        ai_pct = 100 - bank_pct

    # 4. Bloom Taxonomy distribution setup
    bloom_list = ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"]
    bloom_weights = [20, 30, 25, 15, 5, 5]
    if request.bloom_taxonomy:
        bloom_weights = [
            request.bloom_taxonomy.remember,
            request.bloom_taxonomy.understand,
            request.bloom_taxonomy.apply,
            request.bloom_taxonomy.analyze,
            request.bloom_taxonomy.evaluate,
            request.bloom_taxonomy.create
        ]
        if sum(bloom_weights) <= 0:
            bloom_weights = [20, 30, 25, 15, 5, 5]

    # Difficulty targets
    diff_target = request.difficulty

    # 5. Fetch approved questions from Question Bank
    all_approved_bank = db.query(Question).filter(
        Question.subject_id == request.subject_id,
        Question.status == "APPROVED"
    ).all()

    # Reproducible RNG
    rng = random.Random(request.seed) if request.seed is not None else random.Random()

    # 6. Initialize Question Paper entity
    paper = QuestionPaper(
        subject_id=request.subject_id,
        academic_year_id=request.academic_year_id,
        semester_id=request.semester_id,
        title=request.title,
        exam_name=request.exam_name,
        duration_minutes=request.duration_minutes,
        total_marks=request.total_marks,
        instructions=request.instructions,
        status="GENERATED",
        version=1,
        is_syllabus_grounded=is_syllabus_grounded,
        syllabus_version=syllabus_version,
        generation_mode=generation_mode,
        created_by=user_id
    )
    db.add(paper)
    db.flush()

    # 7. Persist Paper Blueprint Snapshot
    blueprint_snapshot = PaperBlueprint(
        paper_id=paper.id,
        subject_id=request.subject_id,
        title=request.title,
        exam_name=request.exam_name,
        duration_minutes=request.duration_minutes,
        total_marks=request.total_marks,
        blueprint_config=request.model_dump(),
        source_ratio={"bank_percentage": bank_pct, "ai_percentage": ai_pct},
        difficulty_target=request.difficulty.model_dump() if request.difficulty else {"easy": 30, "medium": 50, "hard": 20},
        bloom_target=request.bloom_taxonomy.model_dump() if request.bloom_taxonomy else {},
        unit_weightage=request.unit_distribution or {},
        created_by=user_id
    )
    db.add(blueprint_snapshot)
    db.flush()

    # 8. Create Sections
    section_map: Dict[str, QuestionPaperSection] = {}
    q_order_tracker: Dict[str, int] = {}

    def get_or_create_section(
        sec_name: str,
        sec_instr: str,
        order_idx: int,
        sec_type: str = "STANDARD",
        sec_rule: str = "ALL",
        req_attempts: Optional[int] = None,
        target_marks: int = 0
    ) -> QuestionPaperSection:
        if sec_name not in section_map:
            sec = QuestionPaperSection(
                paper_id=paper.id,
                name=sec_name,
                instructions=sec_instr,
                order_index=order_idx,
                section_type=sec_type,
                selection_rule=sec_rule,
                required_attempts=req_attempts,
                total_marks=target_marks
            )
            db.add(sec)
            db.flush()
            section_map[sec_name] = sec
            q_order_tracker[sec.id] = 1
        return section_map[sec_name]

    # Pre-configure dynamic sections from blueprint sections_config if supplied
    if request.sections_config:
        for idx, scfg in enumerate(request.sections_config):
            get_or_create_section(
                sec_name=scfg.get("name", f"Section {chr(65+idx)}"),
                sec_instr=scfg.get("instructions", "Answer all required questions."),
                order_idx=scfg.get("order_index", idx + 1),
                sec_type=scfg.get("section_type", "STANDARD"),
                sec_rule=scfg.get("selection_rule", "ALL"),
                req_attempts=scfg.get("required_attempts"),
                target_marks=scfg.get("total_marks", 0)
            )
    else:
        # Check if distribution items specify explicit section names
        explicit_sec_names = []
        for item in request.distribution:
            if item.section_name and item.section_name not in explicit_sec_names:
                explicit_sec_names.append(item.section_name)

        if explicit_sec_names:
            for idx, sname in enumerate(explicit_sec_names):
                get_or_create_section(sname, "Answer all required questions.", idx + 1)
        else:
            sec_a = get_or_create_section("Section A", "Objective & Short Questions. Answer all questions.", 1)
            sec_b = get_or_create_section("Section B", "Analytical & Medium Answer Questions. Answer all required questions.", 2)
            sec_c = get_or_create_section("Section C", "Long Answer / Essay Questions. Detailed solutions required.", 3)

    used_question_ids: Set[str] = set()
    used_texts: List[str] = [normalize_text(q.question_text) for q in all_approved_bank]

    def add_question_item(
        target_sec: QuestionPaperSection,
        target_q_type: str,
        target_marks: int,
        is_compulsory: bool,
        group_id: Optional[str] = None,
        group_type: str = "SINGLE",
        selection_rule: str = "SINGLE",
        required_attempts: int = 1,
        alternative_label: Optional[str] = None,
        group_marks: Optional[int] = None
    ):
        nonlocal used_question_ids, used_texts, unit_cursor
        # Check bank eligibility
        matching_bank = [
            q for q in all_approved_bank
            if q.id not in used_question_ids
            and q.marks == target_marks
            and (
                q.question_type.upper() == target_q_type or
                (target_q_type == "DESCRIPTIVE" and q.question_type.upper() not in ["MCQ", "TRUE_FALSE", "FILL_BLANK"])
            )
        ]
        use_bank = len(matching_bank) > 0 and (rng.randint(1, 100) <= bank_pct)

        if use_bank:
            chosen_q = rng.choice(matching_bank)
            used_question_ids.add(chosen_q.id)
            order_idx = q_order_tracker[target_sec.id]
            q_order_tracker[target_sec.id] += 1

            pq = QuestionPaperQuestion(
                section_id=target_sec.id,
                question_id=chosen_q.id,
                order_index=order_idx,
                marks=chosen_q.marks,
                is_compulsory=is_compulsory,
                or_group_id=group_id,
                group_id=group_id,
                group_type=group_type,
                selection_rule=selection_rule,
                required_attempts=required_attempts,
                alternative_label=alternative_label,
                group_marks=group_marks or target_marks,
                source_type="QUESTION_BANK",
                bloom_level=getattr(chosen_q, 'bloom_level', 'UNDERSTAND') or 'UNDERSTAND',
                marking_scheme=getattr(chosen_q, 'marking_rubric', None) or f"{chosen_q.marks} Marks upon correct evaluation.",
                expected_answer=chosen_q.expected_answer,
                syllabus_provenance={
                    "is_grounded": is_syllabus_grounded,
                    "syllabus_version": syllabus_version,
                    "unit_id": chosen_q.unit_id,
                    "unit_title": chosen_q.unit.title if chosen_q.unit else None,
                    "unit_number": chosen_q.unit.unit_number if chosen_q.unit else None,
                    "topic_id": chosen_q.topic_id,
                    "topic_title": chosen_q.topic.title if chosen_q.topic else None,
                    "source": "QUESTION_BANK",
                    "generation_mode": generation_mode
                }
            )
            db.add(pq)
        else:
            # Select target unit and topic with 100% curriculum cycling
            if curriculum_units:
                target_unit = curriculum_units[unit_cursor % len(curriculum_units)]
                unit_cursor += 1
                topics_in_unit = unit_topics.get(target_unit.id, [])
                target_topic = rng.choice(topics_in_unit) if topics_in_unit else None
            else:
                target_unit = rng.choice(units) if units else None
                topics_in_unit = unit_topics.get(target_unit.id, []) if target_unit else []
                target_topic = rng.choice(topics_in_unit) if topics_in_unit else None

            chosen_bloom = rng.choices(bloom_list, weights=bloom_weights, k=1)[0]
            chosen_diff = "MEDIUM"
            if diff_target:
                diff_choices = ["EASY", "MEDIUM", "HARD"]
                chosen_diff = rng.choices(diff_choices, weights=[diff_target.easy, diff_target.medium, diff_target.hard], k=1)[0]

            unit_title_str = getattr(target_unit, "title", None)
            unit_num_val = getattr(target_unit, "unit_number", None)
            topic_title_str = getattr(target_topic, "title", None)

            # Attempt live AI provider generation first
            ai_res = ai_provider_service.generate_grounded_question(
                subject_name=subject.name,
                subject_code=subject.code or "",
                unit_title=unit_title_str,
                unit_number=unit_num_val,
                topic_title=topic_title_str,
                question_type=target_q_type,
                marks=target_marks,
                difficulty=chosen_diff,
                bloom_level=chosen_bloom
            )

            if ai_res and ai_res.get("question_text"):
                synth_q = {
                    "question_text": ai_res["question_text"],
                    "question_type": target_q_type,
                    "marks": target_marks,
                    "difficulty": chosen_diff,
                    "bloom_level": chosen_bloom,
                    "options": ai_res.get("options", []),
                    "expected_answer": ai_res.get("expected_answer", "Standard technical response."),
                    "marking_rubric": ai_res.get("marking_rubric", f"{target_marks} Marks upon correct academic answer."),
                    "explanation": ai_res.get("explanation", f"AI generated question grounded in {unit_title_str or subject.name}.")
                }
                source_label = "AI_PROVIDER"
            else:
                synth_q = synthesize_grounded_question(
                    subject=subject,
                    unit=target_unit,
                    topic=target_topic,
                    q_type=target_q_type,
                    marks=target_marks,
                    difficulty=chosen_diff,
                    bloom_level=chosen_bloom,
                    rng=rng
                )
                source_label = "ACADEMIC_SYNTHESIZER"

            norm_synth = normalize_text(synth_q["question_text"])
            retries = 0
            while any(calculate_token_similarity(norm_synth, ut) > 0.85 for ut in used_texts) and retries < 3:
                retries += 1
                chosen_bloom = rng.choice(bloom_list)
                synth_q = synthesize_grounded_question(
                    subject=subject,
                    unit=target_unit,
                    topic=target_topic,
                    q_type=target_q_type,
                    marks=target_marks,
                    difficulty=chosen_diff,
                    bloom_level=chosen_bloom,
                    rng=rng
                )
                norm_synth = normalize_text(synth_q["question_text"])

            used_texts.append(norm_synth)

            new_q = Question(
                subject_id=subject.id,
                unit_id=target_unit.id if target_unit else None,
                topic_id=target_topic.id if target_topic else None,
                question_text=synth_q["question_text"],
                question_type=synth_q["question_type"],
                marks=synth_q["marks"],
                difficulty=synth_q["difficulty"],
                bloom_level=synth_q["bloom_level"],
                source_type="AI_GENERATED",
                status="APPROVED",
                explanation=synth_q["explanation"],
                expected_answer=synth_q["expected_answer"],
                marking_rubric=synth_q["marking_rubric"],
                created_by=user_id
            )
            db.add(new_q)
            db.flush()

            for opt in synth_q.get("options", []):
                q_opt = QuestionOption(
                    question_id=new_q.id,
                    option_key=opt["key"],
                    option_text=opt["text"],
                    is_correct=opt["is_correct"]
                )
                db.add(q_opt)

            order_idx = q_order_tracker[target_sec.id]
            q_order_tracker[target_sec.id] += 1

            pq = QuestionPaperQuestion(
                section_id=target_sec.id,
                question_id=new_q.id,
                order_index=order_idx,
                marks=new_q.marks,
                is_compulsory=is_compulsory,
                or_group_id=group_id,
                group_id=group_id,
                group_type=group_type,
                selection_rule=selection_rule,
                required_attempts=required_attempts,
                alternative_label=alternative_label,
                group_marks=group_marks or target_marks,
                source_type="AI_GENERATED",
                bloom_level=synth_q["bloom_level"],
                marking_scheme=synth_q["marking_rubric"],
                expected_answer=synth_q["expected_answer"],
                syllabus_provenance={
                    "is_grounded": is_syllabus_grounded,
                    "syllabus_version": syllabus_version,
                    "unit_id": target_unit.id if target_unit else None,
                    "unit_title": unit_title_str,
                    "unit_number": unit_num_val,
                    "topic_id": target_topic.id if target_topic else None,
                    "topic_title": topic_title_str,
                    "source": source_label,
                    "generation_mode": generation_mode
                }
            )
            db.add(pq)

    # 9. Iterate blueprint distribution and generate/select questions
    for item in request.distribution:
        needed_count = item.count
        q_type = item.question_type.upper()
        marks = item.marks

        # Locate or create the target section
        if item.section_name:
            target_sec = get_or_create_section(
                item.section_name,
                item.instructions or "Answer required questions.",
                len(section_map) + 1
            )
        elif marks <= 2 and "Section A" in section_map:
            target_sec = section_map["Section A"]
        elif marks <= 5 and "Section B" in section_map:
            target_sec = section_map["Section B"]
        elif "Section C" in section_map:
            target_sec = section_map["Section C"]
        else:
            target_sec = list(section_map.values())[0]

        # Update section choice rules if defined on distribution item
        if (item.selection_rule or "").upper() == "ATTEMPT_ANY_N" or item.required_attempts:
            target_sec.selection_rule = "ATTEMPT_ANY_N"
            target_sec.section_type = "CHOICE_SECTION"
            if item.required_attempts:
                target_sec.required_attempts = item.required_attempts

        # Check if distribution item specifies OR alternatives
        is_or_group = bool(
            item.has_or_alternative or
            item.or_choice or
            (item.selection_rule or "").upper() in ["OR_PAIR", "OR_GROUP"]
        )

        if is_or_group:
            # Generate OR pairs
            alt_b_type = (item.or_question_type or item.question_type).upper()
            alt_b_marks = item.or_marks or item.marks

            for _ in range(needed_count):
                pair_group_id = str(uuid.uuid4())
                # Alternative A
                add_question_item(
                    target_sec=target_sec,
                    target_q_type=q_type,
                    target_marks=marks,
                    is_compulsory=item.is_compulsory,
                    group_id=pair_group_id,
                    group_type="OR_PAIR",
                    selection_rule="OR_PAIR",
                    required_attempts=1,
                    alternative_label="a",
                    group_marks=marks
                )
                # Alternative B
                add_question_item(
                    target_sec=target_sec,
                    target_q_type=alt_b_type,
                    target_marks=alt_b_marks,
                    is_compulsory=item.is_compulsory,
                    group_id=pair_group_id,
                    group_type="OR_PAIR",
                    selection_rule="OR_PAIR",
                    required_attempts=1,
                    alternative_label="b",
                    group_marks=marks
                )
        else:
            # Standalone questions
            item_sel_rule = (item.selection_rule or "SINGLE").upper()
            item_req_att = item.required_attempts or 1
            for _ in range(needed_count):
                add_question_item(
                    target_sec=target_sec,
                    target_q_type=q_type,
                    target_marks=marks,
                    is_compulsory=item.is_compulsory,
                    group_id=None,
                    group_type=item_sel_rule,
                    selection_rule=item_sel_rule,
                    required_attempts=item_req_att,
                    alternative_label=None,
                    group_marks=marks
                )

    db.flush()

    # 10. Clean up any empty sections
    for sec_name, target_sec in list(section_map.items()):
        cnt = db.query(QuestionPaperQuestion).filter(QuestionPaperQuestion.section_id == target_sec.id).count()
        if cnt == 0:
            db.delete(target_sec)

    db.commit()
    db.refresh(paper)

    # 11. Run deterministic marks calculation and validation engine
    calculate_paper_marks(db, paper.id, update_db=True)
    val_report = validate_question_paper(db, paper.id)
    if not val_report.is_valid:
        # Rollback and report detailed failures
        db.delete(paper)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Generated paper failed deterministic validation: {'; '.join(val_report.errors)}"
        )

    # If job_id exists, update job
    if job_id:
        job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
        if job:
            job.status = "COMPLETED"
            job.progress = 100
            job.paper_id = paper.id
            job.status_message = "Generation and validation completed successfully"
            db.commit()

    return paper

def regenerate_single_question(
    db: Session,
    paper_id: str,
    pq_id: str,
    preference: str = "ANY",
    user_id: Optional[str] = None
) -> QuestionPaper:
    """In-place question regeneration with lock guards and automatic re-validation."""
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if getattr(paper, 'is_locked', False) or paper.status in ["FINALIZED", "PUBLISHED", "ARCHIVED"]:
        raise HTTPException(status_code=400, detail=f"Cannot alter question paper with status '{paper.status}'. Paper is locked.")

    pq = db.query(QuestionPaperQuestion).filter(
        QuestionPaperQuestion.id == pq_id,
        QuestionPaperQuestion.section.has(paper_id=paper_id)
    ).first()
    if not pq:
        raise HTTPException(status_code=404, detail="Question item not found in paper")

    old_q = db.query(Question).filter(Question.id == pq.question_id).first()
    subject = paper.subject
    syllabus = db.query(Syllabus).filter(Syllabus.subject_id == subject.id).first()
    units: List[Unit] = syllabus.units if syllabus and syllabus.units else []

    # Exclude all question IDs currently in paper
    current_q_ids = set(
        q_row[0] for q_row in db.query(QuestionPaperQuestion.question_id).join(
            QuestionPaperSection
        ).filter(QuestionPaperSection.paper_id == paper_id).all()
    )

    candidate_bank = []
    if preference.upper() in ["BANK", "ANY"]:
        candidate_bank = db.query(Question).filter(
            Question.subject_id == subject.id,
            Question.status == "APPROVED",
            Question.marks == pq.marks,
            Question.question_type == (old_q.question_type if old_q else "DESCRIPTIVE"),
            ~Question.id.in_(current_q_ids)
        ).all()

    if candidate_bank and preference.upper() != "AI":
        new_q = random.choice(candidate_bank)
        pq.question_id = new_q.id
        pq.source_type = "QUESTION_BANK"
        pq.bloom_level = getattr(new_q, 'bloom_level', 'UNDERSTAND') or 'UNDERSTAND'
        pq.marking_scheme = getattr(new_q, 'marking_rubric', None) or f"{new_q.marks} Marks upon correct evaluation."
        pq.expected_answer = new_q.expected_answer
        pq.syllabus_provenance = {
            "is_grounded": paper.is_syllabus_grounded,
            "syllabus_version": paper.syllabus_version,
            "unit_id": new_q.unit_id,
            "unit_title": new_q.unit.title if new_q.unit else None,
            "unit_number": new_q.unit.unit_number if new_q.unit else None,
            "topic_id": new_q.topic_id,
            "topic_title": new_q.topic.title if new_q.topic else None,
            "source": "QUESTION_BANK",
            "generation_mode": paper.generation_mode
        }
    else:
        # Synthesize fresh AI question
        rng = random.Random()
        target_unit = old_q.unit if (old_q and old_q.unit) else (random.choice(units) if units else None)
        target_topic = old_q.topic if (old_q and old_q.topic) else None
        bloom = getattr(old_q, 'bloom_level', 'APPLY') if old_q else "APPLY"
        diff = old_q.difficulty if old_q else "MEDIUM"
        q_type = old_q.question_type if old_q else "DESCRIPTIVE"

        unit_title_str = getattr(target_unit, "title", None)
        unit_num_val = getattr(target_unit, "unit_number", None)
        topic_title_str = getattr(target_topic, "title", None)

        ai_res = ai_provider_service.generate_grounded_question(
            subject_name=subject.name,
            subject_code=subject.code or "",
            unit_title=unit_title_str,
            unit_number=unit_num_val,
            topic_title=topic_title_str,
            question_type=q_type,
            marks=pq.marks,
            difficulty=diff,
            bloom_level=bloom
        )

        if ai_res and ai_res.get("question_text"):
            synth_q = {
                "question_text": ai_res["question_text"],
                "question_type": q_type,
                "marks": pq.marks,
                "difficulty": diff,
                "bloom_level": bloom,
                "options": ai_res.get("options", []),
                "expected_answer": ai_res.get("expected_answer", "Standard technical response."),
                "marking_rubric": ai_res.get("marking_rubric", f"{pq.marks} Marks upon correct evaluation."),
                "explanation": ai_res.get("explanation", f"AI regenerated question grounded in {unit_title_str or subject.name}.")
            }
            source_label = "AI_PROVIDER"
        else:
            synth_q = synthesize_grounded_question(
                subject=subject,
                unit=target_unit,
                topic=target_topic,
                q_type=q_type,
                marks=pq.marks,
                difficulty=diff,
                bloom_level=bloom,
                rng=rng
            )
            source_label = "ACADEMIC_SYNTHESIZER"

        new_ai_q = Question(
            subject_id=subject.id,
            unit_id=target_unit.id if target_unit else None,
            topic_id=target_topic.id if target_topic else None,
            question_text=synth_q["question_text"],
            question_type=synth_q["question_type"],
            marks=synth_q["marks"],
            difficulty=synth_q["difficulty"],
            bloom_level=synth_q["bloom_level"],
            source_type="AI_GENERATED",
            status="APPROVED",
            explanation=synth_q["explanation"],
            expected_answer=synth_q["expected_answer"],
            marking_rubric=synth_q["marking_rubric"],
            created_by=user_id
        )
        db.add(new_ai_q)
        db.flush()

        for opt in synth_q.get("options", []):
            db.add(QuestionOption(
                question_id=new_ai_q.id,
                option_key=opt["key"],
                option_text=opt["text"],
                is_correct=opt["is_correct"]
            ))

        pq.question_id = new_ai_q.id
        pq.source_type = "AI_GENERATED"
        pq.bloom_level = synth_q["bloom_level"]
        pq.marking_scheme = synth_q["marking_rubric"]
        pq.expected_answer = synth_q["expected_answer"]
        pq.syllabus_provenance = {
            "is_grounded": paper.is_syllabus_grounded,
            "syllabus_version": paper.syllabus_version,
            "unit_id": target_unit.id if target_unit else None,
            "unit_title": unit_title_str,
            "unit_number": unit_num_val,
            "topic_id": target_topic.id if target_topic else None,
            "topic_title": topic_title_str,
            "source": source_label,
            "generation_mode": paper.generation_mode
        }

    paper.version += 1
    db.commit()
    db.refresh(paper)

    # Re-run validation
    validate_question_paper(db, paper.id)
    return paper

def regenerate_section_questions(
    db: Session,
    paper_id: str,
    section_id: str,
    preference: str = "ANY",
    user_id: Optional[str] = None
) -> QuestionPaper:
    """Regenerates all questions in a specific paper section."""
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if getattr(paper, 'is_locked', False) or paper.status in ["FINALIZED", "PUBLISHED", "ARCHIVED"]:
        raise HTTPException(status_code=400, detail=f"Cannot alter question paper with status '{paper.status}'. Paper is locked.")

    section = db.query(QuestionPaperSection).filter(
        QuestionPaperSection.id == section_id,
        QuestionPaperSection.paper_id == paper_id
    ).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found in paper")

    pqs = db.query(QuestionPaperQuestion).filter(QuestionPaperQuestion.section_id == section.id).all()
    for pq in pqs:
        regenerate_single_question(db, paper_id, pq.id, preference, user_id)

    db.refresh(paper)
    return paper
