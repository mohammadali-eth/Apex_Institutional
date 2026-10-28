from enum import Enum
from typing import Dict, List

class RoleEnum(str, Enum):
    # Seven Primary Operational Roles
    SUPER_ADMIN = "SUPER_ADMIN"
    UNIVERSITY_ADMIN = "UNIVERSITY_ADMIN"
    HOD = "HOD"
    TEACHER = "TEACHER"
    FACULTY = "FACULTY"  # Standard academic synonym for TEACHER
    COORDINATOR = "COORDINATOR"
    EXAM_COORDINATOR = "EXAM_COORDINATOR"
    EXAM_CONTROLLER = "EXAM_CONTROLLER"
    STUDENT = "STUDENT"

    # Auxiliary / Institutional Hierarchy Roles
    INSTITUTION_ADMIN = "INSTITUTION_ADMIN"
    DEPARTMENT_ADMIN = "DEPARTMENT_ADMIN"
    QUESTION_SETTER = "QUESTION_SETTER"
    REVIEWER = "REVIEWER"
    MODERATOR = "MODERATOR"
    PAPER_GENERATOR = "PAPER_GENERATOR"
    NORMAL_USER = "NORMAL_USER"

class PermissionEnum(str, Enum):
    # User permissions
    USER_CREATE = "user.create"
    USER_READ = "user.read"
    USER_UPDATE = "user.update"
    USER_DELETE = "user.delete"
    
    # Organization/University permissions
    UNIVERSITY_CREATE = "university.create"
    UNIVERSITY_READ = "university.read"
    UNIVERSITY_UPDATE = "university.update"
    UNIVERSITY_DELETE = "university.delete"

    # Institution permissions
    INSTITUTION_CREATE = "institution.create"
    INSTITUTION_READ = "institution.read"
    INSTITUTION_UPDATE = "institution.update"
    INSTITUTION_DELETE = "institution.delete"
    
    # Department permissions
    DEPARTMENT_CREATE = "department.create"
    DEPARTMENT_READ = "department.read"
    DEPARTMENT_UPDATE = "department.update"
    DEPARTMENT_DELETE = "department.delete"
    
    # Academic (Programs, Semesters, Subjects)
    ACADEMIC_MANAGE = "academic.manage"
    ACADEMIC_READ = "academic.read"

    # Theme management
    THEME_READ = "theme.read"
    THEME_UPDATE = "theme.update"
    
    # Syllabus permissions
    SYLLABUS_UPLOAD = "syllabus.upload"
    SYLLABUS_READ = "syllabus.read"
    SYLLABUS_UPDATE = "syllabus.update"
    SYLLABUS_DELETE = "syllabus.delete"
    
    # Question permissions
    QUESTION_CREATE = "question.create"
    QUESTION_READ = "question.read"
    QUESTION_UPDATE = "question.update"
    QUESTION_DELETE = "question.delete"
    QUESTION_REVIEW = "question.review"
    QUESTION_APPROVE = "question.approve"
    
    # Paper permissions
    PAPER_CREATE = "paper.create"
    PAPER_READ = "paper.read"
    PAPER_UPDATE = "paper.update"
    PAPER_GENERATE = "paper.generate"
    PAPER_REVIEW = "paper.review"
    PAPER_APPROVE = "paper.approve"
    PAPER_FINALIZE = "paper.finalize"
    PAPER_PUBLISH = "paper.publish"
    PAPER_EXPORT = "paper.export"
    
    # Audit log
    AUDIT_READ = "audit.read"

