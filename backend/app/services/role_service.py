"""Role catalog management, delegation policy, invitations, and scope enforcement."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import (
    ensure_utc,
    generate_secure_token,
    hash_password,
    hash_token,
    normalize_email,
    validate_password_policy,
)
from app.models.enums import (
    AuditEventType,
    InvitationStatus,
    OrganizationStatus,
    RoleCode,
    UserStatus,
)
from app.models.domain_mapping import DomainRoleMapping
from app.models.organization import Department, Institution, University
from app.models.role import Role, StaffInvitation, UserRoleAssignment
from app.models.user import User
from app.schemas.role import (
    RoleResponse,
    StaffInvitationResponse,
    StaffMemberResponse,
    UserRoleAssignmentResponse,
)
from app.services.audit_service import audit_service
from app.services.email.service import email_service
from app.services.session_service import session_service

# Delegable roles by University Admin
UNIVERSITY_ADMIN_DELEGABLE_ROLES: frozenset[RoleCode] = frozenset(
    {
        RoleCode.INSTITUTION_ADMIN,
        RoleCode.DEPARTMENT_ADMIN,
        RoleCode.FACULTY_QUESTION_SETTER,
        RoleCode.QUESTION_PAPER_REVIEWER,
        RoleCode.EXAM_CONTROLLER,
        RoleCode.EXAM_COORDINATOR,
        RoleCode.QUESTION_BANK_MANAGER,
        RoleCode.QUALITY_CONTROLLER,
        RoleCode.STUDENT,
        RoleCode.GENERAL_USER,
    }
)

ROLE_CATALOG_DEFINITIONS: list[dict[str, object]] = [
    {
        "code": RoleCode.SUPER_ADMIN,
        "name": "Super Administrator",
        "description": "Platform-level administrative management across all universities and system operations.",
        "is_system": True,
    },
    {
        "code": RoleCode.UNIVERSITY_ADMIN,
        "name": "University Administrator",
        "description": "University-level administrative management, staff provisioning, and organizational governance.",
        "is_system": False,
    },
    {
        "code": RoleCode.INSTITUTION_ADMIN,
        "name": "Institution Administrator",
        "description": "Campus/college administrative lead managing local institutional operations.",
        "is_system": False,
    },
    {
        "code": RoleCode.DEPARTMENT_ADMIN,
        "name": "Department Administrator / HOD",
        "description": "Academic department head managing course allocations and academic operations.",
        "is_system": False,
    },
    {
        "code": RoleCode.FACULTY_QUESTION_SETTER,
        "name": "Faculty / Question Setter",
        "description": "Authorized faculty member responsible for authoring and submitting assessment questions.",
        "is_system": False,
    },
    {
        "code": RoleCode.QUESTION_PAPER_REVIEWER,
        "name": "Question Paper Reviewer",
        "description": "Subject matter expert responsible for scrutinizing and reviewing question papers.",
        "is_system": False,
    },
    {
        "code": RoleCode.EXAM_CONTROLLER,
        "name": "Exam Controller",
        "description": "Institutional authority governing examination processes and security compliance.",
        "is_system": False,
    },
    {
        "code": RoleCode.EXAM_COORDINATOR,
        "name": "Exam Coordinator",
        "description": "Operational coordinator handling examination logistics and schedules.",
        "is_system": False,
    },
    {
        "code": RoleCode.QUESTION_BANK_MANAGER,
        "name": "Question Bank Manager",
        "description": "Custodian of the institutional question repository and taxonomy structures.",
        "is_system": False,
    },
    {
        "code": RoleCode.QUALITY_CONTROLLER,
        "name": "Quality Controller",
        "description": "Academic quality assurance officer reviewing pedagogical and syllabus standards.",
        "is_system": False,
    },
    {
        "code": RoleCode.STUDENT,
        "name": "Student",
        "description": "Enrolled student identity with examination access boundaries.",
        "is_system": False,
    },
    {
        "code": RoleCode.GENERAL_USER,
        "name": "General User",
        "description": "Authenticated user with base portal access rights.",
        "is_system": False,
    },
]

ALL_SYSTEM_PERMISSIONS = [
    "user.view", "user.create", "user.update", "user.delete",
    "question.view", "question.create", "question.update", "question.delete", "question.approve",
    "question_bank.view", "question_bank.manage", "question_bank.archive",
    "paper.view", "paper.create", "paper.update", "paper.submit", "paper.review", "paper.approve", "paper.finalize", "paper.publish",
    "exam.view", "exam.create", "exam.update", "exam.manage",
    "report.view", "audit.view", "system.manage",
]

ROLE_PERMISSIONS_CATALOG: dict[str, list[str]] = {
    RoleCode.SUPER_ADMIN: ALL_SYSTEM_PERMISSIONS,
    RoleCode.UNIVERSITY_ADMIN: [
        "user.view", "user.create", "user.update", "user.delete",
        "question.view", "question.create", "question.update", "question.delete", "question.approve",
        "question_bank.view", "question_bank.manage", "question_bank.archive",
        "paper.view", "paper.create", "paper.update", "paper.submit", "paper.review", "paper.approve", "paper.finalize", "paper.publish",
        "exam.view", "exam.create", "exam.update", "exam.manage",
        "report.view", "audit.view", "system.manage",
    ],
    RoleCode.INSTITUTION_ADMIN: [
        "user.view", "user.create", "user.update",
        "question.view", "question.create", "question.update", "question.delete", "question.approve",
        "question_bank.view", "question_bank.manage",
        "paper.view", "paper.create", "paper.update", "paper.submit", "paper.review", "paper.approve", "paper.finalize",
        "exam.view", "exam.create", "exam.update", "exam.manage",
        "report.view", "audit.view",
    ],
    RoleCode.DEPARTMENT_ADMIN: [
        "user.view", "user.create",
        "question.view", "question.create", "question.update", "question.approve",
        "question_bank.view", "question_bank.manage",
        "paper.view", "paper.create", "paper.update", "paper.submit", "paper.review", "paper.approve", "paper.finalize",
        "exam.view", "exam.create", "exam.update", "report.view",
    ],
    RoleCode.FACULTY_QUESTION_SETTER: [
        "question.view", "question.create", "question.update",
        "question_bank.view", "question_bank.manage",
        "paper.view", "paper.create", "paper.update", "paper.submit",
        "exam.view", "report.view",
    ],
    RoleCode.QUESTION_PAPER_REVIEWER: [
        "question.view", "question_bank.view",
        "paper.view", "paper.review", "exam.view", "report.view",
    ],
    RoleCode.EXAM_CONTROLLER: [
        "question.view", "question_bank.view",
        "paper.view", "paper.review", "paper.approve", "paper.finalize", "paper.publish",
        "exam.view", "exam.create", "exam.update", "exam.manage",
        "report.view", "audit.view",
    ],
    RoleCode.EXAM_COORDINATOR: [
        "question.view", "question_bank.view",
        "paper.view", "paper.create", "paper.update", "paper.submit", "paper.review", "paper.approve",
        "exam.view", "exam.create", "exam.update", "exam.manage", "report.view",
    ],
    RoleCode.QUESTION_BANK_MANAGER: [
        "question.view", "question.create", "question.update", "question.delete", "question.approve",
        "question_bank.view", "question_bank.manage", "question_bank.archive", "report.view",
    ],
    RoleCode.QUALITY_CONTROLLER: [
        "question.view", "question.approve", "question_bank.view",
        "paper.view", "paper.review", "paper.approve", "report.view",
    ],
    RoleCode.STUDENT: ["exam.view"],
    RoleCode.GENERAL_USER: ["exam.view"],
}


class RoleService:
    """Orchestrates role catalog seeding, delegation validation, invitations, and assignments."""

    def get_permissions_for_roles(self, role_codes: list[str | RoleCode]) -> list[str]:
        """Aggregate deduplicated authoritative permissions across all provided role codes."""
        perms: set[str] = set()
        for code in role_codes:
            code_str = str(code)
            if code_str in ROLE_PERMISSIONS_CATALOG:
                perms.update(ROLE_PERMISSIONS_CATALOG[code_str])
        return sorted(perms)

    async def seed_role_catalog(self, db: AsyncSession) -> None:
        """Seed or synchronize controlled role definitions into database catalog."""
        for item in ROLE_CATALOG_DEFINITIONS:
            code = item["code"]
            stmt = select(Role).where(Role.code == code)
            existing = (await db.execute(stmt)).scalar_one_or_none()
            if not existing:
                role = Role(
                    code=code,
                    name=str(item["name"]),
                    description=str(item["description"]),
                    is_system=bool(item["is_system"]),
                    is_active=True,
                )
                db.add(role)
            else:
                existing.name = str(item["name"])
                existing.description = str(item["description"])
                existing.is_system = bool(item["is_system"])
                existing.is_active = True
        await db.flush()

    async def get_role_by_code(self, db: AsyncSession, code: RoleCode | str) -> Role | None:
        """Query role specification by role code."""
        stmt = select(Role).where(Role.code == code)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_roles(self, db: AsyncSession) -> list[RoleResponse]:
        """List all active roles in the catalog."""
        stmt = select(Role).where(Role.is_active == True).order_by(Role.name.asc())  # noqa: E712
        result = await db.execute(stmt)
        roles = result.scalars().all()
        return [RoleResponse.model_validate(r) for r in roles]

    async def get_user_role_assignments(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        active_only: bool = True,
    ) -> list[UserRoleAssignment]:
        """Query role assignments for a user identity with scope entities eager-loaded."""
        stmt = (
            select(UserRoleAssignment)
            .options(
                selectinload(UserRoleAssignment.role),
                selectinload(UserRoleAssignment.university),
                selectinload(UserRoleAssignment.institution),
                selectinload(UserRoleAssignment.department),
            )
            .where(UserRoleAssignment.user_id == user_id)
        )
        if active_only:
            stmt = stmt.where(UserRoleAssignment.is_active == True)  # noqa: E712
        result = await db.execute(stmt)
        return list(result.scalars().all())

    def serialize_role_assignments(
        self,
        assignments: list[UserRoleAssignment],
    ) -> list[UserRoleAssignmentResponse]:
        """Convert ORM role assignment objects into Pydantic responses."""
        responses: list[UserRoleAssignmentResponse] = []
        for a in assignments:
            responses.append(
                UserRoleAssignmentResponse(
                    id=a.id,
                    role_id=a.role_id,
                    role_code=a.role.code,
                    role_name=a.role.name,
                    university_id=a.university_id,
                    university_name=a.university.name if a.university else None,
                    institution_id=a.institution_id,
                    institution_name=a.institution.name if a.institution else None,
                    department_id=a.department_id,
                    department_name=a.department.name if a.department else None,
                    is_active=a.is_active,
                    created_at=a.created_at,
                )
            )
        return responses

    def resolve_portal_routing(
        self,
        assignments: list[UserRoleAssignment],
    ) -> tuple[str, str | None]:
        """Determine appropriate initial portal route and primary active role code.

        Returns:
            (portal_route, primary_role_code)
        """
        active_codes = {a.role.code for a in assignments if a.is_active}

        if RoleCode.SUPER_ADMIN in active_codes:
            return "/admin", RoleCode.SUPER_ADMIN
        if RoleCode.UNIVERSITY_ADMIN in active_codes:
            return "/university-admin", RoleCode.UNIVERSITY_ADMIN
        if RoleCode.DEPARTMENT_ADMIN in active_codes:
            return "/dashboard", RoleCode.DEPARTMENT_ADMIN
        if RoleCode.FACULTY_QUESTION_SETTER in active_codes:
            return "/workspace", RoleCode.FACULTY_QUESTION_SETTER
        if RoleCode.QUESTION_BANK_MANAGER in active_codes:
            return "/questions", RoleCode.QUESTION_BANK_MANAGER
        if RoleCode.QUESTION_PAPER_REVIEWER in active_codes:
            return "/workspace", RoleCode.QUESTION_PAPER_REVIEWER
        if RoleCode.EXAM_CONTROLLER in active_codes or RoleCode.EXAM_COORDINATOR in active_codes:
            return "/examinations", RoleCode.EXAM_CONTROLLER
        if RoleCode.STUDENT in active_codes:
            return "/public-papers", RoleCode.STUDENT
        if RoleCode.GENERAL_USER in active_codes:
            return "/public-papers", RoleCode.GENERAL_USER

        # Default unprivileged workspace showing published papers
        return "/public-papers", RoleCode.STUDENT

    async def is_super_admin(self, db: AsyncSession, user_id: uuid.UUID) -> bool:
        """Check if user holds an active SUPER_ADMIN assignment."""
        stmt = (
            select(UserRoleAssignment)
            .join(Role, UserRoleAssignment.role_id == Role.id)
            .where(
                UserRoleAssignment.user_id == user_id,
                UserRoleAssignment.is_active == True,  # noqa: E712
                Role.code == RoleCode.SUPER_ADMIN,
            )
        )
        return (await db.execute(stmt)).scalar_one_or_none() is not None

    async def get_authorized_university_id(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> uuid.UUID | None:
        """Retrieve authorized university ID for a University Administrator."""
        stmt = (
            select(UserRoleAssignment.university_id)
            .join(Role, UserRoleAssignment.role_id == Role.id)
            .where(
                UserRoleAssignment.user_id == user_id,
                UserRoleAssignment.is_active == True,  # noqa: E712
                Role.code == RoleCode.UNIVERSITY_ADMIN,
            )
        )
        return (await db.execute(stmt)).scalar_one_or_none()

    async def provision_university_admin(
        self,
        db: AsyncSession,
        email: str,
        full_name: str,
        university_id: uuid.UUID,
        password: str,
        actor_user_id: uuid.UUID | None = None,
        request: Request | None = None,
    ) -> tuple[User | None, str | None]:
        """Super Admin provisions a University Administrator for an authorized university."""
        # 1. Verify university exists and is active
        univ_stmt = select(University).where(University.id == university_id)
        univ = (await db.execute(univ_stmt)).scalar_one_or_none()
        if not univ:
            return None, "Target university not found."
        if univ.status != OrganizationStatus.ACTIVE:
            return None, "Target university is suspended or inactive."

        # 2. Check password policy
        policy_err = validate_password_policy(password)
        if policy_err:
            return None, policy_err

        normalized = normalize_email(email)

        # 3. Retrieve or create user
        user_stmt = select(User).where(User.email == normalized)
        user = (await db.execute(user_stmt)).scalar_one_or_none()

        if user:
            # Check if already active university admin for this university
            existing_assign = await db.execute(
                select(UserRoleAssignment)
                .join(Role, UserRoleAssignment.role_id == Role.id)
                .where(
                    UserRoleAssignment.user_id == user.id,
                    UserRoleAssignment.university_id == university_id,
                    Role.code == RoleCode.UNIVERSITY_ADMIN,
                    UserRoleAssignment.is_active == True,  # noqa: E712
                )
            )
            if existing_assign.scalar_one_or_none():
                return (
                    None,
                    f"User '{normalized}' is already an active University Admin for this university.",
                )
            user.status = UserStatus.ACTIVE
            user.full_name = full_name.strip()
            user.password_hash = hash_password(password)
            user.email_verified_at = datetime.now(UTC)
        else:
            user = User(
                email=normalized,
                full_name=full_name.strip(),
                password_hash=hash_password(password),
                status=UserStatus.ACTIVE,
                email_verified_at=datetime.now(UTC),
            )
            db.add(user)
            await db.flush()

        # 4. Resolve UNIVERSITY_ADMIN role
        admin_role = await self.get_role_by_code(db, RoleCode.UNIVERSITY_ADMIN)
        if not admin_role:
            await self.seed_role_catalog(db)
            admin_role = await self.get_role_by_code(db, RoleCode.UNIVERSITY_ADMIN)
            assert admin_role is not None

        # 5. Assign scoped role
        assignment = UserRoleAssignment(
            user_id=user.id,
            role_id=admin_role.id,
            university_id=university_id,
            is_active=True,
            assigned_by_user_id=actor_user_id,
        )
        db.add(assignment)
        await db.flush()

        await audit_service.record_event(
            db,
            event_type=AuditEventType.UNIVERSITY_ADMIN_PROVISIONED,
            user_id=actor_user_id,
            request=request,
            details=f"Provisioned University Admin {user.email} for university {univ.code}",
        )
        await audit_service.record_event(
            db,
            event_type=AuditEventType.ROLE_ASSIGNED,
            user_id=actor_user_id,
            request=request,
            details=f"Assigned UNIVERSITY_ADMIN role to {user.email} (scope={univ.code})",
        )
        return user, None

    async def get_authorized_domains(
        self,
        db: AsyncSession,
        university_id: uuid.UUID,
    ) -> list[str]:
        """Fetch all configured active domain patterns authorized for this university."""
        stmt = (
            select(DomainRoleMapping.domain_pattern)
            .where(
                DomainRoleMapping.university_id == university_id,
                DomainRoleMapping.is_active == True,  # noqa: E712
            )
            .order_by(DomainRoleMapping.domain_pattern)
        )
        patterns = list((await db.execute(stmt)).scalars().all())
        univ = (
            await db.execute(select(University).where(University.id == university_id))
        ).scalar_one_or_none()
        if univ and univ.code == "APEX-UNIV" and "apex.edu" not in patterns:
            patterns.append("apex.edu")
        return patterns

    async def provision_staff_user(
        self,
        db: AsyncSession,
        actor_user: User,
        email: str,
        password: str,
        full_name: str,
        role_code: RoleCode | str,
        university_id: uuid.UUID,
        institution_id: uuid.UUID | None = None,
        department_id: uuid.UUID | None = None,
        request: Request | None = None,
    ) -> tuple[User | None, str | None]:
        """University Administrator directly provisions a staff user with credentials and delegated role.

        Enforces:
        - Domain validation: Email domain must match an authorized/configured domain pattern for the university.
        - Password validation: Password is set as specified, verified against NIST policies.
        - Role delegation: Caller cannot assign SUPER_ADMIN; role must be delegable.
        - Department/Institution scope validation.
        """
        # 1. Verify caller permissions
        is_super = await self.is_super_admin(db, actor_user.id)
        if not is_super:
            authorized_univ = await self.get_authorized_university_id(db, actor_user.id)
            if not authorized_univ or authorized_univ != university_id:
                return None, "You do not have permission to manage staff for this university."

            if role_code not in UNIVERSITY_ADMIN_DELEGABLE_ROLES:
                return None, f"University Admins cannot delegate or assign role '{role_code}'."

        # 2. Validate password policy
        policy_err = validate_password_policy(password)
        if policy_err:
            return None, policy_err

        # 3. Normalize email and validate domain ("only fix domain")
        normalized_email = normalize_email(email)
        if "@" not in normalized_email:
            return None, "A valid email address containing '@' is required."

        email_domain = normalized_email.split("@")[-1]

        # Query all active domain patterns configured for this university
        allowed_domains = set(await self.get_authorized_domains(db, university_id))

        if allowed_domains and email_domain not in allowed_domains:
            formatted_allowed = ", ".join(f"@{d}" for d in sorted(allowed_domains))
            return (
                None,
                f"Email domain '@{email_domain}' is not authorized for this university. Allowed domains: {formatted_allowed}",
            )

        # 4. Department & Institution hierarchy validation
        if department_id:
            dept = (
                await db.execute(select(Department).where(Department.id == department_id))
            ).scalar_one_or_none()
            if not dept:
                return None, "Specified academic department not found."
            if not institution_id:
                institution_id = dept.institution_id

        if institution_id:
            inst = (
                await db.execute(
                    select(Institution).where(
                        Institution.id == institution_id,
                        Institution.university_id == university_id,
                    )
                )
            ).scalar_one_or_none()
            if not inst:
                return None, "Specified campus/institution does not belong to this university."

        if role_code == RoleCode.DEPARTMENT_ADMIN and not department_id:
            # Check if domain mapping maps this domain to a specific department
            mapping = (
                await db.execute(
                    select(DomainRoleMapping).where(
                        DomainRoleMapping.domain_pattern == email_domain,
                        DomainRoleMapping.university_id == university_id,
                        DomainRoleMapping.is_active == True,  # noqa: E712
                    )
                )
            ).scalar_one_or_none()
            if mapping and mapping.department_id:
                department_id = mapping.department_id
                if not institution_id and mapping.institution_id:
                    institution_id = mapping.institution_id
            else:
                return None, "Department Admin (HOD) role requires specifying an academic department."

        # 5. Check if user already exists
        existing_user = (
            await db.execute(select(User).where(User.email == normalized_email))
        ).scalar_one_or_none()

        target_role = await self.get_role_by_code(db, role_code)
        if not target_role:
            return None, f"Role '{role_code}' not found in catalog."

        now = datetime.now(UTC)
        if existing_user:
            dup_assign = (
                await db.execute(
                    select(UserRoleAssignment).where(
                        UserRoleAssignment.user_id == existing_user.id,
                        UserRoleAssignment.role_id == target_role.id,
                        UserRoleAssignment.university_id == university_id,
                        UserRoleAssignment.department_id == department_id,
                        UserRoleAssignment.is_active == True,  # noqa: E712
                    )
                )
            ).scalar_one_or_none()
            if dup_assign:
                return (
                    None,
                    f"User '{normalized_email}' already holds this role in the specified scope.",
                )
            # Update password and status
            existing_user.password_hash = hash_password(password)
            existing_user.status = UserStatus.ACTIVE
            existing_user.full_name = full_name.strip()
            existing_user.password_changed_at = now
            user = existing_user
        else:
            user = User(
                email=normalized_email,
                full_name=full_name.strip(),
                password_hash=hash_password(password),
                status=UserStatus.ACTIVE,
                email_verified_at=now,
                password_changed_at=now,
            )
            db.add(user)
            await db.flush()

        # 6. Create UserRoleAssignment
        assignment = UserRoleAssignment(
            user_id=user.id,
            role_id=target_role.id,
            university_id=university_id,
            institution_id=institution_id,
            department_id=department_id,
            is_active=True,
            assigned_by_user_id=actor_user.id,
        )
        db.add(assignment)
        await db.flush()

        await audit_service.record_event(
            db,
            event_type=AuditEventType.ROLE_ASSIGNED,
            user_id=actor_user.id,
            request=request,
            details=f"University Admin provisioned {user.email} with role {role_code}",
        )
        await db.commit()
        await db.refresh(user)
        return user, None

    async def create_staff_invitation(
        self,
        db: AsyncSession,
        actor_user: User,
        email: str,
        role_code: RoleCode,
        university_id: uuid.UUID,
        institution_id: uuid.UUID | None = None,
        department_id: uuid.UUID | None = None,
        request: Request | None = None,
    ) -> tuple[StaffInvitation | None, str | None, str | None]:
        """University Admin or Super Admin dispatches a staff invitation.

        Returns:
            (invitation, raw_token, error_message)
        """
        # 1. Delegation policy checks
        is_super = await self.is_super_admin(db, actor_user.id)
        if not is_super:
            # Must be a University Admin authorized for this specific university
            authorized_univ = await self.get_authorized_university_id(db, actor_user.id)
            if not authorized_univ or authorized_univ != university_id:
                await audit_service.record_event(
                    db,
                    event_type=AuditEventType.ADMIN_ACCESS_DENIED,
                    user_id=actor_user.id,
                    request=request,
                    details=f"Denied staff invite: caller not authorized for university {university_id}",
                )
                return None, None, "You do not have permission to invite staff for this university."

            # Check delegable roles
            if role_code not in UNIVERSITY_ADMIN_DELEGABLE_ROLES:
                return (
                    None,
                    None,
                    f"University Admins cannot delegate or assign role '{role_code}'.",
                )

        # 2. Validate organizational hierarchy
        univ = (
            await db.execute(select(University).where(University.id == university_id))
        ).scalar_one_or_none()
        if not univ:
            return None, None, "Target university not found."

        if institution_id:
            inst = (
                await db.execute(
                    select(Institution).where(
                        Institution.id == institution_id,
                        Institution.university_id == university_id,
                    )
                )
            ).scalar_one_or_none()
            if not inst:
                return (
                    None,
                    None,
                    "Target institution not found or does not belong to this university.",
                )

            if department_id:
                dept = (
                    await db.execute(
                        select(Department).where(
                            Department.id == department_id,
                            Department.institution_id == institution_id,
                        )
                    )
                ).scalar_one_or_none()
                if not dept:
                    return (
                        None,
                        None,
                        "Target department not found or does not belong to this institution.",
                    )
        elif department_id:
            return None, None, "Department scope requires an associated institution scope."

        # 3. Resolve role
        target_role = await self.get_role_by_code(db, role_code)
        if not target_role:
            return None, None, f"Role '{role_code}' not found in role catalog."

        # 4. Generate token and digest
        raw_token = generate_secure_token(32)
        token_hash = hash_token(raw_token)
        expires_at = datetime.now(UTC) + timedelta(hours=72)
        normalized_email = normalize_email(email)

        # 5. Save StaffInvitation
        invitation = StaffInvitation(
            email=normalized_email,
            role_id=target_role.id,
            university_id=university_id,
            institution_id=institution_id,
            department_id=department_id,
            token_hash=token_hash,
            invited_by_user_id=actor_user.id,
            status=InvitationStatus.INVITED,
            expires_at=expires_at,
        )
        invitation.role = target_role
        invitation.university = univ
        db.add(invitation)
        await db.flush()

        # 6. Send Invitation Email
        await email_service.send_staff_invitation_email(
            to_email=normalized_email,
            raw_token=raw_token,
            university_name=univ.name,
            role_name=target_role.name,
        )

        await audit_service.record_event(
            db,
            event_type=AuditEventType.STAFF_INVITED,
            user_id=actor_user.id,
            request=request,
            details=f"Invited staff {normalized_email} as {target_role.code} for university {univ.code}",
        )

        return invitation, raw_token, None

    async def list_staff_invitations(
        self,
        db: AsyncSession,
        university_id: uuid.UUID,
    ) -> list[StaffInvitationResponse]:
        """List invitations issued for a university."""
        stmt = (
            select(StaffInvitation)
            .options(
                selectinload(StaffInvitation.role),
                selectinload(StaffInvitation.university),
            )
            .where(StaffInvitation.university_id == university_id)
            .order_by(StaffInvitation.created_at.desc())
        )
        result = await db.execute(stmt)
        invitations = result.scalars().all()

        responses: list[StaffInvitationResponse] = []
        for inv in invitations:
            # Query institution & department names if scoped
            inst_name = None
            if inv.institution_id:
                inst_res = await db.execute(
                    select(Institution.name).where(Institution.id == inv.institution_id)
                )
                inst_name = inst_res.scalar_one_or_none()
            dept_name = None
            if inv.department_id:
                dept_res = await db.execute(
                    select(Department.name).where(Department.id == inv.department_id)
                )
                dept_name = dept_res.scalar_one_or_none()

            responses.append(
                StaffInvitationResponse(
                    id=inv.id,
                    email=inv.email,
                    role_id=inv.role_id,
                    role_code=inv.role.code,
                    role_name=inv.role.name,
                    university_id=inv.university_id,
                    university_name=inv.university.name if inv.university else None,
                    institution_id=inv.institution_id,
                    institution_name=inst_name,
                    department_id=inv.department_id,
                    department_name=dept_name,
                    status=inv.status,
                    expires_at=inv.expires_at,
                    created_at=inv.created_at,
                )
            )
        return responses

    async def resend_staff_invitation(
        self,
        db: AsyncSession,
        actor_user: User,
        invitation_id: uuid.UUID,
        request: Request | None = None,
    ) -> tuple[str | None, str | None]:
        """Rotate token, extend expiration, and resend invitation email.

        Returns:
            (raw_token, error_message)
        """
        stmt = (
            select(StaffInvitation)
            .options(selectinload(StaffInvitation.role), selectinload(StaffInvitation.university))
            .where(StaffInvitation.id == invitation_id)
        )
        inv = (await db.execute(stmt)).scalar_one_or_none()
        if not inv:
            return None, "Invitation not found."

        # Verify caller scope
        is_super = await self.is_super_admin(db, actor_user.id)
        if not is_super:
            authorized_univ = await self.get_authorized_university_id(db, actor_user.id)
            if not authorized_univ or authorized_univ != inv.university_id:
                return None, "Unauthorized to manage this invitation."

        if inv.status not in (InvitationStatus.INVITED, InvitationStatus.EXPIRED):
            return None, f"Cannot resend invitation with status '{inv.status}'."

        raw_token = generate_secure_token(32)
        inv.token_hash = hash_token(raw_token)
        inv.expires_at = datetime.now(UTC) + timedelta(hours=72)
        inv.status = InvitationStatus.INVITED
        await db.flush()

        await email_service.send_staff_invitation_email(
            to_email=inv.email,
            raw_token=raw_token,
            university_name=inv.university.name,
            role_name=inv.role.name,
        )

        await audit_service.record_event(
            db,
            event_type=AuditEventType.STAFF_INVITATION_RESENT,
            user_id=actor_user.id,
            request=request,
            details=f"Resent invitation to {inv.email}",
        )
        return raw_token, None

    async def revoke_staff_invitation(
        self,
        db: AsyncSession,
        actor_user: User,
        invitation_id: uuid.UUID,
        request: Request | None = None,
    ) -> tuple[bool, str | None]:
        """Revoke a pending staff invitation."""
        stmt = select(StaffInvitation).where(StaffInvitation.id == invitation_id)
        inv = (await db.execute(stmt)).scalar_one_or_none()
        if not inv:
            return False, "Invitation not found."

        is_super = await self.is_super_admin(db, actor_user.id)
        if not is_super:
            authorized_univ = await self.get_authorized_university_id(db, actor_user.id)
            if not authorized_univ or authorized_univ != inv.university_id:
                return False, "Unauthorized to revoke this invitation."

        inv.status = InvitationStatus.REVOKED
        await db.flush()

        await audit_service.record_event(
            db,
            event_type=AuditEventType.STAFF_INVITATION_REVOKED,
            user_id=actor_user.id,
            request=request,
            details=f"Revoked invitation for {inv.email}",
        )
        return True, None

    async def verify_invitation_token(
        self,
        db: AsyncSession,
        raw_token: str,
    ) -> tuple[StaffInvitation | None, str | None]:
        """Verify invitation token validity without consuming it."""
        token_digest = hash_token(raw_token.strip())
        stmt = (
            select(StaffInvitation)
            .options(selectinload(StaffInvitation.role), selectinload(StaffInvitation.university))
            .where(StaffInvitation.token_hash == token_digest)
        )
        inv = (await db.execute(stmt)).scalar_one_or_none()
        if not inv or inv.status != InvitationStatus.INVITED:
            return None, "Invalid, revoked, or already consumed invitation token."

        now = datetime.now(UTC)
        if ensure_utc(inv.expires_at) < now:
            inv.status = InvitationStatus.EXPIRED
            await db.flush()
            return None, "Invitation token has expired. Please request a new invitation."

        return inv, None

    async def accept_staff_invitation(
        self,
        db: AsyncSession,
        raw_token: str,
        password: str,
        full_name: str,
        request: Request | None = None,
    ) -> tuple[User | None, str | None]:
        """Consume invitation token, activate user account, and create scoped role assignment."""
        inv, err = await self.verify_invitation_token(db, raw_token)
        if not inv or err:
            return None, err or "Invalid invitation token."

        policy_err = validate_password_policy(password)
        if policy_err:
            return None, policy_err

        # Check if user already exists
        user_stmt = select(User).where(User.email == inv.email)
        user = (await db.execute(user_stmt)).scalar_one_or_none()

        now = datetime.now(UTC)
        if user:
            user.full_name = full_name.strip()
            user.password_hash = hash_password(password)
            user.status = UserStatus.ACTIVE
            user.email_verified_at = now
        else:
            user = User(
                email=inv.email,
                full_name=full_name.strip(),
                password_hash=hash_password(password),
                status=UserStatus.ACTIVE,
                email_verified_at=now,
            )
            db.add(user)
            await db.flush()

        # Consume invitation
        inv.consumed_at = now
        inv.status = InvitationStatus.ACTIVE

        # Check existing active assignment
        existing_assign = await db.execute(
            select(UserRoleAssignment).where(
                UserRoleAssignment.user_id == user.id,
                UserRoleAssignment.role_id == inv.role_id,
                UserRoleAssignment.university_id == inv.university_id,
                UserRoleAssignment.institution_id == inv.institution_id,
                UserRoleAssignment.department_id == inv.department_id,
                UserRoleAssignment.is_active == True,  # noqa: E712
            )
        )
        if not existing_assign.scalar_one_or_none():
            assignment = UserRoleAssignment(
                user_id=user.id,
                role_id=inv.role_id,
                university_id=inv.university_id,
                institution_id=inv.institution_id,
                department_id=inv.department_id,
                is_active=True,
                assigned_by_user_id=inv.invited_by_user_id,
            )
            db.add(assignment)

        await db.flush()

        await audit_service.record_event(
            db,
            event_type=AuditEventType.STAFF_ACTIVATED,
            user_id=user.id,
            request=request,
            details=f"Staff account activated for {user.email}",
        )
        await audit_service.record_event(
            db,
            event_type=AuditEventType.ROLE_ASSIGNED,
            user_id=user.id,
            request=request,
            details=f"Assigned role {inv.role.code} upon activation",
        )
        return user, None

    async def list_staff_members(
        self,
        db: AsyncSession,
        university_id: uuid.UUID,
    ) -> list[StaffMemberResponse]:
        """List staff identities and their role assignments in a university."""
        stmt = (
            select(User)
            .join(UserRoleAssignment, User.id == UserRoleAssignment.user_id)
            .where(
                UserRoleAssignment.university_id == university_id,
            )
            .distinct()
            .order_by(User.created_at.desc())
        )
        result = await db.execute(stmt)
        users = result.scalars().all()

        staff_list: list[StaffMemberResponse] = []
        for u in users:
            assignments = await self.get_user_role_assignments(db, u.id, active_only=False)
            univ_assignments = [a for a in assignments if a.university_id == university_id]
            active_univ = [a for a in univ_assignments if a.is_active]
            display_assignments = active_univ if active_univ else univ_assignments
            serialized = self.serialize_role_assignments(display_assignments)
            staff_list.append(
                StaffMemberResponse(
                    id=u.id,
                    email=u.email,
                    full_name=u.full_name,
                    status=u.status,
                    created_at=u.created_at,
                    last_login_at=u.last_login_at,
                    roles=serialized,
                )
            )
        return staff_list

    async def assign_role(
        self,
        db: AsyncSession,
        actor_user: User,
        target_user_id: uuid.UUID,
        role_code: RoleCode,
        university_id: uuid.UUID | None,
        institution_id: uuid.UUID | None = None,
        department_id: uuid.UUID | None = None,
        request: Request | None = None,
    ) -> tuple[UserRoleAssignment | None, str | None]:
        """Assign an approved role with organizational scope under delegation policy."""
        # 1. Delegation policy checks
        is_super = await self.is_super_admin(db, actor_user.id)
        if not is_super:
            # Self-escalation prevention
            if actor_user.id == target_user_id:
                return None, "Self-assignment of roles is strictly prohibited."

            authorized_univ = await self.get_authorized_university_id(db, actor_user.id)
            if not authorized_univ or (university_id and authorized_univ != university_id):
                return (
                    None,
                    "You do not have permission to assign roles outside your authorized university.",
                )
            university_id = authorized_univ

            if role_code not in UNIVERSITY_ADMIN_DELEGABLE_ROLES:
                return None, f"University Admins cannot assign role '{role_code}'."

        if not university_id:
            return None, "University scope is required for role assignment."

        # 2. Check organizational hierarchy
        if institution_id:
            inst = (
                await db.execute(
                    select(Institution).where(
                        Institution.id == institution_id,
                        Institution.university_id == university_id,
                    )
                )
            ).scalar_one_or_none()
            if not inst:
                return None, "Target institution not found in this university."

            if department_id:
                dept = (
                    await db.execute(
                        select(Department).where(
                            Department.id == department_id,
                            Department.institution_id == institution_id,
                        )
                    )
                ).scalar_one_or_none()
                if not dept:
                    return None, "Target department not found in this institution."
        elif department_id:
            return None, "Department scope requires an institution scope."

        # 3. Resolve role and target user
        target_role = await self.get_role_by_code(db, role_code)
        if not target_role:
            return None, f"Role '{role_code}' not found."

        target_user = (
            await db.execute(select(User).where(User.id == target_user_id))
        ).scalar_one_or_none()
        if not target_user:
            return None, "Target user not found."

        # 4. Check if duplicate active assignment already exists
        existing = (
            await db.execute(
                select(UserRoleAssignment).where(
                    UserRoleAssignment.user_id == target_user_id,
                    UserRoleAssignment.role_id == target_role.id,
                    UserRoleAssignment.university_id == university_id,
                    UserRoleAssignment.institution_id == institution_id,
                    UserRoleAssignment.department_id == department_id,
                    UserRoleAssignment.is_active == True,  # noqa: E712
                )
            )
        ).scalar_one_or_none()
        if existing:
            return None, "User already holds this active role assignment in the specified scope."

        assignment = UserRoleAssignment(
            user_id=target_user_id,
            role_id=target_role.id,
            university_id=university_id,
            institution_id=institution_id,
            department_id=department_id,
            is_active=True,
            assigned_by_user_id=actor_user.id,
        )
        assignment.role = target_role
        db.add(assignment)
        await db.flush()

        await audit_service.record_event(
            db,
            event_type=AuditEventType.ROLE_ASSIGNED,
            user_id=actor_user.id,
            request=request,
            details=f"Assigned role {role_code} to {target_user.email} (scope univ={university_id})",
        )
        return assignment, None

    async def revoke_role_assignment(
        self,
        db: AsyncSession,
        actor_user: User,
        assignment_id: uuid.UUID,
        request: Request | None = None,
    ) -> tuple[bool, str | None]:
        """Revoke an active role assignment."""
        stmt = (
            select(UserRoleAssignment)
            .options(selectinload(UserRoleAssignment.role), selectinload(UserRoleAssignment.user))
            .where(UserRoleAssignment.id == assignment_id)
        )
        assignment = (await db.execute(stmt)).scalar_one_or_none()
        if not assignment or not assignment.is_active:
            return False, "Active role assignment not found."

        is_super = await self.is_super_admin(db, actor_user.id)
        if not is_super:
            authorized_univ = await self.get_authorized_university_id(db, actor_user.id)
            if not authorized_univ or authorized_univ != assignment.university_id:
                return False, "Unauthorized to revoke this assignment."

            if (
                assignment.role.code == RoleCode.SUPER_ADMIN
                or assignment.role.code == RoleCode.UNIVERSITY_ADMIN
            ):
                return False, "University Admins cannot revoke administrative tier roles."

        assignment.is_active = False
        assignment.revoked_at = datetime.now(UTC)
        await db.flush()

        await audit_service.record_event(
            db,
            event_type=AuditEventType.ROLE_REVOKED,
            user_id=actor_user.id,
            request=request,
            details=f"Revoked role {assignment.role.code} for user {assignment.user.email}",
        )
        return True, None

    async def update_account_status(
        self,
        db: AsyncSession,
        actor_user: User,
        target_user_id: uuid.UUID,
        new_status: UserStatus,
        request: Request | None = None,
    ) -> tuple[User | None, str | None]:
        """Activate, suspend, or disable a user account."""
        if actor_user.id == target_user_id:
            return None, "Administrators cannot alter their own account status."

        target_user = (
            await db.execute(select(User).where(User.id == target_user_id))
        ).scalar_one_or_none()
        if not target_user:
            return None, "Target user not found."

        is_super = await self.is_super_admin(db, actor_user.id)
        if not is_super:
            authorized_univ = await self.get_authorized_university_id(db, actor_user.id)
            # Check target belongs to this university
            target_assign = await db.execute(
                select(UserRoleAssignment).where(
                    UserRoleAssignment.user_id == target_user_id,
                    UserRoleAssignment.university_id == authorized_univ,
                )
            )
            if not target_assign.scalars().all():
                return None, "Target user does not belong to your authorized university."

        target_user.status = new_status
        if new_status == UserStatus.DISABLED:
            target_user.disabled_at = datetime.now(UTC)
            # Invalidate all active sessions immediately
            await session_service.revoke_all_user_sessions(db, target_user.id)

        await db.flush()

        await audit_service.record_event(
            db,
            event_type=AuditEventType.ACCOUNT_DISABLED
            if new_status == UserStatus.DISABLED
            else AuditEventType.ORGANIZATIONAL_SCOPE_UPDATED,
            user_id=actor_user.id,
            request=request,
            details=f"Updated status of {target_user.email} to {new_status}",
        )
        return target_user, None

    async def update_staff_user(
        self,
        db: AsyncSession,
        actor_user: User,
        target_user_id: uuid.UUID,
        university_id: uuid.UUID,
        full_name: str | None = None,
        email: str | None = None,
        role_code: RoleCode | None = None,
        institution_id: uuid.UUID | None = None,
        department_id: uuid.UUID | None = None,
        status: UserStatus | None = None,
        password: str | None = None,
        request: Request | None = None,
    ) -> tuple[User | None, str | None]:
        """University Admin or Super Admin updates staff user identity, credentials, status, or role."""
        is_super = await self.is_super_admin(db, actor_user.id)
        if not is_super:
            authorized_univ = await self.get_authorized_university_id(db, actor_user.id)
            if not authorized_univ or authorized_univ != university_id:
                return None, "You do not have permission to manage staff for this university."

        if await self.is_super_admin(db, target_user_id) and not is_super:
            return None, "University Admins cannot modify a Super Administrator account."

        target_user = (
            await db.execute(select(User).where(User.id == target_user_id))
        ).scalar_one_or_none()
        if not target_user:
            return None, "Target user not found."

        # Verify target user has affiliation with this university
        target_assigns = list(
            (
                await db.execute(
                    select(UserRoleAssignment).where(
                        UserRoleAssignment.user_id == target_user_id,
                        UserRoleAssignment.university_id == university_id,
                    )
                )
            ).scalars().all()
        )

        if not target_assigns and not is_super:
            return None, "Target user does not belong to your authorized university."

        # 1. Update Full Name
        if full_name is not None and full_name.strip():
            target_user.full_name = full_name.strip()

        # 2. Update Email (enforce "only fix domain")
        if email is not None and email.strip():
            normalized_email = normalize_email(email)
            if normalized_email != target_user.email:
                if "@" not in normalized_email:
                    return None, "A valid email address containing '@' is required."
                email_domain = normalized_email.split("@")[-1]
                allowed_domains = set(await self.get_authorized_domains(db, university_id))
                if allowed_domains and email_domain not in allowed_domains:
                    formatted_allowed = ", ".join(f"@{d}" for d in sorted(allowed_domains))
                    return (
                        None,
                        f"Email domain '@{email_domain}' is not authorized for this university. Allowed domains: {formatted_allowed}",
                    )
                # Check uniqueness
                dup = (
                    await db.execute(
                        select(User).where(User.email == normalized_email, User.id != target_user_id)
                    )
                ).scalar_one_or_none()
                if dup:
                    return None, f"Email '{normalized_email}' is already in use by another account."
                target_user.email = normalized_email

        # 3. Update Password
        if password is not None and password.strip():
            policy_err = validate_password_policy(password)
            if policy_err:
                return None, policy_err
            target_user.password_hash = hash_password(password)
            target_user.password_changed_at = datetime.now(UTC)
            await session_service.revoke_all_user_sessions(db, target_user.id)

        # 4. Update Status
        if status is not None:
            if actor_user.id == target_user_id and status != UserStatus.ACTIVE:
                return None, "Administrators cannot suspend their own account."
            target_user.status = status
            if status == UserStatus.DISABLED:
                target_user.disabled_at = datetime.now(UTC)
                await session_service.revoke_all_user_sessions(db, target_user.id)
                for a in target_assigns:
                    a.is_active = False
            elif status == UserStatus.ACTIVE:
                target_user.disabled_at = None
                for a in target_assigns:
                    a.is_active = True

        # 5. Update / Reassign Role
        if role_code is not None:
            if not is_super and role_code not in UNIVERSITY_ADMIN_DELEGABLE_ROLES:
                return None, f"University Admins cannot delegate or assign role '{role_code}'."

            if department_id:
                dept = (
                    await db.execute(select(Department).where(Department.id == department_id))
                ).scalar_one_or_none()
                if not dept:
                    return None, "Specified academic department not found."
                if not institution_id:
                    institution_id = dept.institution_id

            if institution_id:
                inst = (
                    await db.execute(
                        select(Institution).where(
                            Institution.id == institution_id,
                            Institution.university_id == university_id,
                        )
                    )
                ).scalar_one_or_none()
                if not inst:
                    return None, "Specified campus/institution does not belong to this university."

            if role_code == RoleCode.DEPARTMENT_ADMIN and not department_id:
                return None, "Department Admin (HOD) role requires specifying an academic department."

            target_role = await self.get_role_by_code(db, role_code)
            if not target_role:
                return None, f"Role '{role_code}' not found in catalog."

            # Mark existing assignments in this university inactive
            for a in target_assigns:
                a.is_active = False
                a.revoked_at = datetime.now(UTC)

            # Assign new role
            new_assign = UserRoleAssignment(
                user_id=target_user.id,
                role_id=target_role.id,
                university_id=university_id,
                institution_id=institution_id,
                department_id=department_id,
                is_active=(target_user.status == UserStatus.ACTIVE),
                assigned_by_user_id=actor_user.id,
            )
            db.add(new_assign)

        await db.flush()
        await audit_service.record_event(
            db,
            event_type=AuditEventType.ORGANIZATIONAL_SCOPE_UPDATED,
            user_id=actor_user.id,
            request=request,
            details=f"University Admin updated user {target_user.email}",
        )
        await db.commit()
        await db.refresh(target_user)
        return target_user, None

    async def delete_staff_user(
        self,
        db: AsyncSession,
        actor_user: User,
        target_user_id: uuid.UUID,
        university_id: uuid.UUID,
        request: Request | None = None,
    ) -> tuple[bool, str | None]:
        """Delete or detach a staff user from the university."""
        if actor_user.id == target_user_id:
            return False, "You cannot delete your own administrative account."

        is_super = await self.is_super_admin(db, actor_user.id)
        if not is_super:
            authorized_univ = await self.get_authorized_university_id(db, actor_user.id)
            if not authorized_univ or authorized_univ != university_id:
                return False, "You do not have permission to manage staff for this university."

        if await self.is_super_admin(db, target_user_id) and not is_super:
            return False, "University Admins cannot delete a Super Administrator account."

        target_user = (
            await db.execute(select(User).where(User.id == target_user_id))
        ).scalar_one_or_none()
        if not target_user:
            return False, "Target user not found."

        all_assignments = list(
            (
                await db.execute(
                    select(UserRoleAssignment).where(UserRoleAssignment.user_id == target_user_id)
                )
            ).scalars().all()
        )

        univ_assignments = [a for a in all_assignments if a.university_id == university_id]
        if not univ_assignments and not is_super:
            email_domain = target_user.email.split("@")[-1]
            allowed_domains = set(await self.get_authorized_domains(db, university_id))
            if email_domain not in allowed_domains:
                return False, "Target user does not belong to your university."

        user_email = target_user.email

        # Invalidate all sessions immediately
        await session_service.revoke_all_user_sessions(db, target_user_id)

        # Clear references where target_user was assigned_by
        await db.execute(
            update(UserRoleAssignment)
            .where(UserRoleAssignment.assigned_by_user_id == target_user_id)
            .values(assigned_by_user_id=None)
        )

        other_assignments = [a for a in all_assignments if a.university_id != university_id]
        if not other_assignments:
            # Single-tenant account: Delete the User entity entirely
            await db.delete(target_user)
        else:
            # Multi-tenant account: Remove only assignments for this university
            for a in univ_assignments:
                await db.delete(a)

        await audit_service.record_event(
            db,
            event_type=AuditEventType.ROLE_REVOKED,
            user_id=actor_user.id,
            request=request,
            details=f"University Admin deleted staff user {user_email} from university {university_id}",
        )
        await db.commit()
        return True, None


role_service = RoleService()

