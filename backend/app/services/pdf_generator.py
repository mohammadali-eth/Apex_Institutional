import io
import re
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import QuestionPaper, QuestionPaperSection, QuestionPaperQuestion, Question
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that accumulates total page count and stamps
    formal university examination footers (e.g., 'Page X of Y').
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_footer(num_pages)
            super().showPage()
        super().save()

    def draw_page_footer(self, page_count: int):
        self.saveState()
        self.setFont("Times-Roman", 8.5)
        self.setFillColor(colors.black)
        # Footer text: Right-aligned "Page X of Y"
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 40, 24, page_str)
        self.restoreState()

def get_base_styles():
    """
    Formal, high-contrast, pure monochrome typography matching
    traditional university examination papers (Kadi Sarva Vishwavidyalaya style).
    """
    styles = getSampleStyleSheet()

    univ_title_style = ParagraphStyle(
        'UnivTitle',
        parent=styles['Heading1'],
        fontName='Times-Bold',
        fontSize=14,
        leading=17,
        alignment=1, # Center
        spaceAfter=2,
        textColor=colors.black
    )

    exam_subtitle_style = ParagraphStyle(
        'ExamSubTitle',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=10,
        leading=13,
        alignment=1, # Center
        spaceAfter=6,
        textColor=colors.black
    )

    candidate_no_style = ParagraphStyle(
        'CandidateNo',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=9.5,
        leading=13,
        spaceAfter=4,
        textColor=colors.black
    )

    meta_left_style = ParagraphStyle(
        'MetaLeft',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=9,
        leading=12,
        textColor=colors.black
    )

    meta_center_style = ParagraphStyle(
        'MetaCenter',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=9,
        leading=12,
        alignment=1, # Center
        textColor=colors.black
    )

    meta_right_style = ParagraphStyle(
        'MetaRight',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=9,
        leading=12,
        alignment=2, # Right
        textColor=colors.black
    )

    instruction_title = ParagraphStyle(
        'InstrTitle',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=9,
        leading=12,
        spaceBefore=3,
        spaceAfter=2,
        textColor=colors.black
    )

    instruction_item = ParagraphStyle(
        'InstrItem',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=8.5,
        leading=11.5,
        spaceAfter=1.5,
        textColor=colors.black
    )

    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Times-Bold',
        fontSize=10.5,
        leading=13,
        spaceBefore=10,
        spaceAfter=3,
        alignment=1, # Center
        textColor=colors.black
    )

    section_inst_style = ParagraphStyle(
        'SectionInst',
        parent=styles['Normal'],
        fontName='Times-Italic',
        fontSize=8.5,
        leading=11.5,
        alignment=1,
        spaceAfter=5,
        textColor=colors.black
    )

    q_label_style = ParagraphStyle(
        'QLabel',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.black
    )

    q_text_style = ParagraphStyle(
        'QText',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=9.5,
        leading=13,
        textColor=colors.black
    )

    sub_label_style = ParagraphStyle(
        'SubLabel',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.black
    )

    sub_text_style = ParagraphStyle(
        'SubText',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=9.5,
        leading=13,
        textColor=colors.black
    )

    marks_style = ParagraphStyle(
        'MarksStyle',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=9.5,
        leading=13,
        alignment=2, # Right
        textColor=colors.black
    )

    or_divider_style = ParagraphStyle(
        'OrDivider',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=10,
        leading=13,
        alignment=1, # Center
        spaceBefore=5,
        spaceAfter=5,
        textColor=colors.black
    )

    option_text_style = ParagraphStyle(
        'OptionText',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=9,
        leading=12,
        textColor=colors.black
    )

    end_paper_style = ParagraphStyle(
        'EndPaper',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=9,
        leading=12,
        alignment=1, # Center
        spaceBefore=12,
        spaceAfter=6,
        textColor=colors.black
    )

    confidential_banner_style = ParagraphStyle(
        'ConfBanner',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=10.5,
        leading=13,
        alignment=1,
        spaceAfter=6,
        textColor=colors.black
    )

    answer_header_style = ParagraphStyle(
        'AnsHeader',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=9.5,
        leading=12.5,
        textColor=colors.black
    )

    answer_body_style = ParagraphStyle(
        'AnsBody',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=9,
        leading=12,
        textColor=colors.black
    )

    rubric_title_style = ParagraphStyle(
        'RubricTitle',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.black
    )

    rubric_body_style = ParagraphStyle(
        'RubricBody',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.black
    )

    return {
        'univ_title': univ_title_style,
        'exam_sub': exam_subtitle_style,
        'candidate_no': candidate_no_style,
        'meta_left': meta_left_style,
        'meta_center': meta_center_style,
        'meta_right': meta_right_style,
        'instruction_title': instruction_title,
        'instruction_item': instruction_item,
        'section_header': section_header_style,
        'section_inst': section_inst_style,
        'q_label': q_label_style,
        'q_text': q_text_style,
        'sub_label': sub_label_style,
        'sub_text': sub_text_style,
        'marks_style': marks_style,
        'or_divider': or_divider_style,
        'option_text': option_text_style,
        'end_paper': end_paper_style,
        'conf_banner': confidential_banner_style,
        'ans_header': answer_header_style,
        'ans_body': answer_body_style,
        'rubric_title': rubric_title_style,
        'rubric_body': rubric_body_style,
    }