# Default permissions assigned to each role
ROLE_PERMISSIONS: Dict[RoleEnum, List[PermissionEnum]] = {
    RoleEnum.SUPER_ADMIN: list(PermissionEnum),
    RoleEnum.UNIVERSITY_ADMIN: [
        PermissionEnum.USER_CREATE, PermissionEnum.USER_READ, PermissionEnum.USER_UPDATE,
        PermissionEnum.UNIVERSITY_READ, PermissionEnum.UNIVERSITY_UPDATE,
        PermissionEnum.INSTITUTION_CREATE, PermissionEnum.INSTITUTION_READ, PermissionEnum.INSTITUTION_UPDATE, PermissionEnum.INSTITUTION_DELETE,
        PermissionEnum.DEPARTMENT_CREATE, PermissionEnum.DEPARTMENT_READ, PermissionEnum.DEPARTMENT_UPDATE, PermissionEnum.DEPARTMENT_DELETE,
        PermissionEnum.ACADEMIC_MANAGE, PermissionEnum.ACADEMIC_READ,
        PermissionEnum.THEME_READ, PermissionEnum.THEME_UPDATE,
        PermissionEnum.SYLLABUS_UPLOAD, PermissionEnum.SYLLABUS_READ, PermissionEnum.SYLLABUS_UPDATE,
        PermissionEnum.QUESTION_CREATE, PermissionEnum.QUESTION_READ, PermissionEnum.QUESTION_UPDATE, PermissionEnum.QUESTION_APPROVE,
        PermissionEnum.PAPER_CREATE, PermissionEnum.PAPER_READ, PermissionEnum.PAPER_UPDATE, PermissionEnum.PAPER_GENERATE,
        PermissionEnum.PAPER_REVIEW, PermissionEnum.PAPER_APPROVE, PermissionEnum.PAPER_FINALIZE, PermissionEnum.PAPER_PUBLISH, PermissionEnum.PAPER_EXPORT,
        PermissionEnum.AUDIT_READ
    ],
    RoleEnum.INSTITUTION_ADMIN: [
        PermissionEnum.USER_CREATE, PermissionEnum.USER_READ, PermissionEnum.USER_UPDATE,
        PermissionEnum.UNIVERSITY_READ,
        PermissionEnum.INSTITUTION_READ, PermissionEnum.INSTITUTION_UPDATE,
        PermissionEnum.DEPARTMENT_CREATE, PermissionEnum.DEPARTMENT_READ, PermissionEnum.DEPARTMENT_UPDATE,
        PermissionEnum.ACADEMIC_MANAGE, PermissionEnum.ACADEMIC_READ,
        PermissionEnum.THEME_READ,
        PermissionEnum.SYLLABUS_UPLOAD, PermissionEnum.SYLLABUS_READ, PermissionEnum.SYLLABUS_UPDATE,
        PermissionEnum.QUESTION_CREATE, PermissionEnum.QUESTION_READ, PermissionEnum.QUESTION_UPDATE, PermissionEnum.QUESTION_APPROVE,
        PermissionEnum.PAPER_CREATE, PermissionEnum.PAPER_READ, PermissionEnum.PAPER_UPDATE, PermissionEnum.PAPER_GENERATE,
        PermissionEnum.PAPER_APPROVE, PermissionEnum.PAPER_PUBLISH, PermissionEnum.PAPER_EXPORT
    ],
    RoleEnum.DEPARTMENT_ADMIN: [
        PermissionEnum.USER_CREATE, PermissionEnum.USER_READ, PermissionEnum.USER_UPDATE,
        PermissionEnum.UNIVERSITY_READ,
        PermissionEnum.DEPARTMENT_READ, PermissionEnum.DEPARTMENT_UPDATE,
        PermissionEnum.ACADEMIC_MANAGE, PermissionEnum.ACADEMIC_READ,
        PermissionEnum.SYLLABUS_UPLOAD, PermissionEnum.SYLLABUS_READ, PermissionEnum.SYLLABUS_UPDATE,
        PermissionEnum.QUESTION_CREATE, PermissionEnum.QUESTION_READ, PermissionEnum.QUESTION_UPDATE, PermissionEnum.QUESTION_APPROVE,
        PermissionEnum.PAPER_CREATE, PermissionEnum.PAPER_READ, PermissionEnum.PAPER_UPDATE, PermissionEnum.PAPER_GENERATE,
        PermissionEnum.PAPER_APPROVE, PermissionEnum.PAPER_PUBLISH, PermissionEnum.PAPER_EXPORT
    ],
    RoleEnum.HOD: [
        PermissionEnum.USER_CREATE, PermissionEnum.USER_READ, PermissionEnum.USER_UPDATE,
        PermissionEnum.UNIVERSITY_READ, PermissionEnum.DEPARTMENT_READ,
        PermissionEnum.ACADEMIC_READ, PermissionEnum.ACADEMIC_MANAGE,
        PermissionEnum.SYLLABUS_UPLOAD, PermissionEnum.SYLLABUS_READ, PermissionEnum.SYLLABUS_UPDATE,
        PermissionEnum.QUESTION_CREATE, PermissionEnum.QUESTION_READ, PermissionEnum.QUESTION_UPDATE, PermissionEnum.QUESTION_REVIEW, PermissionEnum.QUESTION_APPROVE,
        PermissionEnum.PAPER_CREATE, PermissionEnum.PAPER_READ, PermissionEnum.PAPER_UPDATE, PermissionEnum.PAPER_GENERATE,
        PermissionEnum.PAPER_REVIEW, PermissionEnum.PAPER_APPROVE, PermissionEnum.PAPER_PUBLISH, PermissionEnum.PAPER_EXPORT
    ],
    RoleEnum.EXAM_CONTROLLER: [
        PermissionEnum.UNIVERSITY_READ, PermissionEnum.DEPARTMENT_READ, PermissionEnum.ACADEMIC_READ,
        PermissionEnum.QUESTION_READ, PermissionEnum.QUESTION_APPROVE,
        PermissionEnum.PAPER_CREATE, PermissionEnum.PAPER_READ, PermissionEnum.PAPER_UPDATE, PermissionEnum.PAPER_GENERATE,
        PermissionEnum.PAPER_REVIEW, PermissionEnum.PAPER_APPROVE, PermissionEnum.PAPER_FINALIZE, PermissionEnum.PAPER_PUBLISH, PermissionEnum.PAPER_EXPORT,
        PermissionEnum.AUDIT_READ
    ],
    RoleEnum.COORDINATOR: [
        PermissionEnum.UNIVERSITY_READ, PermissionEnum.DEPARTMENT_READ, PermissionEnum.ACADEMIC_READ,
        PermissionEnum.SYLLABUS_READ,
        PermissionEnum.QUESTION_READ,
        PermissionEnum.PAPER_READ, PermissionEnum.PAPER_EXPORT,
        PermissionEnum.AUDIT_READ
    ],
    RoleEnum.EXAM_COORDINATOR: [
        PermissionEnum.UNIVERSITY_READ, PermissionEnum.DEPARTMENT_READ, PermissionEnum.ACADEMIC_READ,
        PermissionEnum.SYLLABUS_READ,
        PermissionEnum.QUESTION_READ,
        PermissionEnum.PAPER_READ, PermissionEnum.PAPER_EXPORT,
        PermissionEnum.AUDIT_READ
    ],
    RoleEnum.TEACHER: [
        PermissionEnum.UNIVERSITY_READ, PermissionEnum.DEPARTMENT_READ, PermissionEnum.ACADEMIC_READ,
        PermissionEnum.SYLLABUS_UPLOAD, PermissionEnum.SYLLABUS_READ,
        PermissionEnum.QUESTION_CREATE, PermissionEnum.QUESTION_READ, PermissionEnum.QUESTION_UPDATE,
        PermissionEnum.PAPER_CREATE, PermissionEnum.PAPER_READ, PermissionEnum.PAPER_UPDATE, PermissionEnum.PAPER_GENERATE,
        PermissionEnum.PAPER_EXPORT
    ],
    RoleEnum.FACULTY: [
        PermissionEnum.UNIVERSITY_READ, PermissionEnum.DEPARTMENT_READ, PermissionEnum.ACADEMIC_READ,
        PermissionEnum.SYLLABUS_UPLOAD, PermissionEnum.SYLLABUS_READ,
        PermissionEnum.QUESTION_CREATE, PermissionEnum.QUESTION_READ, PermissionEnum.QUESTION_UPDATE,
        PermissionEnum.PAPER_CREATE, PermissionEnum.PAPER_READ, PermissionEnum.PAPER_UPDATE, PermissionEnum.PAPER_GENERATE,
        PermissionEnum.PAPER_EXPORT
    ],
    RoleEnum.QUESTION_SETTER: [
        PermissionEnum.UNIVERSITY_READ, PermissionEnum.DEPARTMENT_READ, PermissionEnum.ACADEMIC_READ,
        PermissionEnum.SYLLABUS_READ,
        PermissionEnum.QUESTION_CREATE, PermissionEnum.QUESTION_READ, PermissionEnum.QUESTION_UPDATE
    ],
    RoleEnum.REVIEWER: [
        PermissionEnum.UNIVERSITY_READ, PermissionEnum.DEPARTMENT_READ, PermissionEnum.ACADEMIC_READ,
        PermissionEnum.SYLLABUS_READ,
        PermissionEnum.QUESTION_READ, PermissionEnum.QUESTION_REVIEW,
        PermissionEnum.PAPER_READ, PermissionEnum.PAPER_REVIEW
    ],
    RoleEnum.MODERATOR: [
        PermissionEnum.UNIVERSITY_READ, PermissionEnum.DEPARTMENT_READ, PermissionEnum.ACADEMIC_READ,
        PermissionEnum.QUESTION_READ, PermissionEnum.QUESTION_APPROVE,
        PermissionEnum.PAPER_READ, PermissionEnum.PAPER_APPROVE
    ],
    RoleEnum.PAPER_GENERATOR: [
        PermissionEnum.UNIVERSITY_READ, PermissionEnum.DEPARTMENT_READ, PermissionEnum.ACADEMIC_READ,
        PermissionEnum.QUESTION_READ,
        PermissionEnum.PAPER_CREATE, PermissionEnum.PAPER_READ, PermissionEnum.PAPER_GENERATE, PermissionEnum.PAPER_EXPORT
    ],
    RoleEnum.STUDENT: [
        PermissionEnum.UNIVERSITY_READ, PermissionEnum.DEPARTMENT_READ, PermissionEnum.ACADEMIC_READ,
        PermissionEnum.SYLLABUS_READ,
        PermissionEnum.PAPER_READ, PermissionEnum.PAPER_EXPORT
    ],
    RoleEnum.NORMAL_USER: [
        PermissionEnum.UNIVERSITY_READ, PermissionEnum.ACADEMIC_READ
    ]
}

# Server-Side Hierarchical Provisioning Rules: Creator Role -> Allowed Target Roles
HIERARCHICAL_CREATION_RULES: Dict[str, List[str]] = {
    "SUPER_ADMIN": [
        "SUPER_ADMIN", "UNIVERSITY_ADMIN", "INSTITUTION_ADMIN", "HOD",
        "TEACHER", "FACULTY", "COORDINATOR", "EXAM_CONTROLLER", "STUDENT",
        "DEPARTMENT_ADMIN", "QUESTION_SETTER", "REVIEWER", "MODERATOR", "PAPER_GENERATOR"
    ],
    "UNIVERSITY_ADMIN": [
        "INSTITUTION_ADMIN", "HOD", "EXAM_CONTROLLER", "COORDINATOR",
        "TEACHER", "FACULTY", "STUDENT", "QUESTION_SETTER", "REVIEWER", "MODERATOR"
    ],
    "INSTITUTION_ADMIN": [
        "HOD", "COORDINATOR", "TEACHER", "FACULTY", "STUDENT", "QUESTION_SETTER", "REVIEWER"
    ],
    "HOD": [
        "TEACHER", "FACULTY", "COORDINATOR", "STUDENT", "QUESTION_SETTER"
    ],
    "DEPARTMENT_ADMIN": [
        "TEACHER", "FACULTY", "COORDINATOR", "STUDENT"
    ]
}

