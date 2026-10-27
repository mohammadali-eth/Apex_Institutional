"""Domain mapping management and access control service."""

import re
import uuid
from typing import Any

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.domain_mapping import DomainRoleMapping
from app.models.enums import AuditEventType, OrganizationStatus, RoleCode, UserStatus
from app.models.organization import Department, Institution, University
from app.models.role import Role
from app.schemas.domain_mapping import (
    DomainMappingCreate,
    DomainMappingResponse,
    DomainMappingUpdate,
)
from app.services.audit_service import audit_service


PUBLIC_EMAIL_PROVIDERS: set[str] = {
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "yahoo.in",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "icloud.com",
    "proton.me",
    "protonmail.com",
    "zoho.com",
    "rediffmail.com",
}


class DomainService:
    """Manages domain-to-role mappings, scope verification, and provisioning resolution."""

    @staticmethod
    def normalize_domain(domain_or_email: str) -> str:
        """Extract and normalize domain pattern from email or domain string."""
        raw = domain_or_email.strip().lower()
        if "@" in raw:
            raw = raw.split("@")[-1]
        if raw.startswith("@") and not raw.startswith("@*"):
            raw = raw[1:]
        return raw.strip()

    async def list_domain_mappings(
        self,
        db: AsyncSession,
        active_only: bool = False,
    ) -> list[DomainRoleMapping]:
        """Retrieve configured domain mappings with eager-loaded organizational relationships."""
        stmt = (
            select(DomainRoleMapping)
            .options(
                selectinload(DomainRoleMapping.role),
                selectinload(DomainRoleMapping.university),
                selectinload(DomainRoleMapping.institution),
                selectinload(DomainRoleMapping.department),
            )
            .order_by(DomainRoleMapping.priority.desc(), DomainRoleMapping.domain_pattern)
        )
        if active_only:
            stmt = stmt.where(DomainRoleMapping.is_active == True)  # noqa: E712

        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_domain_mapping_by_id(
        self,
        db: AsyncSession,
        mapping_id: uuid.UUID,
    ) -> DomainRoleMapping | None:
        """Fetch domain mapping by primary key."""
        stmt = (
            select(DomainRoleMapping)
            .options(
                selectinload(DomainRoleMapping.role),
                selectinload(DomainRoleMapping.university),
                selectinload(DomainRoleMapping.institution),
                selectinload(DomainRoleMapping.department),
            )
            .where(DomainRoleMapping.id == mapping_id)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_mapping_for_domain(
        self,
        db: AsyncSession,
        domain_or_email: str,
    ) -> DomainRoleMapping | None:
        """Find best matching active domain mapping using deterministic priority.

        Priority order:
        1. Exact email match (e.g. cs.hod@hod.com)
        2. Exact domain / subdomain match (e.g. universityadmin.in, bca.hod.in)
        3. Wildcard pattern match (e.g. *@universityadmin.com, *@hod.com, *.hod.in)
        4. Configured numerical priority (higher priority number takes precedence)
        """
        raw = domain_or_email.strip().lower()
        has_at = "@" in raw
        domain = raw.split("@")[-1] if has_at else raw

        stmt = (
            select(DomainRoleMapping)
            .options(
                selectinload(DomainRoleMapping.role),
                selectinload(DomainRoleMapping.university),
                selectinload(DomainRoleMapping.institution),
                selectinload(DomainRoleMapping.department),
            )
            .where(DomainRoleMapping.is_active == True)  # noqa: E712
            .order_by(DomainRoleMapping.priority.desc(), DomainRoleMapping.created_at.asc())
        )
        result = await db.execute(stmt)
        mappings = list(result.scalars().all())

        best_mapping: DomainRoleMapping | None = None
        best_score = -1

        for m in mappings:
            pat = m.domain_pattern.strip().lower()
            score = -1

            # Exact email match: e.g. "cs.hod@hod.com"
            if has_at and pat == raw:
                score = 1000 + m.priority
            # Exact domain match: e.g. "universityadmin.in"
            elif pat == domain:
                score = 500 + m.priority
            # Wildcard email match: "*@domain.com" or "@domain.com"
            elif pat in (f"*@{domain}", f"@{domain}"):
                score = 400 + m.priority
            # Wildcard subdomain match: "*.hod.in" where domain is "bca.hod.in"
            elif pat.startswith("*.") and domain.endswith(pat[1:]):
                score = 300 + m.priority
            elif pat.startswith("*@*.") and domain.endswith(pat[3:]):
                score = 300 + m.priority

            if score > best_score:
                best_score = score
                best_mapping = m

        return best_mapping

    async def create_domain_mapping(
        self,
        db: AsyncSession,
        data: DomainMappingCreate,
        actor_user_id: uuid.UUID | None = None,
        request: Request | None = None,
    ) -> tuple[DomainRoleMapping | None, str | None]:
        """Configure a new domain mapping with strict organizational and privilege verification."""
        domain = self.normalize_domain(data.domain_pattern)

        # 1. Reject duplicate mappings
        existing = await self.get_mapping_for_domain(db, domain)
        if existing:
            return None, f"Domain mapping for '{domain}' is already configured."

        # Check in DB even if inactive
        check_stmt = select(DomainRoleMapping).where(DomainRoleMapping.domain_pattern == domain)
        if (await db.execute(check_stmt)).scalar_one_or_none():
            return None, f"Domain mapping for '{domain}' already exists."

        # 2. Validate Role exists in catalog and prevent privilege escalation
        if not data.role_code and not data.role_id:
            return None, "Either role_code or role_id is required."

        if data.role_id:
            role_stmt = select(Role).where(Role.id == data.role_id, Role.is_active == True)  # noqa: E712
        else:
            role_stmt = select(Role).where(Role.code == data.role_code, Role.is_active == True)  # noqa: E712

        role = (await db.execute(role_stmt)).scalar_one_or_none()
        if not role:
            return None, "Selected role does not exist or is inactive."

        if role.code == RoleCode.SUPER_ADMIN:
            return None, "Super Administrator role cannot be assigned via domain mapping."

        # 3. Scope and Organizational Validation
        scope_err = await self._validate_scope(
            db=db,
            role_code=role.code,
            university_id=data.university_id,
            institution_id=data.institution_id,
            department_id=data.department_id,
        )
        if scope_err:
            return None, scope_err

        mapping = DomainRoleMapping(
            domain_pattern=domain,
            identity_type=data.identity_type,
            priority=data.priority,
            role_id=role.id,
            university_id=data.university_id,
            institution_id=data.institution_id,
            department_id=data.department_id,
            is_active=data.is_active,
            description=data.description,
        )
        db.add(mapping)
        await db.flush()

        await audit_service.record_event(
            db,
            event_type=AuditEventType.DOMAIN_MAPPING_CREATED,
            user_id=actor_user_id,
            request=request,
            details=f"Configured domain mapping: {domain} -> {role.code}",
        )
        await db.commit()

        return await self.get_domain_mapping_by_id(db, mapping.id), None

    async def update_domain_mapping(
        self,
        db: AsyncSession,
        mapping_id: uuid.UUID,
        data: DomainMappingUpdate,
        actor_user_id: uuid.UUID | None = None,
        request: Request | None = None,
    ) -> tuple[DomainRoleMapping | None, str | None]:
        """Update domain mapping attributes and scopes."""
        mapping = await self.get_domain_mapping_by_id(db, mapping_id)
        if not mapping:
            return None, "Domain mapping not found."

        # Determine effective role code
        effective_role_code = mapping.role.code
        if data.role_id is not None:
            role_stmt = select(Role).where(Role.id == data.role_id, Role.is_active == True)  # noqa: E712
            new_role = (await db.execute(role_stmt)).scalar_one_or_none()
            if not new_role:
                return None, "Selected role does not exist or is inactive."
            if new_role.code == RoleCode.SUPER_ADMIN:
                return None, "Super Administrator role cannot be assigned via domain mapping."
            mapping.role_id = new_role.id
            effective_role_code = new_role.code
        elif data.role_code is not None:
            if data.role_code == RoleCode.SUPER_ADMIN:
                return None, "Super Administrator role cannot be assigned via domain mapping."
            role_stmt = select(Role).where(Role.code == data.role_code, Role.is_active == True)  # noqa: E712
            new_role = (await db.execute(role_stmt)).scalar_one_or_none()
            if not new_role:
                return None, f"Role code '{data.role_code}' does not exist or is inactive."
            mapping.role_id = new_role.id
            effective_role_code = new_role.code

        effective_univ_id = data.university_id if data.university_id is not None else mapping.university_id
        effective_inst_id = data.institution_id if data.institution_id is not None else mapping.institution_id
        effective_dept_id = data.department_id if data.department_id is not None else mapping.department_id

        scope_err = await self._validate_scope(
            db=db,
            role_code=effective_role_code,
            university_id=effective_univ_id,
            institution_id=effective_inst_id,
            department_id=effective_dept_id,
        )
        if scope_err:
            return None, scope_err

        if data.identity_type is not None:
            mapping.identity_type = data.identity_type
        if data.priority is not None:
            mapping.priority = data.priority
        if data.university_id is not None:
            mapping.university_id = data.university_id
        if data.institution_id is not None:
            mapping.institution_id = data.institution_id
        if data.department_id is not None:
            mapping.department_id = data.department_id
        if data.is_active is not None:
            mapping.is_active = data.is_active
        if data.description is not None:
            mapping.description = data.description

        await audit_service.record_event(
            db,
            event_type=AuditEventType.DOMAIN_MAPPING_UPDATED,
            user_id=actor_user_id,
            request=request,
            details=f"Updated domain mapping: {mapping.domain_pattern} (active={mapping.is_active})",
        )
        await db.commit()

        return await self.get_domain_mapping_by_id(db, mapping.id), None

    async def delete_domain_mapping(
        self,
        db: AsyncSession,
        mapping_id: uuid.UUID,
        actor_user_id: uuid.UUID | None = None,
        request: Request | None = None,
    ) -> tuple[bool, str | None]:
        """Remove domain mapping."""
        mapping = await self.get_domain_mapping_by_id(db, mapping_id)
        if not mapping:
            return False, "Domain mapping not found."

        pattern = mapping.domain_pattern
        await db.delete(mapping)
        await audit_service.record_event(
            db,
            event_type=AuditEventType.DOMAIN_MAPPING_DELETED,
            user_id=actor_user_id,
            request=request,
            details=f"Deleted domain mapping: {pattern}",
        )
        await db.commit()
        return True, None

    async def _validate_scope(
        self,
        db: AsyncSession,
        role_code: RoleCode,
        university_id: uuid.UUID | None,
        institution_id: uuid.UUID | None,
        department_id: uuid.UUID | None,
    ) -> str | None:
        """Validate organizational consistency and mandatory scopes."""
        # 1. University Admin must have university_id
        if role_code == RoleCode.UNIVERSITY_ADMIN:
            if not university_id:
                return "University Admin mapping requires a valid university_id."
            univ = (
                await db.execute(
                    select(University).where(
                        University.id == university_id,
                        University.status == OrganizationStatus.ACTIVE,
                    )
                )
            ).scalar_one_or_none()
            if not univ:
                return "Assigned university does not exist or is inactive."

        # 2. Institution Admin must have university_id and institution_id
        if role_code == RoleCode.INSTITUTION_ADMIN:
            if not university_id or not institution_id:
                return "Institution Admin mapping requires university_id and institution_id."
            inst = (
                await db.execute(
                    select(Institution).where(
                        Institution.id == institution_id,
                        Institution.university_id == university_id,
                        Institution.status == OrganizationStatus.ACTIVE,
                    )
                )
            ).scalar_one_or_none()
            if not inst:
                return "Assigned institution does not exist, is inactive, or does not belong to the university."

        # 3. Department Admin (HOD) must have department_id, institution_id, and university_id
        if role_code == RoleCode.DEPARTMENT_ADMIN:
            if not department_id:
                return "Department Admin (HOD) mapping requires a department_id."
            dept = (
                await db.execute(
                    select(Department)
                    .options(selectinload(Department.institution))
                    .where(
                        Department.id == department_id,
                        Department.status == OrganizationStatus.ACTIVE,
                    )
                )
            ).scalar_one_or_none()
            if not dept:
                return "Assigned department does not exist or is inactive."
            if institution_id and dept.institution_id != institution_id:
                return "Assigned department does not belong to the specified institution."
            if university_id and dept.institution and dept.institution.university_id != university_id:
                return "Assigned department's institution does not belong to the specified university."

        return None

    async def resolve_email_identity(
        self,
        db: AsyncSession,
        email: str,
    ) -> dict[str, Any]:
        """Classify and resolve initial identity category, organizational scope, and default role.

        Resolution priority:
        1. Explicit active domain/identity mapping in database
        2. Recognized public email provider -> STUDENT (public scope)
        3. Unknown domain -> UNKNOWN / PENDING_VERIFICATION (requires administrator approval)
        """
        raw_email = email.strip().lower()
        domain = raw_email.split("@")[-1] if "@" in raw_email else raw_email

        # 1. Database-backed domain / explicit pattern mapping
        mapping = await self.get_mapping_for_domain(db, raw_email)
        if mapping and mapping.is_active:
            role_code = mapping.role.code
            is_super = (role_code == RoleCode.SUPER_ADMIN or mapping.identity_type == "SUPER_ADMIN")
            return {
                "email": raw_email,
                "domain": domain,
                "identity_type": mapping.identity_type or role_code,
                "role_id": mapping.role_id,
                "role_code": role_code,
                "role_name": mapping.role.name,
                "university_id": mapping.university_id,
                "institution_id": mapping.institution_id,
                "department_id": mapping.department_id,
                "is_configured": True,
                "is_public_provider": False,
                "is_super_admin": is_super,
                "is_unknown_domain": False,
                "requires_approval": is_super,
                "default_status": UserStatus.ACTIVE,
            }

        # 2. Recognized public personal email providers
        if domain in PUBLIC_EMAIL_PROVIDERS:
            student_role = (
                await db.execute(select(Role).where(Role.code == RoleCode.STUDENT))
            ).scalar_one_or_none()
            if not student_role:
                student_role = (
                    await db.execute(select(Role).where(Role.code == RoleCode.GENERAL_USER))
                ).scalar_one()

            return {
                "email": raw_email,
                "domain": domain,
                "identity_type": "PUBLIC_EMAIL",
                "role_id": student_role.id,
                "role_code": student_role.code,
                "role_name": student_role.name,
                "university_id": None,
                "institution_id": None,
                "department_id": None,
                "is_configured": False,
                "is_public_provider": True,
                "is_super_admin": False,
                "is_unknown_domain": False,
                "requires_approval": False,
                "default_status": UserStatus.ACTIVE,
            }

        # 3. Unknown domain fallback
        # Unknown domains MUST NOT automatically receive administrative privileges!
        student_role = (
            await db.execute(select(Role).where(Role.code == RoleCode.STUDENT))
        ).scalar_one_or_none()
        if not student_role:
            student_role = (
                await db.execute(select(Role).where(Role.code == RoleCode.GENERAL_USER))
            ).scalar_one()

        return {
            "email": raw_email,
            "domain": domain,
            "identity_type": "UNKNOWN",
            "role_id": student_role.id,
            "role_code": student_role.code,
            "role_name": student_role.name,
            "university_id": None,
            "institution_id": None,
            "department_id": None,
            "is_configured": False,
            "is_public_provider": False,
            "is_super_admin": False,
            "is_unknown_domain": True,
            "requires_approval": True,
            "default_status": UserStatus.ACTIVE,
        }

    async def resolve_user_provisioning_for_domain(
        self,
        db: AsyncSession,
        email: str,
    ) -> dict[str, Any]:
        """Resolve role and organizational scope for an email based on trusted database configuration."""
        return await self.resolve_email_identity(db, email)

    def serialize_domain_mapping(self, m: DomainRoleMapping) -> DomainMappingResponse:
        """Serialize database model to public schema."""
        return DomainMappingResponse(
            id=m.id,
            domain_pattern=m.domain_pattern,
            identity_type=m.identity_type,
            priority=m.priority,
            role_id=m.role_id,
            role_code=m.role.code if m.role else "",
            role_name=m.role.name if m.role else "",
            university_id=m.university_id,
            university_name=m.university.name if m.university else None,
            institution_id=m.institution_id,
            institution_name=m.institution.name if m.institution else None,
            department_id=m.department_id,
            department_name=m.department.name if m.department else None,
            is_active=m.is_active,
            description=m.description,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )


domain_service = DomainService()