def get_institution_header(paper: QuestionPaper) -> tuple[str, str, str]:
    """
    Derives institution, department, and program names dynamically
    from paper relationships, never hardcoding.
    """
    univ_name = getattr(paper, 'university_name', None)
    dept_name = getattr(paper, 'department_name', None)
    prog_name = getattr(paper, 'program_name', None)

    if paper.subject and paper.subject.semester and paper.subject.semester.program:
        prog = paper.subject.semester.program
        if not prog_name:
            prog_name = prog.name
        if prog.department:
            if not dept_name:
                dept_name = prog.department.name
            if not univ_name and prog.department.organization:
                univ_name = prog.department.organization.name

    if not univ_name:
        univ_name = "KADI SARVA VISHWAVIDYALAYA"
    if not dept_name:
        dept_name = "Department of Computer Science & Information Technology"
    return univ_name.upper(), dept_name, prog_name or ""

def build_ksv_header_elements(paper: QuestionPaper, s: dict, is_confidential: bool = False, conf_title: str = "") -> list:
    """
    Constructs the standard KSV University examination header block:
    - Centered University Name
    - Centered [Semester / Exam]
    - Candidate No. field
    - 2-row metadata table (Subject Code, Subject Name, Date, Time, Total Marks)
    - Numbered instructions list
    """
    elements = []
    univ_name, dept_name, prog_name = get_institution_header(paper)

    elements.append(Paragraph(univ_name, s['univ_title']))

    # Semester / Exam line
    sem_str = paper.subject.semester.name if (paper.subject and paper.subject.semester) else ""
    if prog_name and sem_str:
        sub_title_text = f"[{prog_name} - {sem_str} / {paper.exam_name}]"
    elif sem_str:
        sub_title_text = f"[{sem_str} / {paper.exam_name}]"
    else:
        sub_title_text = f"[{paper.exam_name}]"
    elements.append(Paragraph(sub_title_text, s['exam_sub']))

    if is_confidential:
        elements.append(Paragraph(conf_title, s['conf_banner']))

    # Candidate No. line
    if not is_confidential:
        elements.append(Paragraph("<b>Candidate No.:</b> ______________________________", s['candidate_no']))
        elements.append(Spacer(1, 2))

    # Metadata table (515 pt width)
    # Row 1: Subject Code (left, span 0-2) | Subject Name (right, span 3-5)
    # Row 2: Date (left, span 0-1) | Time (center, span 2-3) | Total Marks (right, span 4-5)
    subj_code = paper.subject.code if paper.subject else "N/A"
    subj_name = paper.subject.name if paper.subject else paper.title
    hours = paper.duration_minutes // 60
    mins = paper.duration_minutes % 60
    duration_str = f"{hours} Hours" if mins == 0 else f"{hours}h {mins}m"

    cw = [515 / 6.0] * 6
    meta_table_data = [
        [
            Paragraph(f"<b>Subject Code:</b> {subj_code}", s['meta_left']), '', '',
            Paragraph(f"<b>Subject Name:</b> {subj_name}", s['meta_left']), '', ''
        ],
        [
            Paragraph("<b>Date:</b> ______________", s['meta_left']), '',
            Paragraph(f"<b>Time:</b> {duration_str}", s['meta_center']), '',
            Paragraph(f"<b>Total Marks:</b> {paper.total_marks}", s['meta_right']), ''
        ]
    ]

    meta_table = Table(meta_table_data, colWidths=cw)
    meta_table.setStyle(TableStyle([
        ('SPAN', (0,0), (2,0)),
        ('SPAN', (3,0), (5,0)),
        ('SPAN', (0,1), (1,1)),
        ('SPAN', (2,1), (3,1)),
        ('SPAN', (4,1), (5,1)),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 2),
        ('RIGHTPADDING', (0,0), (-1,-1), 2),
        ('LINEABOVE', (0,0), (-1,0), 0.75, colors.black),
        ('LINEBELOW', (0,-1), (-1,-1), 0.75, colors.black),
        ('LINEBELOW', (0,0), (-1,0), 0.5, colors.HexColor('#94A3B8')),
    ]))
    elements.append(meta_table)

    # Numbered Instructions block
    if not is_confidential:
        elements.append(Paragraph("<b>Instructions:</b>", s['instruction_title']))
        default_instructions = [
            "Make suitable assumptions wherever necessary.",
            "Figures to the right indicate full marks."
        ]
        extra_instructions = []
        if paper.instructions:
            for line in paper.instructions.strip().split("\n"):
                clean_l = line.strip()
                clean_l = re.sub(r'^(?:\d+[\.\)]|\-|\*|•)\s*', '', clean_l).strip()
                if clean_l and not any(default.lower() in clean_l.lower() for default in default_instructions):
                    extra_instructions.append(clean_l)

        all_instructions = default_instructions + extra_instructions
        for idx, inst in enumerate(all_instructions, 1):
            elements.append(Paragraph(f"{idx}. {inst}", s['instruction_item']))

        elements.append(HRFlowable(width="100%", thickness=0.75, color=colors.black, spaceBefore=3, spaceAfter=6))

    return elements

