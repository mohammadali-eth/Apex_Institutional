import json
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.models import (
    Role, Permission, Organization, UniversityTheme, Department, Program,
    AcademicYear, Semester, Subject, Syllabus, SyllabusVersion,
    Unit, Topic, User, UserScope, FacultyAssignment, StudentEnrollment,
    Question, QuestionOption, QuestionTag,
    QuestionPaper, QuestionPaperSection, QuestionPaperQuestion, QuestionPaperTemplate, AuditLog,
    OnlineTest, TestQuestionSnapshot,
    Examination, ExamCoordinatorAssignment, ExamReadinessItem, ExamOperationalIssue, ExamNotification, ExamScheduleAudit
)
from app.core.permissions import RoleEnum, PermissionEnum, ROLE_PERMISSIONS
from app.core.security import get_password_hash

DEFAULT_THEME_VALUES = {
    "primary_color": "#82c341",
    "secondary_color": "#45525b",
    "background_color": "#f3f3f3",
    "font_color": "#838383",
    "title_color": "#44535b",
    "paragraph_color": "#676767",
    "bg_text_color": "#dcdcdc",
    "bg_title_color": "#f6f6f7",
    "sidebar_style": "default",
    "is_dark_mode_supported": False
}

def seed_database(db: Session):
    print("[*] Seeding Roles and Permissions...")
    # 1. Permissions
    perm_objects = {}
    for p in PermissionEnum:
        existing_p = db.query(Permission).filter(Permission.name == p.value).first()
        if not existing_p:
            module_name = p.value.split(".")[0]
            existing_p = Permission(
                name=p.value,
                module=module_name,
                description=f"Can perform {p.value}"
            )
            db.add(existing_p)
            db.flush()
        perm_objects[p.value] = existing_p

    # 2. Roles
    role_objects = {}
    for r in RoleEnum:
        existing_r = db.query(Role).filter(Role.name == r.value).first()
        if not existing_r:
            existing_r = Role(
                name=r.value,
                display_name=r.value.replace("_", " ").title(),
                description=f"{r.value.replace('_', ' ').title()} Role"
            )
            db.add(existing_r)
            db.flush()
        
        # Link permissions
        if r in ROLE_PERMISSIONS:
            existing_r.permissions = [perm_objects[p.value] for p in ROLE_PERMISSIONS[r] if p.value in perm_objects]
            
        role_objects[r.value] = existing_r

    db.commit()

    # 3. Organizations (Universities & Affiliated Institutions)
    print("[*] Seeding Multi-University Hierarchy...")
    
    # University 1: Apex Central University (Default system theme)
    univ1 = db.query(Organization).filter(Organization.code == "APEX_UNIV").first()
    if not univ1:
        univ1 = Organization(
            name="Apex Central University",
            code="APEX_UNIV",
            type="UNIVERSITY",
            address="University Hills, Knowledge Corridor, Apex City",
            website="https://apexuniversity.edu.in",
            logo_url="https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=128&q=80"
        )
        db.add(univ1)
        db.flush()

    # University 1 Theme
    theme1 = db.query(UniversityTheme).filter(UniversityTheme.university_id == univ1.id).first()
    if not theme1:
        theme1 = UniversityTheme(
            university_id=univ1.id,
            logo_url=univ1.logo_url,
            login_banner_text="Welcome to Apex Central University Examination Portal",
            **DEFAULT_THEME_VALUES
        )
        db.add(theme1)
        db.flush()

    # University 2: Horizon State University (Custom blue-slate university theme)
    univ2 = db.query(Organization).filter(Organization.code == "HORIZON_UNIV").first()
    if not univ2:
        univ2 = Organization(
            name="Horizon State University",
            code="HORIZON_UNIV",
            type="UNIVERSITY",
            address="Metropolitan Campus, Silicon Boulevard",
            website="https://horizonstate.edu",
            logo_url="https://images.unsplash.com/photo-1562774053-701939374585?w=128&q=80"
        )
        db.add(univ2)
        db.flush()

    # University 2 Theme (Alternative palette)
    theme2 = db.query(UniversityTheme).filter(UniversityTheme.university_id == univ2.id).first()
    if not theme2:
        theme2 = UniversityTheme(
            university_id=univ2.id,
            primary_color="#2563eb",
            secondary_color="#1e293b",
            background_color="#f8fafc",
            font_color="#64748b",
            title_color="#0f172a",
            paragraph_color="#475569",
            bg_text_color="#e2e8f0",
            bg_title_color="#f1f5f9",
            logo_url=univ2.logo_url,
            login_banner_text="Horizon State University Academic Platform"
        )
        db.add(theme2)
        db.flush()

    # Affiliated Institution 1: ACET under Apex Central University
    inst1 = db.query(Organization).filter(Organization.code == "ACET_COLLEGE").first()
    if not inst1:
        inst1 = Organization(
            name="Apex College of Engineering & Technology",
            code="ACET_COLLEGE",
            type="COLLEGE",
            parent_id=univ1.id,
            address="Tech Campus, South Gateway, Apex City",
            website="https://acet.apexuniversity.edu.in",
            logo_url="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=128&q=80"
        )
        db.add(inst1)
        db.flush()

    # Affiliated Institution 2: AIMR under Apex Central University
    inst2 = db.query(Organization).filter(Organization.code == "AIMR_COLLEGE").first()
    if not inst2:
        inst2 = Organization(
            name="Apex Institute of Management & Research",
            code="AIMR_COLLEGE",
            type="COLLEGE",
            parent_id=univ1.id,
            address="Management Enclave, Central Avenue",
            website="https://aimr.apexuniversity.edu.in"
        )
        db.add(inst2)
        db.flush()

    # 4. Departments
    print("[*] Seeding Departments...")
    dept_cs = db.query(Department).filter(Department.code == "CSIT", Department.organization_id == univ1.id).first()
    if not dept_cs:
        dept_cs = Department(
            organization_id=univ1.id,
            name="Department of Computer Science & Information Technology",
            code="CSIT",
            description="Leading department in software engineering, systems, and algorithms"
        )
        db.add(dept_cs)
        db.flush()

    dept_math = db.query(Department).filter(Department.code == "MATHS", Department.organization_id == univ1.id).first()
    if not dept_math:
        dept_math = Department(
            organization_id=univ1.id,
            name="Department of Applied Mathematics & Statistics",
            code="MATHS",
            description="Pure and applied mathematical sciences"
        )
        db.add(dept_math)
        db.flush()

    dept_acet_ec = db.query(Department).filter(Department.code == "ECE", Department.organization_id == inst1.id).first()
    if not dept_acet_ec:
        dept_acet_ec = Department(
            organization_id=inst1.id,
            name="Electronics & Communication Engineering",
            code="ECE",
            description="Electronics, VLSI, and signal processing"
        )
        db.add(dept_acet_ec)
        db.flush()

    # 5. Programs & Semesters
    print("[*] Seeding Programs & Semesters...")
    prog_bca = db.query(Program).filter(Program.code == "BCA", Program.department_id == dept_cs.id).first()
    if not prog_bca:
        prog_bca = Program(
            department_id=dept_cs.id,
            name="Bachelor of Computer Applications",
            code="BCA",
            degree_level="UG",
            total_semesters=6
        )
        db.add(prog_bca)
        db.flush()
        for i in range(1, 7):
            sem = Semester(program_id=prog_bca.id, number=i, name=f"Semester {i}")
            db.add(sem)

    prog_mca = db.query(Program).filter(Program.code == "MCA", Program.department_id == dept_cs.id).first()
    if not prog_mca:
        prog_mca = Program(
            department_id=dept_cs.id,
            name="Master of Computer Applications",
            code="MCA",
            degree_level="PG",
            total_semesters=4
        )
        db.add(prog_mca)
        db.flush()
        for i in range(1, 5):
            sem = Semester(program_id=prog_mca.id, number=i, name=f"Semester {i}")
            db.add(sem)

    db.commit()

    # 6. Academic Year
    ay = db.query(AcademicYear).filter(AcademicYear.name == "2026-2027").first()
    if not ay:
        ay = AcademicYear(name="2026-2027", is_current=True)
        db.add(ay)
        db.flush()

    sem4 = db.query(Semester).filter(Semester.program_id == prog_bca.id, Semester.number == 4).first()
    sem3 = db.query(Semester).filter(Semester.program_id == prog_bca.id, Semester.number == 3).first()

    # 7. Subjects
    print("[*] Seeding Subjects...")
    subj_dbms = db.query(Subject).filter(Subject.code == "BCA401").first()
    if not subj_dbms and sem4:
        subj_dbms = Subject(
            semester_id=sem4.id,
            code="BCA401",
            name="Database Management Systems",
            credits=4,
            description="Relational data models, SQL, normalization, concurrency control, and transactions"
        )
        db.add(subj_dbms)
        db.flush()

    subj_os = db.query(Subject).filter(Subject.code == "BCA402").first()
    if not subj_os and sem4:
        subj_os = Subject(
            semester_id=sem4.id,
            code="BCA402",
            name="Operating Systems",
            credits=4,
            description="Process management, memory virtualisation, scheduling, file systems, and deadlocks"
        )
        db.add(subj_os)
        db.flush()

    subj_dsa = db.query(Subject).filter(Subject.code == "BCA301").first()
    if not subj_dsa and sem3:
        subj_dsa = Subject(
            semester_id=sem3.id,
            code="BCA301",
            name="Data Structures & Algorithms",
            credits=4,
            description="Linear and non-linear data structures, searching, sorting, and graph traversals"
        )
        db.add(subj_dsa)
        db.flush()

    db.commit()

    # 8. Syllabus for DBMS
    print("[*] Seeding Syllabus, Units & Topics...")
    syl = db.query(Syllabus).filter(Syllabus.subject_id == subj_dbms.id).first()
    if not syl:
        syl = Syllabus(
            subject_id=subj_dbms.id,
            academic_year_id=ay.id,
            title="BCA401 Comprehensive DBMS Curriculum 2026-27",
            version=1,
            description="Approved curriculum adhering to modern university standards",
            file_name="DBMS_Syllabus_2026.pdf",
            file_type="application/pdf",
            file_size=204800,
            is_active=True
        )
        db.add(syl)
        db.flush()

        unit_data = [
            (1, "Unit 1: Introduction to DBMS & Architecture", [
                "1.1 Database system concepts & architecture",
                "1.2 Three-schema architecture & data independence",
                "1.3 ER modeling, entities, relationships, attributes"
            ]),
            (2, "Unit 2: Relational Model & SQL", [
                "2.1 Relational algebra operations",
                "2.2 DDL, DML, DCL, and complex SQL queries",
                "2.3 Integrity constraints and foreign keys"
            ]),
            (3, "Unit 3: Normalization & Schema Refinement", [
                "3.1 Functional dependencies and inference rules",
                "3.2 1NF, 2NF, 3NF, and Boyce-Codd Normal Form (BCNF)",
                "3.3 Multi-valued dependencies and 4NF"
            ]),
            (4, "Unit 4: Transaction Processing & Concurrency", [
                "4.1 ACID properties and transaction states",
                "4.2 Serializability and conflict equivalence",
                "4.3 Two-Phase Locking (2PL) and Deadlock detection"
            ]),
            (5, "Unit 5: Indexing, Storage & Modern Databases", [
                "5.1 Primary, secondary, and clustering indexes",
                "5.2 B-Trees and B+ Trees file organization",
                "5.3 Overview of NoSQL databases and distributed storage"
            ])
        ]

        unit_entities = []
        for u_num, u_title, topics in unit_data:
            u_obj = Unit(
                syllabus_id=syl.id,
                unit_number=u_num,
                title=u_title,
                description=f"Detailed study of {u_title}"
            )
            db.add(u_obj)
            db.flush()
            unit_entities.append(u_obj)
            for t_idx, t_title in enumerate(topics, start=1):
                t_obj = Topic(
                    unit_id=u_obj.id,
                    topic_number=t_idx,
                    title=t_title,
                    description=f"Discussion on {t_title}"
                )
                db.add(t_obj)
        db.commit()
    else:
        unit_entities = syl.units

    # 9. Comprehensive Users Across All 6 Primary Roles
    print("[*] Seeding Complete 6-Role User Accounts...")
    default_pwd_hash = get_password_hash("Admin@12345")

    users_seed = [
        # 1. SUPER_ADMIN (Platform level, unrestricted scope)
        ("apex@superadmin.com", "Apex Super Admin", "SUPER_ADMIN", None, None),
        
        # 2. UNIVERSITY_ADMIN (Scoped to Apex Central University)
        ("john@universityadmin.in", "Dr. John Reynolds", "UNIVERSITY_ADMIN", univ1.id, None),
        
        # 3. INSTITUTION_ADMIN (Scoped to ACET College under Apex University)
        ("principal@acet.edu.in", "Dr. Arthur Pendelton", "INSTITUTION_ADMIN", inst1.id, None),
        
        # 4. HOD (Scoped to CSIT Department)
        ("hod@bca.university.in", "Prof. Robert Vance", "HOD", univ1.id, dept_cs.id),
        
        # 5. FACULTY (Teacher / Question Author in CSIT)
        ("teacher@university.in", "Prof. Alan Turing", "FACULTY", univ1.id, dept_cs.id),
        
        # 6. STUDENT (Enrolled student in BCA Semester 4)
        ("student@gmail.com", "Emily Watson", "STUDENT", univ1.id, dept_cs.id),

        # Additional supporting academic roles
        ("controller@university.in", "Dr. Sarah Connor", "EXAM_CONTROLLER", univ1.id, dept_cs.id),
        ("coordinator@university.in", "Dr. Ada Lovelace", "COORDINATOR", univ1.id, dept_cs.id),
        ("reviewer@university.in", "Dr. Grace Hopper", "REVIEWER", univ1.id, dept_cs.id),
        ("moderator@university.in", "Prof. Donald Knuth", "MODERATOR", univ1.id, dept_cs.id),
    ]

    user_map = {}
    for email, name, role_str, org_id, dept_id in users_seed:
        u = db.query(User).filter(User.email == email).first()
        if not u:
            u = User(
                email=email,
                hashed_password=default_pwd_hash,
                full_name=name,
                role_name=role_str,
                organization_id=org_id,
                department_id=dept_id,
                is_active=True
            )
            if role_str in role_objects:
                u.roles.append(role_objects[role_str])
            db.add(u)
            db.flush()
        else:
            # Update password hash, role_name, org and dept to ensure valid testing state
            u.hashed_password = default_pwd_hash
            u.role_name = role_str
            u.organization_id = org_id
            u.department_id = dept_id
            if role_str in role_objects and role_objects[role_str] not in u.roles:
                u.roles = [role_objects[role_str]]
            db.flush()
        user_map[email] = u

    db.commit()

    faculty_user = user_map.get("teacher@university.in")
    super_admin_user = user_map.get("apex@superadmin.com")
    student_user = user_map.get("student@gmail.com")
    hod_user = user_map.get("hod@bca.university.in")
    inst_admin_user = user_map.get("principal@acet.edu.in")
    univ_admin_user = user_map.get("john@universityadmin.in")

    # 10. Explicit User Scopes
    print("[*] Seeding User Scopes...")
    scope_configs = [
        (super_admin_user, "PLATFORM", None),
        (univ_admin_user, "UNIVERSITY", univ1.id),
        (inst_admin_user, "INSTITUTION", inst1.id),
        (hod_user, "DEPARTMENT", dept_cs.id),
        (faculty_user, "SUBJECT", subj_dbms.id),
        (student_user, "SELF", None)
    ]
    for u_obj, s_type, s_entity in scope_configs:
        if u_obj:
            existing_scope = db.query(UserScope).filter(UserScope.user_id == u_obj.id, UserScope.scope_type == s_type).first()
            if not existing_scope:
                db.add(UserScope(user_id=u_obj.id, scope_type=s_type, scope_entity_id=s_entity))
    db.commit()

    # 11. Faculty Assignment
    print("[*] Seeding Faculty Assignment...")
    if faculty_user and subj_dbms:
        fa_dbms = db.query(FacultyAssignment).filter(
            FacultyAssignment.user_id == faculty_user.id,
            FacultyAssignment.subject_id == subj_dbms.id
        ).first()
        if not fa_dbms:
            db.add(FacultyAssignment(
                user_id=faculty_user.id,
                subject_id=subj_dbms.id,
                academic_year_id=ay.id,
                role_type="TEACHER"
            ))
    if faculty_user and subj_os:
        fa_os = db.query(FacultyAssignment).filter(
            FacultyAssignment.user_id == faculty_user.id,
            FacultyAssignment.subject_id == subj_os.id
        ).first()
        if not fa_os:
            db.add(FacultyAssignment(
                user_id=faculty_user.id,
                subject_id=subj_os.id,
                academic_year_id=ay.id,
                role_type="QUESTION_SETTER"
            ))
    db.commit()

    # 12. Student Enrollment
    print("[*] Seeding Student Enrollment...")
    if student_user and prog_bca and sem4:
        se = db.query(StudentEnrollment).filter(
            StudentEnrollment.user_id == student_user.id
        ).first()
        if not se:
            db.add(StudentEnrollment(
                user_id=student_user.id,
                program_id=prog_bca.id,
                semester_id=sem4.id,
                roll_number="BCA2026-042",
                is_active=True
            ))
        db.commit()

    # 13. Question Bank Seed
    print("[*] Seeding Question Bank (MCQs, True/False, Fill in Blank, Descriptive 1-10 marks)...")
    if db.query(Question).filter(Question.subject_id == subj_dbms.id).count() < 15:
        u1 = unit_entities[0] if len(unit_entities) > 0 else None
        u2 = unit_entities[1] if len(unit_entities) > 1 else None
        u3 = unit_entities[2] if len(unit_entities) > 2 else None
        u4 = unit_entities[3] if len(unit_entities) > 3 else None
        u5 = unit_entities[4] if len(unit_entities) > 4 else None

        questions_data = [
            # MCQs (1 Mark)
            {
                "text": "Which of the following represents the correct order of the three-schema architecture from high to low level?",
                "type": "MCQ", "marks": 1, "diff": "EASY", "unit": u1,
                "options": [
                    ("A", "Internal -> Conceptual -> External", False),
                    ("B", "External -> Conceptual -> Internal", True),
                    ("C", "Conceptual -> External -> Internal", False),
                    ("D", "Physical -> Logical -> View", False)
                ],
                "explanation": "External level is closest to users, conceptual defines logical structure, and internal defines physical storage.",
                "tags": ["architecture", "three-schema", "fundamentals"]
            },
            {
                "text": "In an Entity-Relationship (ER) model, how is a weak entity set visually represented?",
                "type": "MCQ", "marks": 1, "diff": "EASY", "unit": u1,
                "options": [
                    ("A", "Rectangle", False),
                    ("B", "Double rectangle", True),
                    ("C", "Dashed ellipse", False),
                    ("D", "Diamond", False)
                ],
                "explanation": "Weak entities do not have primary keys of their own and are shown in double rectangles.",
                "tags": ["er-diagram", "weak-entity"]
            },
            {
                "text": "Which normal form strictly eliminates multi-valued dependencies?",
                "type": "MCQ", "marks": 1, "diff": "MEDIUM", "unit": u3,
                "options": [
                    ("A", "Second Normal Form (2NF)", False),
                    ("B", "Third Normal Form (3NF)", False),
                    ("C", "Fourth Normal Form (4NF)", True),
                    ("D", "BCNF", False)
                ],
                "explanation": "4NF deals with multi-valued dependencies (MVDs) preventing unwanted redundancy.",
                "tags": ["normalization", "4nf", "dependencies"]
            },
            {
                "text": "What does the 'I' in the ACID transaction property model stand for?",
                "type": "MCQ", "marks": 1, "diff": "EASY", "unit": u4,
                "options": [
                    ("A", "Integrity", False),
                    ("B", "Isolation", True),
                    ("C", "Indexing", False),
                    ("D", "Idempotency", False)
                ],
                "explanation": "ACID stands for Atomicity, Consistency, Isolation, and Durability.",
                "tags": ["acid", "transactions", "concurrency"]
            },
            {
                "text": "Which SQL clause is used to filter records resulting from an aggregate function?",
                "type": "MCQ", "marks": 1, "diff": "EASY", "unit": u2,
                "options": [
                    ("A", "WHERE", False),
                    ("B", "GROUP BY", False),
                    ("C", "HAVING", True),
                    ("D", "ORDER BY", False)
                ],
                "explanation": "HAVING applies conditions to groups aggregated by GROUP BY.",
                "tags": ["sql", "queries", "aggregation"]
            },

            # TRUE / FALSE (1 Mark)
            {
                "text": "A primary key constraint in relational database management systems permits a single NULL value.",
                "type": "TRUE_FALSE", "marks": 1, "diff": "EASY", "unit": u2,
                "expected": "False. A primary key must be unique and NOT NULL.",
                "explanation": "Primary keys never permit NULL values. Unique keys may allow NULL depending on the RDBMS.",
                "tags": ["integrity", "primary-key"]
            },
            {
                "text": "Two-Phase Locking (2PL) protocol guarantees conflict serializability of concurrent schedules.",
                "type": "TRUE_FALSE", "marks": 1, "diff": "MEDIUM", "unit": u4,
                "expected": "True. The growing phase followed by shrinking phase ensures conflict serializability.",
                "explanation": "Rigorous/Strict 2PL guarantees serializability and avoids cascading aborts.",
                "tags": ["2pl", "concurrency", "locking"]
            },
            {
                "text": "Every relation in BCNF is also in 3NF.",
                "type": "TRUE_FALSE", "marks": 1, "diff": "MEDIUM", "unit": u3,
                "expected": "True. BCNF is a stricter form of 3NF.",
                "explanation": "BCNF imposes the constraint that every determinant is a super key, subsuming 3NF rules.",
                "tags": ["bcnf", "3nf", "normalization"]
            },

            # FILL IN THE BLANKS (1 Mark)
            {
                "text": "In SQL, the operation that returns all rows present in both the first and second query result sets is _____.",
                "type": "FILL_BLANK", "marks": 1, "diff": "EASY", "unit": u2,
                "expected": "INTERSECT",
                "explanation": "INTERSECT operator computes the set intersection of two compatible relation schemas.",
                "tags": ["sql", "set-operations"]
            },
            {
                "text": "A situation where two or more transactions are waiting indefinitely for each other to release locks is called _____.",
                "type": "FILL_BLANK", "marks": 1, "diff": "EASY", "unit": u4,
                "expected": "Deadlock",
                "explanation": "Deadlocks occur under circular wait conditions with exclusive resources.",
                "tags": ["concurrency", "deadlock"]
            },

            # SHORT DESCRIPTIVE (2 Marks)
            {
                "text": "Differentiate between Physical Data Independence and Logical Data Independence with an example.",
                "type": "DESCRIPTIVE", "marks": 2, "diff": "EASY", "unit": u1,
                "expected": "Logical data independence is the ability to modify logical schema without altering view level. Physical independence allows changing physical storage without altering logical schema.",
                "tags": ["independence", "architecture"]
            },
            {
                "text": "Explain the concept of Referential Integrity Constraint in relational databases.",
                "type": "DESCRIPTIVE", "marks": 2, "diff": "EASY", "unit": u2,
                "expected": "States that if a foreign key exists in a relation, the referenced tuple must exist in the primary table or be null.",
                "tags": ["constraints", "foreign-key"]
            },
            {
                "text": "What are the four necessary conditions for a deadlock to occur in a database system?",
                "type": "DESCRIPTIVE", "marks": 2, "diff": "MEDIUM", "unit": u4,
                "expected": "Mutual exclusion, Hold and Wait, No preemption, and Circular wait.",
                "tags": ["deadlock", "coffman-conditions"]
            },

            # DESCRIPTIVE (5 Marks)
            {
                "text": "Explain Boyce-Codd Normal Form (BCNF). How does it differ from Third Normal Form (3NF)? Provide a suitable example relation illustrating this difference.",
                "type": "DESCRIPTIVE", "marks": 5, "diff": "MEDIUM", "unit": u3,
                "expected": "Detailed explanation of BCNF definition (X -> Y requires X to be a superkey), comparison with 3NF prime attribute rule, and an illustrative decomposition.",
                "tags": ["bcnf", "normalization", "functional-dependencies"]
            },
            {
                "text": "Describe the Architecture of Database Management Systems. Detail the functions performed by the Query Processor and Storage Manager components.",
                "type": "DESCRIPTIVE", "marks": 5, "diff": "MEDIUM", "unit": u1,
                "expected": "Architectural block diagram showing DDL interpreter, query compiler, query evaluation engine, buffer manager, file manager, and authorization manager.",
                "tags": ["dbms-architecture", "query-processor", "storage-manager"]
            },
            {
                "text": "Explain the Two-Phase Locking (2PL) Protocol. Differentiate between Basic 2PL, Conservative 2PL, Strict 2PL, and Rigorous 2PL.",
                "type": "DESCRIPTIVE", "marks": 5, "diff": "HARD", "unit": u4,
                "expected": "Growing phase, shrinking phase, cascading abort prevention, and deadlock trade-offs across 2PL variants.",
                "tags": ["concurrency", "2pl", "serializability"]
            },
            {
                "text": "Explain B+ Tree indexing. Why is B+ Tree widely preferred over binary search trees and plain B-Trees for database disk storage?",
                "type": "DESCRIPTIVE", "marks": 5, "diff": "HARD", "unit": u5,
                "expected": "All data pointers in leaf nodes, linked leaf nodes for range scans, shallow height reducing I/O seeks.",
                "tags": ["indexing", "b-plus-tree", "storage"]
            },

            # LONG DESCRIPTIVE (10 Marks)
            {
                "text": "Discuss Transaction Management in DBMS in detail. State and illustrate the ACID properties with practical banking transfer examples. Explain the various transaction states using a state transition diagram.",
                "type": "DESCRIPTIVE", "marks": 10, "diff": "HARD", "unit": u4,
                "expected": "Comprehensive coverage of Atomicity, Consistency, Isolation, Durability with credit/debit example, transaction states: Active, Partially Committed, Failed, Aborted, Committed.",
                "tags": ["acid", "transactions", "recovery", "state-diagram"]
            },
            {
                "text": "Consider a university database with entities Student, Course, Department, and Instructor. Construct an extensive Entity-Relationship (ER) Diagram capturing relationships, cardinalities, participation constraints, and convert the ER schema into a normalized set of relational tables in 3NF.",
                "type": "DESCRIPTIVE", "marks": 10, "diff": "HARD", "unit": u1,
                "expected": "Full ER diagram, primary keys, foreign keys, cardinality ratios (1:1, 1:N, M:N), normalization steps to 3NF.",
                "tags": ["er-modeling", "schema-design", "normalization"]
            }
        ]

        for q_item in questions_data:
            q = Question(
                subject_id=subj_dbms.id,
                unit_id=q_item["unit"].id if q_item.get("unit") else None,
                question_text=q_item["text"],
                question_type=q_item["type"],
                marks=q_item["marks"],
                difficulty=q_item["diff"],
                status="APPROVED",
                language="English",
                explanation=q_item.get("explanation"),
                expected_answer=q_item.get("expected"),
                created_by=faculty_user.id if faculty_user else None,
                reviewer_id=super_admin_user.id if super_admin_user else None
            )
            db.add(q)
            db.flush()

            if q_item["type"] == "MCQ" and "options" in q_item:
                for k, txt, is_corr in q_item["options"]:
                    opt = QuestionOption(
                        question_id=q.id,
                        option_key=k,
                        option_text=txt,
                        is_correct=is_corr
                    )
                    db.add(opt)

            for t_str in q_item.get("tags", []):
                tag = QuestionTag(question_id=q.id, tag=t_str)
                db.add(tag)

        db.commit()

    # 14. Question Paper Template
    tmpl = db.query(QuestionPaperTemplate).filter(QuestionPaperTemplate.organization_id == univ1.id).first()
    if not tmpl:
        tmpl = QuestionPaperTemplate(
            organization_id=univ1.id,
            name="Apex University Standard End-Semester Examination Template",
            max_marks=70,
            duration_minutes=180,
            instructions_template="1. All questions in Section A are compulsory.\n2. Answer any 4 questions from Section B.\n3. Answer any 2 questions from Section C.\n4. Scientific calculators are permitted where applicable.",
            is_default=True
        )
        db.add(tmpl)
        db.flush()

    # 15. Sample Generated Question Paper
    sample_paper = db.query(QuestionPaper).filter(QuestionPaper.subject_id == subj_dbms.id).first()
    if not sample_paper:
        sample_paper = QuestionPaper(
            subject_id=subj_dbms.id,
            academic_year_id=ay.id,
            semester_id=sem4.id,
            title="End Semester Examination - DBMS",
            exam_name="End Semester Examination 2026-27",
            duration_minutes=180,
            total_marks=70,
            status="PUBLISHED",
            instructions="1. All questions in Section A are compulsory.\n2. Answer short questions in Section B concisely.\n3. Section C questions require comprehensive diagrams and calculations.",
            version=1,
            created_by=faculty_user.id if faculty_user else None,
            approved_by=super_admin_user.id if super_admin_user else None
        )
        db.add(sample_paper)
        db.flush()

        sec_a = QuestionPaperSection(paper_id=sample_paper.id, name="Section A", instructions="Objective & Short Concepts (1-2 Marks)", order_index=1)
        sec_b = QuestionPaperSection(paper_id=sample_paper.id, name="Section B", instructions="Analytical Short Questions (5 Marks each)", order_index=2)
        sec_c = QuestionPaperSection(paper_id=sample_paper.id, name="Section C", instructions="Comprehensive Long Questions (10 Marks each)", order_index=3)
        db.add_all([sec_a, sec_b, sec_c])
        db.flush()

        db_qs = db.query(Question).filter(Question.subject_id == subj_dbms.id).all()
        q_order = 1
        for q in db_qs:
            target_sec = sec_a if q.marks <= 2 else (sec_b if q.marks <= 5 else sec_c)
            pq = QuestionPaperQuestion(
                section_id=target_sec.id,
                question_id=q.id,
                order_index=q_order,
                marks=q.marks,
                is_compulsory=True
            )
            db.add(pq)
            q_order += 1

        db.commit()

    # 16. Seed OnlineTest for Student Practice & Examination if none exists
    if db.query(OnlineTest).count() == 0 and subj_dbms:
        teacher_user = user_map.get("teacher@university.in")
        sample_test = OnlineTest(
            subject_id=subj_dbms.id,
            title="DBMS Mid-Term Diagnostic & Practice Test",
            description="Comprehensive assessment covering ER models, Relational Algebra, SQL, Normalization, and ACID properties.",
            test_type="OFFICIAL",
            difficulty="MEDIUM",
            duration_minutes=30,
            total_marks=20,
            passing_marks=8,
            instructions="Attempt all questions. Practice test is timed at 30 minutes.",
            is_published=True,
            attempt_limit=5,
            negative_marking=0.0,
            created_by=teacher_user.id if teacher_user else None
        )
        db.add(sample_test)
        db.flush()

        mcq_qs = db.query(Question).filter(Question.subject_id == subj_dbms.id, Question.question_type == "MCQ").limit(5).all()
        for idx, q in enumerate(mcq_qs):
            opts_json = json.dumps([{"id": opt.id, "key": opt.option_key, "text": opt.option_text, "is_correct": opt.is_correct} for opt in q.options]) if q.options else "[]"
            correct_key = next((opt.option_key for opt in q.options if opt.is_correct), None) if q.options else None
            snapshot = TestQuestionSnapshot(
                test_id=sample_test.id,
                question_id=q.id,
                order_index=idx + 1,
                question_text=q.question_text,
                question_type=q.question_type,
                marks=q.marks,
                options_json=opts_json,
                correct_answer_key=correct_key
            )
            db.add(snapshot)
        db.commit()

    # 17. Initial Audit Trail
    if db.query(AuditLog).count() == 0:
        db.add(AuditLog(
            user_id=super_admin_user.id if super_admin_user else None,
            action="SYSTEM_INITIALIZED",
            entity_type="System",
            metadata_json='{"version": "1.0.0", "status": "Ready", "multi_university": true, "roles": 6}'
        ))
        db.commit()

    # 18. Seed Examinations & Coordinator Data
    print("[*] Seeding Official Examinations & Exam Coordinator Data...")
    coord_user = user_map.get("coordinator@university.in")
    ctrl_user = user_map.get("controller@university.in")
    now_utc = datetime.now(timezone.utc)

    if db.query(Examination).count() == 0 and coord_user and univ1:
        exam1 = Examination(
            organization_id=univ1.id,
            department_id=dept_cs.id if dept_cs else None,
            program_id=prog_bca.id if prog_bca else None,
            academic_year_id=ay.id if ay else None,
            semester_id=sem4.id if sem4 else None,
            subject_id=subj_dbms.id if subj_dbms else None,
            code="EXAM-2026-DBMS",
            name="End Semester Examination - Database Management Systems",
            exam_type="FINAL",
            start_time=now_utc + timedelta(days=7, hours=4),
            end_time=now_utc + timedelta(days=7, hours=7),
            duration_minutes=180,
            total_marks=100,
            venue="Main Auditorium / Hall A (Capacity: 120)",
            paper_submission_deadline=now_utc + timedelta(days=3),
            status="SCHEDULED",
            created_by=ctrl_user.id if ctrl_user else None
        )
        exam2 = Examination(
            organization_id=univ1.id,
            department_id=dept_cs.id if dept_cs else None,
            program_id=prog_bca.id if prog_bca else None,
            academic_year_id=ay.id if ay else None,
            semester_id=sem4.id if sem4 else None,
            subject_id=subj_os.id if subj_os else None,
            code="EXAM-2026-OS",
            name="End Semester Examination - Operating Systems Concepts",
            exam_type="FINAL",
            start_time=now_utc + timedelta(days=10, hours=4),
            end_time=now_utc + timedelta(days=10, hours=7),
            duration_minutes=180,
            total_marks=100,
            venue="Science Block / Hall B (Capacity: 80)",
            paper_submission_deadline=now_utc + timedelta(days=4),
            status="SCHEDULED",
            created_by=ctrl_user.id if ctrl_user else None
        )
        exam3 = Examination(
            organization_id=univ1.id,
            department_id=dept_cs.id if dept_cs else None,
            program_id=prog_bca.id if prog_bca else None,
            academic_year_id=ay.id if ay else None,
            semester_id=sem4.id if sem4 else None,
            subject_id=subj_dbms.id if subj_dbms else None,
            code="EXAM-2026-MID-DBMS",
            name="Continuous Assessment Midterm - Database Systems",
            exam_type="MIDTERM",
            start_time=now_utc + timedelta(days=14, hours=2),
            end_time=now_utc + timedelta(days=14, hours=4),
            duration_minutes=120,
            total_marks=50,
            venue="Computer Lab 3 (Capacity: 45)",
            paper_submission_deadline=now_utc - timedelta(days=1), # Overdue deadline
            status="SCHEDULED",
            created_by=ctrl_user.id if ctrl_user else None
        )
        db.add_all([exam1, exam2, exam3])
        db.flush()

        # Assignments for Coordinator
        assign1 = ExamCoordinatorAssignment(
            user_id=coord_user.id,
            examination_id=exam1.id,
            department_id=dept_cs.id if dept_cs else None,
            can_edit_schedule=True,
            assigned_by=ctrl_user.id if ctrl_user else None
        )
        assign2 = ExamCoordinatorAssignment(
            user_id=coord_user.id,
            examination_id=exam2.id,
            department_id=dept_cs.id if dept_cs else None,
            can_edit_schedule=True,
            assigned_by=ctrl_user.id if ctrl_user else None
        )
        assign3 = ExamCoordinatorAssignment(
            user_id=coord_user.id,
            examination_id=exam3.id,
            department_id=dept_cs.id if dept_cs else None,
            can_edit_schedule=False, # Demonstrates permission boundary
            assigned_by=ctrl_user.id if ctrl_user else None
        )
        db.add_all([assign1, assign2, assign3])
        db.flush()

        # Readiness Checklist Items for Exam 1
        checklist_items = [
            # Question Paper Readiness
            (exam1.id, "QUESTION_PAPER", "Paper Authored & Draft Saved", "Faculty authors initial draft according to curriculum blueprint.", True, "COMPLETED"),
            (exam1.id, "QUESTION_PAPER", "Department HOD Review", "HOD reviews question paper balance and Bloom taxonomy distribution.", True, "COMPLETED"),
            (exam1.id, "QUESTION_PAPER", "Exam Controller Formal Approval", "Controller verifies blueprint compliance and signs off.", True, "IN_PROGRESS"),
            (exam1.id, "QUESTION_PAPER", "Confidential Print Packaging", "High-security watermarked PDF print master produced and sealed.", True, "NOT_STARTED"),
            # Scheduling Readiness
            (exam1.id, "SCHEDULING", "Examination Venue Allocation", "Hall A allocated and confirmed with facility manager.", True, "COMPLETED"),
            (exam1.id, "SCHEDULING", "Cohort Timetable Conflict Check", "Zero overlapping time slots verified for BCA Semester IV cohort.", True, "COMPLETED"),
            (exam1.id, "SCHEDULING", "Student Seating Chart Generated", "Roll number desk labels mapped and distributed to supervisors.", True, "IN_PROGRESS"),
            # Operational Readiness
            (exam1.id, "OPERATIONAL", "Chief Invigilator & Proctor Assigned", "Senior faculty designated as superintendent of exam hall.", True, "COMPLETED"),
            (exam1.id, "OPERATIONAL", "Supplementary Stationery Staged", "Serialized blank answer booklets and graph sheets delivered to vault.", True, "COMPLETED"),
            (exam1.id, "OPERATIONAL", "Special Accommodation Verified", "Disability access and extra-time allocations cleared.", False, "NOT_APPLICABLE"),
            # Final Readiness
            (exam1.id, "FINAL", "Final Chief Superintendent Sign-off", "Pre-flight clearance signed 24 hours prior to commencement.", True, "NOT_STARTED"),

            # Exam 2 items
            (exam2.id, "QUESTION_PAPER", "Paper Authored & Draft Saved", "Faculty draft creation for Operating Systems.", True, "COMPLETED"),
            (exam2.id, "QUESTION_PAPER", "Department HOD Review", "HOD moderation for OS examination paper.", True, "NOT_STARTED"),
            (exam2.id, "SCHEDULING", "Examination Venue Allocation", "Hall B allocated for OS examination.", True, "COMPLETED"),
            (exam2.id, "OPERATIONAL", "Chief Invigilator Assigned", "Proctors assigned for Hall B.", True, "NOT_STARTED"),
            (exam2.id, "FINAL", "Final Sign-off", "Final pre-flight clearance.", True, "NOT_STARTED"),

            # Exam 3 items (Overdue midterms)
            (exam3.id, "QUESTION_PAPER", "Paper Authored & Draft Saved", "Midterm paper authoring.", True, "NOT_STARTED"),
            (exam3.id, "SCHEDULING", "Lab Venue Allocation", "Computer Lab 3 reserved.", True, "COMPLETED"),
            (exam3.id, "FINAL", "Final Sign-off", "Midterm clearance.", True, "BLOCKED"),
        ]

        for e_id, cat, title, desc, req, st in checklist_items:
            db.add(ExamReadinessItem(
                examination_id=e_id,
                category=cat,
                title=title,
                description=desc,
                is_required=req,
                status=st,
                updated_by=coord_user.id
            ))
        db.flush()

        # Operational Issues
        issue1 = ExamOperationalIssue(
            examination_id=exam3.id,
            subject_id=subj_dbms.id if subj_dbms else None,
            title="Question Paper Submission Overdue for Midterm Exam",
            description="The submission deadline for EXAM-2026-MID-DBMS elapsed yesterday without paper upload from the faculty.",
            category="DELAYED_SUBMISSION",
            severity="HIGH",
            status="OPEN",
            reported_by=coord_user.id,
            assigned_to=user_map.get("teacher@university.in").id if user_map.get("teacher@university.in") else None
        )
        issue2 = ExamOperationalIssue(
            examination_id=exam1.id,
            subject_id=subj_dbms.id if subj_dbms else None,
            title="Room Hall A Projector Glitch for Practical Component",
            description="Display projector in Hall A requires maintenance before the visual case study portion begins.",
            category="MATERIAL_SHORTAGE",
            severity="LOW",
            status="RESOLVED",
            reported_by=coord_user.id,
            assigned_to=coord_user.id,
            resolution_notes="Technician replaced HDMI transmitter; display confirmed functional.",
            resolved_at=now_utc
        )
        db.add_all([issue1, issue2])
        db.flush()

        # Notifications
        notif1 = ExamNotification(
            recipient_id=coord_user.id,
            sender_id=ctrl_user.id if ctrl_user else None,
            examination_id=exam1.id,
            title="Examination Assignment: EXAM-2026-DBMS",
            message="You have been assigned as lead coordinator for End Semester Examination - Database Management Systems.",
            notification_type="SCHEDULE_CHANGE",
            channel="IN_APP",
            is_read=True,
            read_at=now_utc
        )
        notif2 = ExamNotification(
            recipient_id=coord_user.id,
            sender_id=ctrl_user.id if ctrl_user else None,
            examination_id=exam3.id,
            title="Submission Overdue Warning",
            message="Paper submission deadline for EXAM-2026-MID-DBMS has expired. Please coordinate immediately with faculty.",
            notification_type="OVERDUE_ALERT",
            channel="IN_APP",
            is_read=False
        )
        db.add_all([notif1, notif2])
        db.commit()

    print("[SUCCESS] Multi-university hierarchy and 6-role database seeding completed successfully!")