def can_provision_role(creator_role: str, target_role: str) -> bool:
    creator = creator_role.upper()
    target = target_role.upper()
    allowed = HIERARCHICAL_CREATION_RULES.get(creator, [])
    return target in allowed

def detect_default_role_by_email(email: str) -> RoleEnum:
    """Domain-based heuristic suggestion. Final authorization ALWAYS comes from the DB."""
    email_lower = email.lower()
    if "@superadmin." in email_lower or email_lower.startswith("superadmin@") or "apex@superadmin.com" in email_lower:
        return RoleEnum.SUPER_ADMIN
    if "@universityadmin." in email_lower or "univadmin" in email_lower:
        return RoleEnum.UNIVERSITY_ADMIN
    if "@apexcollege." in email_lower or "@institution." in email_lower or "instadmin" in email_lower:
        return RoleEnum.INSTITUTION_ADMIN
    if "@hod." in email_lower or email_lower.startswith("hod@"):
        return RoleEnum.HOD
    if "controller@" in email_lower:
        return RoleEnum.EXAM_CONTROLLER
    if "coordinator@" in email_lower or "@coordinator." in email_lower:
        return RoleEnum.COORDINATOR
    if "teacher@" in email_lower or "@faculty." in email_lower:
        return RoleEnum.FACULTY
    if "student@" in email_lower or "@student." in email_lower:
        return RoleEnum.STUDENT
    return RoleEnum.NORMAL_USER