def generate_question_paper_pdf(db: Session, paper_id: str) -> io.BytesIO:
    """
    Generates an official student-facing Question Paper PDF matching
    the Kadi Sarva Vishwavidyalaya (KSV) university examination format.
    Pure monochrome, Times-Roman typography, precise hanging indents,
    distinct OR separators, and two-pass page numbers.
    """
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise ValueError("Paper not found")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=36,
        bottomMargin=36
    )

    s = get_base_styles()
    story = []

    # University header, candidate box, metadata table, and instructions
    story.extend(build_ksv_header_elements(paper, s, is_confidential=False))

    sections = db.query(QuestionPaperSection).filter(
        QuestionPaperSection.paper_id == paper.id
    ).order_by(QuestionPaperSection.order_index).all()

    global_q_num = 1

    for sec in sections:
        # Check if section has a name like "SECTION A" or "SECTION - 1"
        sec_name_clean = (sec.name or "").strip()
        if len(sections) > 1 or sec_name_clean.upper() not in ["DEFAULT", "MAIN"]:
            story.append(Paragraph(f"<b>--- {sec_name_clean.upper()} ---</b>", s['section_header']))
            if sec.instructions:
                story.append(Paragraph(f"<i>({sec.instructions})</i>", s['section_inst']))

        sec_questions = db.query(QuestionPaperQuestion).filter(
            QuestionPaperQuestion.section_id == sec.id
        ).order_by(QuestionPaperQuestion.order_index).all()

        if not sec_questions:
            continue

        # Group consecutive questions by group_id or or_group_id
        grouped_items: List[List[QuestionPaperQuestion]] = []
        current_gid = None
        current_grp: List[QuestionPaperQuestion] = []

        for pq in sec_questions:
            gid = pq.group_id or pq.or_group_id
            if gid:
                if gid == current_gid:
                    current_grp.append(pq)
                else:
                    if current_grp:
                        grouped_items.append(current_grp)
                    current_gid = gid
                    current_grp = [pq]
            else:
                if current_grp:
                    grouped_items.append(current_grp)
                    current_gid = None
                    current_grp = []
                grouped_items.append([pq])

        if current_grp:
            grouped_items.append(current_grp)

        # Check if this entire section is an objective block:
        # e.g., 3+ questions with 1-2 marks each, none with an OR group
        is_objective_block = (
            len(sec_questions) >= 3 and
            all(pq.marks <= 2 for pq in sec_questions) and
            all(len(g) == 1 for g in grouped_items)
        )

        if is_objective_block:
            # Render as Q-N: "Answer the following objective questions. [XX]"
            # with numbered items 1., 2., 3...
            sec_attempt_marks = sec.total_marks or sum(pq.marks for pq in sec_questions)
            main_q_label = f"<b>Q-{global_q_num}.</b>"
            main_q_text = f"<b>Answer the following objective questions.</b>"
            if sec.instructions and sec.instructions.lower() not in sec_name_clean.lower():
                main_q_text += f"<br/><i>({sec.instructions})</i>"
            main_q_marks = f"<b>[{sec_attempt_marks:02d}]</b>"

            main_row = [
                Paragraph(main_q_label, s['q_label']),
                Paragraph(main_q_text, s['q_text']),
                Paragraph(main_q_marks, s['marks_style'])
            ]
            main_t = Table([main_row], colWidths=[38, 422, 55])
            main_t.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('TOPPADDING', (0,0), (-1,-1), 2),
                ('BOTTOMPADDING', (0,0), (-1,-1), 2),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ]))
            story.append(main_t)
            story.append(Spacer(1, 3))

            for sub_idx, pq in enumerate(sec_questions, 1):
                q = db.query(Question).filter(Question.id == pq.question_id).first()
                if not q:
                    continue

                sub_row = [
                    '',
                    Paragraph(f"<b>{sub_idx}.</b>", s['sub_label']),
                    Paragraph(q.question_text, s['sub_text']),
                    Paragraph(f"[{pq.marks:02d}]", s['marks_style']) if pq.marks > 1 else ''
                ]
                sub_t = Table([sub_row], colWidths=[20, 22, 420, 53])
                sub_t.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('TOPPADDING', (0,0), (-1,-1), 1.5),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
                    ('LEFTPADDING', (0,0), (-1,-1), 0),
                    ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ]))

                sub_elements = [sub_t]

                # MCQ options
                if q.question_type == "MCQ" and q.options:
                    opt_cells = [
                        Paragraph(f"<b>({opt.option_key})</b> {opt.option_text}", s['option_text'])
                        for opt in q.options
                    ]
                    if len(opt_cells) == 4:
                        opt_table = Table([
                            ['', opt_cells[0], opt_cells[1]],
                            ['', opt_cells[2], opt_cells[3]]
                        ], colWidths=[42, 235, 238])
                        opt_table.setStyle(TableStyle([
                            ('VALIGN', (0,0), (-1,-1), 'TOP'),
                            ('TOPPADDING', (0,0), (-1,-1), 1),
                            ('BOTTOMPADDING', (0,0), (-1,-1), 1),
                            ('LEFTPADDING', (0,0), (-1,-1), 0),
                            ('RIGHTPADDING', (0,0), (-1,-1), 0),
                        ]))
                        sub_elements.append(opt_table)
                    else:
                        for oc in opt_cells:
                            sub_elements.append(Table([['', oc]], colWidths=[42, 473]))

                sub_elements.append(Spacer(1, 2))
                story.append(KeepTogether(sub_elements))

            global_q_num += 1
            story.append(Spacer(1, 4))
            continue

        # Standard questions and OR groups
        for q_group in grouped_items:
            group_elements = []

            for alt_idx, pq in enumerate(q_group):
                q = db.query(Question).filter(Question.id == pq.question_id).first()
                if not q:
                    continue

                if alt_idx > 0:
                    group_elements.append(Paragraph("<b>OR</b>", s['or_divider']))

                # Formatting question label and hanging indent
                if alt_idx == 0:
                    q_label = f"<b>Q-{global_q_num}.</b>"
                    col0_content = Paragraph(q_label, s['q_label'])
                else:
                    # Alternative question line: indented to line up with question text
                    col0_content = ''

                marks_text = f"<b>[{pq.marks:02d}]</b>"
                q_text_content = Paragraph(q.question_text, s['q_text'])

                row_data = [
                    [col0_content, q_text_content, Paragraph(marks_text, s['marks_style'])]
                ]
                q_table = Table(row_data, colWidths=[38, 422, 55])
                q_table.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('TOPPADDING', (0,0), (-1,-1), 2),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 2),
                    ('LEFTPADDING', (0,0), (-1,-1), 0),
                    ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ]))
                group_elements.append(q_table)

                # MCQ options
                if q.question_type == "MCQ" and q.options:
                    opt_cells = [
                        Paragraph(f"<b>({opt.option_key})</b> {opt.option_text}", s['option_text'])
                        for opt in q.options
                    ]
                    if len(opt_cells) == 4:
                        opt_table = Table([
                            ['', opt_cells[0], opt_cells[1]],
                            ['', opt_cells[2], opt_cells[3]]
                        ], colWidths=[38, 237, 240])
                        opt_table.setStyle(TableStyle([
                            ('VALIGN', (0,0), (-1,-1), 'TOP'),
                            ('TOPPADDING', (0,0), (-1,-1), 1),
                            ('BOTTOMPADDING', (0,0), (-1,-1), 1),
                            ('LEFTPADDING', (0,0), (-1,-1), 0),
                            ('RIGHTPADDING', (0,0), (-1,-1), 0),
                        ]))
                        group_elements.append(opt_table)
                    else:
                        for oc in opt_cells:
                            group_elements.append(Table([['', oc]], colWidths=[38, 477]))

            group_elements.append(Spacer(1, 4))
            story.append(KeepTogether(group_elements))
            global_q_num += 1

    # End of paper marking
    story.append(Spacer(1, 10))
    story.append(Paragraph("*** END OF QUESTION PAPER ***", s['end_paper']))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer

def generate_confidential_answer_key_pdf(db: Session, paper_id: str) -> io.BytesIO:
    """
    Generates a Confidential Answer Key & Solutions PDF matching
    the KSV university format. Includes full model solutions,
    correct MCQ choices, Bloom taxonomy ratings, and source tags.
    """
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise ValueError("Paper not found")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=36,
        bottomMargin=36
    )

    s = get_base_styles()
    story = []

    # University header with confidential banner
    story.extend(build_ksv_header_elements(
        paper, s,
        is_confidential=True,
        conf_title="CONFIDENTIAL — OFFICIAL EXAMINATION ANSWER KEY & SOLUTIONS"
    ))

    sections = db.query(QuestionPaperSection).filter(
        QuestionPaperSection.paper_id == paper.id
    ).order_by(QuestionPaperSection.order_index).all()

    global_q_num = 1

    for sec in sections:
        story.append(Paragraph(f"<b>--- {sec.name.upper()} — MODEL SOLUTIONS ---</b>", s['section_header']))

        sec_questions = db.query(QuestionPaperQuestion).filter(
            QuestionPaperQuestion.section_id == sec.id
        ).order_by(QuestionPaperQuestion.order_index).all()

        grouped_items: List[List[QuestionPaperQuestion]] = []
        current_gid = None
        current_grp: List[QuestionPaperQuestion] = []

        for pq in sec_questions:
            gid = pq.group_id or pq.or_group_id
            if gid:
                if gid == current_gid:
                    current_grp.append(pq)
                else:
                    if current_grp:
                        grouped_items.append(current_grp)
                    current_gid = gid
                    current_grp = [pq]
            else:
                if current_grp:
                    grouped_items.append(current_grp)
                    current_gid = None
                    current_grp = []
                grouped_items.append([pq])

        if current_grp:
            grouped_items.append(current_grp)

        for q_group in grouped_items:
            group_elements = []

            for alt_idx, pq in enumerate(q_group):
                q = db.query(Question).filter(Question.id == pq.question_id).first()
                if not q:
                    continue

                if alt_idx > 0:
                    group_elements.append(Paragraph("<b>[ — OR CHOICE ALTERNATIVE SOLUTION — ]</b>", s['or_divider']))

                bloom = getattr(pq, 'bloom_level', 'UNDERSTAND') or 'UNDERSTAND'
                src = getattr(pq, 'source_type', 'QUESTION_BANK') or 'QUESTION_BANK'
                meta_tag = f"[{pq.marks:02d} Marks | Bloom: {bloom} | Type: {q.question_type} | Source: {src}]"

                if alt_idx == 0:
                    q_hdr = f"<b>Q-{global_q_num}.</b> {q.question_text}"
                else:
                    q_hdr = f"<b>[Alternative]</b> {q.question_text}"

                # Question prompt table with right-aligned metadata
                q_row = [
                    Paragraph(q_hdr, s['ans_header']),
                    Paragraph(f"<b>{meta_tag}</b>", s['marks_style'])
                ]
                q_tab = Table([q_row], colWidths=[360, 155])
                q_tab.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('TOPPADDING', (0,0), (-1,-1), 2),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 2),
                ]))
                group_elements.append(q_tab)

                # MCQ Answer
                if q.question_type == "MCQ" and q.options:
                    correct_opts = [opt for opt in q.options if opt.is_correct]
                    if correct_opts:
                        c_text = f"<b>Correct Option:</b> ({correct_opts[0].option_key}) {correct_opts[0].option_text}"
                    else:
                        c_text = "<b>Correct Option:</b> Not specified"
                    group_elements.append(Paragraph(c_text, s['ans_body']))

                # Expected Solution
                expected = pq.expected_answer or q.expected_answer
                if expected:
                    formatted_expected = expected.replace("\n", "<br/>")
                    group_elements.append(Paragraph(f"<b>Expected Solution / Model Points:</b><br/>{formatted_expected}", s['ans_body']))

                # Explanation
                if q.explanation:
                    formatted_exp = q.explanation.replace("\n", "<br/>")
                    group_elements.append(Paragraph(f"<b>Technical Rationale:</b> {formatted_exp}", s['ans_body']))

                group_elements.append(Spacer(1, 4))

            group_elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CCCCCC'), spaceBefore=3, spaceAfter=5))
            story.append(KeepTogether(group_elements))
            global_q_num += 1

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer

