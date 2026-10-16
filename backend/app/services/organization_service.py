"""Organization service managing Universities, Institutions, and Departments."""

import uuid

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import AuditEventType, InvitationStatus, OrganizationStatus, RoleCode
from app.models.organization import Department, Institution, University
from app.models.role import Role, StaffInvitation, UserRoleAssignment
from app.models.user import User
from app.schemas.organization import (
    DepartmentCreate,
    DepartmentResponse,
    InstitutionCreate,
    InstitutionResponse,
    UniversityCreate,
    UniversityResponse,
    UniversityUpdate,
)
from app.services.audit_service import audit_service


class OrganizationService:
    """Manages institutional hierarchies and platform organization data."""

    async def list_universities(
        self,
        db: AsyncSession,
        status: OrganizationStatus | None = None,
    ) -> list[UniversityResponse]:
        """List universities with aggregated institution and admin metrics."""
        stmt = select(University).order_by(University.created_at.desc())
        if status:
            stmt = stmt.where(University.status == status)

        result = await db.execute(stmt)
        universities = result.scalars().all()

        responses: list[UniversityResponse] = []
        for u in universities:
            # Query count of institutions
            inst_stmt = select(func.count(Institution.id)).where(Institution.university_id == u.id)
            inst_count = (await db.execute(inst_stmt)).scalar() or 0

            # Query count of active university admins
            admin_stmt = (
                select(func.count(UserRoleAssignment.id))
                .join(Role, UserRoleAssignment.role_id == Role.id)
                .where(
                    UserRoleAssignment.university_id == u.id,
                    UserRoleAssignment.is_active == True,  # noqa: E712
                    Role.code == RoleCode.UNIVERSITY_ADMIN,
                )
            )
            admin_count = (await db.execute(admin_stmt)).scalar() or 0

            responses.append(
                UniversityResponse(
                    id=u.id,
                    code=u.code,
                    name=u.name,
                    type=u.type,
                    status=u.status,
                    region=u.region,
                    address=u.address,
                    institutions_count=inst_count,
                    admins_count=admin_count,
                    created_at=u.created_at,
                    updated_at=u.updated_at,
                )
            )
        return responses

    async def get_university_by_id(
        self,
        db: AsyncSession,
        university_id: uuid.UUID,
    ) -> University | None:
        """Query university entity by identifier."""
        stmt = (
            select(University)
            .options(selectinload(University.institutions).selectinload(Institution.departments))
            .where(University.id == university_id)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_university_by_code(
        self,
        db: AsyncSession,
        code: str,
    ) -> University | None:
        """Query university entity by unique machine code."""
        stmt = select(University).where(University.code == code.upper().strip())
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_university(
        self,
        db: AsyncSession,
        data: UniversityCreate,
        actor_user_id: uuid.UUID | None = None,
        request: Request | None = None,
    ) -> tuple[University | None, str | None]:
        """Register a new university entity in the federation."""
        code = data.code.upper().strip()
        existing = await self.get_university_by_code(db, code)
        if existing:
            return None, f"University code '{code}' is already registered."

        university = University(
            code=code,
            name=data.name.strip(),
            type=data.type.strip(),
            status=OrganizationStatus.ACTIVE,
            region=data.region.strip() if data.region else None,
            address=data.address.strip() if data.address else None,
        )
        db.add(university)
        await db.flush()

        await audit_service.record_event(
            db,
            event_type=AuditEventType.UNIVERSITY_CREATED,
            user_id=actor_user_id,
            request=request,
            details=f"Created university {university.code} ({university.name})",
        )
        return university, None

    async def update_university(
        self,
        db: AsyncSession,
        university_id: uuid.UUID,
        data: UniversityUpdate,
        actor_user_id: uuid.UUID | None = None,
        request: Request | None = None,
    ) -> tuple[University | None, str | None]:
        """Update existing university metadata or lifecycle status."""
        university = await self.get_university_by_id(db, university_id)
        if not university:
            return None, "University not found."

        if data.name is not None:
            university.name = data.name.strip()
        if data.type is not None:
            university.type = data.type.strip()
        if data.status is not None:
            university.status = data.status
        if data.region is not None:
            university.region = data.region.strip()
        if data.address is not None:
            university.address = data.address.strip()

        await db.flush()

        await audit_service.record_event(
            db,
            event_type=AuditEventType.UNIVERSITY_UPDATED,
            user_id=actor_user_id,
            request=request,
            details=f"Updated university {university.code}: status={university.status}",
        )
        return university, None

    async def list_institutions(
        self,
        db: AsyncSession,
        university_id: uuid.UUID,
    ) -> list[InstitutionResponse]:
        """List institutions affiliated with a university."""
        stmt = (
            select(Institution)
            .where(Institution.university_id == university_id)
            .order_by(Institution.created_at.desc())
        )
        result = await db.execute(stmt)
        institutions = result.scalars().all()

        responses: list[InstitutionResponse] = []
        for inst in institutions:
            dept_count_stmt = select(func.count(Department.id)).where(
                Department.institution_id == inst.id
            )
            dept_count = (await db.execute(dept_count_stmt)).scalar() or 0
            responses.append(
                InstitutionResponse(
                    id=inst.id,
                    university_id=inst.university_id,
                    code=inst.code,
                    name=inst.name,
                    type=inst.type,
                    status=inst.status,
                    address=inst.address,
                    contact_email=inst.contact_email,
                    departments_count=dept_count,
                    created_at=inst.created_at,
                    updated_at=inst.updated_at,
                )
            )
        return responses

    async def create_institution(
        self,
        db: AsyncSession,
        university_id: uuid.UUID,
        data: InstitutionCreate,
        actor_user_id: uuid.UUID | None = None,
        request: Request | None = None,
    ) -> tuple[Institution | None, str | None]:
        """Provision an institution or college under a university."""
        university = await self.get_university_by_id(db, university_id)
        if not university:
            return None, "Target university not found."

        code = data.code.upper().strip()
        code_check = await db.execute(select(Institution).where(Institution.code == code))
        if code_check.scalar_one_or_none():
            return None, f"Institution code '{code}' already exists."

        institution = Institution(
            university_id=university_id,
            code=code,
            name=data.name.strip(),
            type=data.type.strip(),
            status=OrganizationStatus.ACTIVE,
            address=data.address.strip() if data.address else None,
            contact_email=data.contact_email.strip() if data.contact_email else None,
        )
        db.add(institution)
        await db.flush()

        await audit_service.record_event(
            db,
            event_type=AuditEventType.INSTITUTION_CREATED,
            user_id=actor_user_id,
            request=request,
            details=f"Created institution {institution.code} ({institution.name}) under university {university.code}",
        )
        return institution, None

    async def list_departments(
        self,
        db: AsyncSession,
        institution_id: uuid.UUID,
    ) -> list[DepartmentResponse]:
        """List academic departments in an institution."""
        stmt = (
            select(Department)
            .where(Department.institution_id == institution_id)
            .order_by(Department.name.asc())
        )
        result = await db.execute(stmt)
        departments = result.scalars().all()
        return [DepartmentResponse.model_validate(d) for d in departments]

    async def create_department(
        self,
        db: AsyncSession,
        institution_id: uuid.UUID,
        data: DepartmentCreate,
        actor_user_id: uuid.UUID | None = None,
        request: Request | None = None,
    ) -> tuple[Department | None, str | None]:
        """Create an academic department in an institution."""
        inst_stmt = select(Institution).where(Institution.id == institution_id)
        inst = (await db.execute(inst_stmt)).scalar_one_or_none()
        if not inst:
            return None, "Target institution not found."

        code = data.code.upper().strip()
        code_stmt = select(Department).where(
            Department.institution_id == institution_id,
            Department.code == code,
        )
        if (await db.execute(code_stmt)).scalar_one_or_none():
            return None, f"Department code '{code}' already exists in this institution."

        department = Department(
            institution_id=institution_id,
            code=code,
            name=data.name.strip(),
            status=OrganizationStatus.ACTIVE,
        )
        db.add(department)
        await db.flush()

        await audit_service.record_event(
            db,
            event_type=AuditEventType.DEPARTMENT_CREATED,
            user_id=actor_user_id,
            request=request,
            details=f"Created department {department.code} in institution {inst.code}",
        )
        return department, None

    async def get_platform_stats(self, db: AsyncSession) -> dict[str, int]:
        """Query platform-level operational statistics."""
        univ_count = (await db.execute(select(func.count(University.id)))).scalar() or 0
        inst_count = (await db.execute(select(func.count(Institution.id)))).scalar() or 0
        dept_count = (await db.execute(select(func.count(Department.id)))).scalar() or 0
        user_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
        pending_invites = (
            await db.execute(
                select(func.count(StaffInvitation.id)).where(
                    StaffInvitation.status == InvitationStatus.INVITED
                )
            )
        ).scalar() or 0

        return {
            "total_universities": univ_count,
            "total_institutions": inst_count,
            "total_departments": dept_count,
            "total_users": user_count,
            "pending_invitations": pending_invites,
        }


organization_service = OrganizationService()