def generate_marking_scheme_pdf(db: Session, paper_id: str) -> io.BytesIO:
    """
    Generates a Formal Marking Scheme & Step-Wise Evaluation Rubric PDF
    matching the KSV university format. Outlines criteria, stepwise credit allocations,
    and examiner notes.
    """
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise ValueError("Paper not found")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=36,
        bottomMargin=36
    )

    s = get_base_styles()
    story = []

    # University header with marking scheme banner
    story.extend(build_ksv_header_elements(
        paper, s,
        is_confidential=True,
        conf_title="EXAMINATION MARKING SCHEME & EVALUATION RUBRIC"
    ))

    # General Evaluation Notes for Examiners
    eval_notes = (
        "<b>General Guidelines for Evaluators:</b><br/>"
        "1. Award marks strictly according to the step-wise distribution specified below.<br/>"
        "2. For numerical and calculation questions, credit equivalent alternative methods if logically sound.<br/>"
        "3. Minor typographical or grammatical slips not affecting conceptual meaning should not be penalized heavily.<br/>"
        "4. In questions with choices, evaluate only the prescribed number of answers attempted."
    )
    story.append(Paragraph(eval_notes, s['instruction_item']))
    story.append(Spacer(1, 4))

    sections = db.query(QuestionPaperSection).filter(
        QuestionPaperSection.paper_id == paper.id
    ).order_by(QuestionPaperSection.order_index).all()

    global_q_num = 1

    for sec in sections:
        story.append(Paragraph(f"<b>--- {sec.name.upper()} — EVALUATION RUBRIC ---</b>", s['section_header']))

        sec_questions = db.query(QuestionPaperQuestion).filter(
            QuestionPaperQuestion.section_id == sec.id
        ).order_by(QuestionPaperQuestion.order_index).all()

        grouped_items: List[List[QuestionPaperQuestion]] = []
        current_gid = None
        current_grp: List[QuestionPaperQuestion] = []

        for pq in sec_questions:
            gid = pq.group_id or pq.or_group_id
            if gid:
                if gid == current_gid:
                    current_grp.append(pq)
                else:
                    if current_grp:
                        grouped_items.append(current_grp)
                    current_gid = gid
                    current_grp = [pq]
            else:
                if current_grp:
                    grouped_items.append(current_grp)
                    current_gid = None
                    current_grp = []
                grouped_items.append([pq])

        if current_grp:
            grouped_items.append(current_grp)

        for q_group in grouped_items:
            group_elements = []

            for alt_idx, pq in enumerate(q_group):
                q = db.query(Question).filter(Question.id == pq.question_id).first()
                if not q:
                    continue

                if alt_idx > 0:
                    group_elements.append(Paragraph("<b>[ — OR ALTERNATIVE EVALUATION CRITERIA — ]</b>", s['or_divider']))

                rubric = pq.marking_scheme or q.marking_rubric or f"Total {pq.marks} Marks awarded for comprehensive correct answer."
                expected = pq.expected_answer or q.expected_answer or "Refer to standard textbook solution."
                bloom = getattr(pq, 'bloom_level', 'UNDERSTAND') or 'UNDERSTAND'

                if alt_idx == 0:
                    header_label = f"<b>Q-{global_q_num}. ({pq.marks:02d} Marks)</b>"
                else:
                    header_label = f"<b>[OR Alternative] ({pq.marks:02d} Marks)</b>"

                table_data = [
                    [
                        Paragraph(header_label, s['rubric_title']),
                        Paragraph(f"<b>Bloom Level:</b> {bloom}", s['meta_right'])
                    ],
                    [
                        Paragraph("<b>Evaluation Criteria:</b>", s['meta_left']),
                        Paragraph(rubric.replace("\n", "<br/>"), s['rubric_body'])
                    ],
                    [
                        Paragraph("<b>Key Model Points:</b>", s['meta_left']),
                        Paragraph(expected.replace("\n", "<br/>")[:300] + ("..." if len(expected) > 300 else ""), s['rubric_body'])
                    ]
                ]

                rubric_table = Table(table_data, colWidths=[155, 360])
                rubric_table.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F8FAFC')),
                    ('BOX', (0,0), (-1,-1), 0.5, colors.black),
                    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
                    ('TOPPADDING', (0,0), (-1,-1), 3),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 3),
                    ('LEFTPADDING', (0,0), (-1,-1), 3),
                    ('RIGHTPADDING', (0,0), (-1,-1), 3),
                ]))

                group_elements.append(rubric_table)
                group_elements.append(Spacer(1, 4))

            story.append(KeepTogether(group_elements))
            global_q_num += 1

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer
