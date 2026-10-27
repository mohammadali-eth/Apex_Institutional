"""Controlled CLI command for initial Administrator bootstrap provisioning."""

import argparse
import asyncio
import logging
import sys
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password, normalize_email, validate_password_policy
from app.models.domain_mapping import DomainRoleMapping
from app.models.enums import AuditEventType, OrganizationStatus, RoleCode, UserStatus
from app.models.organization import Department, Institution, University
from app.models.role import UserRoleAssignment
from app.models.user import User
from app.services.audit_service import audit_service
from app.services.role_service import role_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("qpms.bootstrap")


# ------------------------------------------------------------------------------
# University Admin Bootstrap (Section D)
# ------------------------------------------------------------------------------
async def run_university_admin_bootstrap(
    username: str = "admin",
    password: str = "admin123",
    university_code: str = "APEX-UNIV",
    env: str | None = None,
    session: AsyncSession | None = None,
) -> bool:
    """Provision the initial University Admin under strict security constraints.

    Requirements enforced:
    - Creates account only if it does not already exist.
    - Stores only an Argon2id securely hashed password.
    - Assigns UNIVERSITY_ADMIN role (NOT SUPER_ADMIN).
    - Requires password change on first login (password_changed_at=None).
    - Repeatable without creating duplicate accounts.
    - Rejects default credentials in production environments.
    """
    effective_env = env or settings.app_env
    logger.info("Executing University Admin bootstrap under runtime environment: %s", effective_env)

    # 1. Enforce Production Security Constraints
    if effective_env == "production":
        if password == "admin123" or "admin" in password.lower():
            logger.error(
                "CRITICAL SECURITY VIOLATION: Default credentials ('admin123') are strictly "
                "prohibited in production environments."
            )
            raise ValueError(
                "Default development credentials are rejected in production. "
                "Provide a secure passphrase meeting NIST SP 800-63B standards."
            )
        policy_err = validate_password_policy(password)
        if policy_err:
            logger.error("Password policy violation: %s", policy_err)
            raise ValueError(policy_err)

    if session is not None:
        return await _provision_university_admin_in_session(
            session, username, password, university_code, effective_env
        )

    db_url = str(settings.database_url)
    engine = create_async_engine(db_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as db, db.begin():
        result = await _provision_university_admin_in_session(
            db, username, password, university_code, effective_env
        )

    await engine.dispose()
    return result


async def _provision_university_admin_in_session(
    db: AsyncSession,
    username: str,
    password: str,
    university_code: str,
    effective_env: str,
) -> bool:
    # 1. Seed Role Catalog first
    await role_service.seed_role_catalog(db)

    # 2. Ensure target institutional anchor university exists
    univ_stmt = select(University).where(University.code == university_code)
    univ = (await db.execute(univ_stmt)).scalar_one_or_none()
    if not univ:
        univ = University(
            code=university_code,
            name="Apex University",
            type="State University",
            status=OrganizationStatus.ACTIVE,
            region="Main Campus",
            address="University Central Block",
        )
        db.add(univ)
        await db.flush()
        logger.info("Seeded institutional anchor university: %s (%s)", university_code, univ.name)

    # 3. Check for existing University Admin role
    admin_role = await role_service.get_role_by_code(db, RoleCode.UNIVERSITY_ADMIN)
    assert admin_role is not None

    # Resolve normalized username / email
    normalized = normalize_email(username)
    # If username is just 'admin', associate with institutional admin identity
    email_identity = "admin@apex.edu" if normalized == "admin" else normalized

    # 4. Check if University Admin assignment already exists for this university
    existing_assign_stmt = (
        select(UserRoleAssignment)
        .join(User, UserRoleAssignment.user_id == User.id)
        .where(
            UserRoleAssignment.role_id == admin_role.id,
            UserRoleAssignment.university_id == univ.id,
            UserRoleAssignment.is_active == True,  # noqa: E712
            (User.email == normalized) | (User.email == email_identity),
        )
    )
    existing_assignment = (await db.execute(existing_assign_stmt)).scalar_one_or_none()
    if existing_assignment:
        logger.warning(
            "University Administrator '%s' is already provisioned for university '%s'. "
            "Refusing to overwrite or reset existing account.",
            email_identity,
            university_code,
        )
        return False

    # 5. Retrieve or create User identity
    user_stmt = select(User).where((User.email == normalized) | (User.email == email_identity))
    user = (await db.execute(user_stmt)).scalar_one_or_none()

    now = datetime.now(UTC)
    if not user:
        user = User(
            email=email_identity,
            full_name="University Administrator",
            password_hash=hash_password(password),
            status=UserStatus.ACTIVE,
            email_verified_at=now,
            # Require password change on first login (None indicates never changed)
            password_changed_at=now if effective_env == "production" else None,
        )
        db.add(user)
        await db.flush()
        logger.info("Created user identity for University Admin: %s", email_identity)
    else:
        user.status = UserStatus.ACTIVE
        user.email_verified_at = now
        # Do not overwrite password if account already existed

    # 6. Assign scoped UNIVERSITY_ADMIN role (NOT SUPER_ADMIN)
    assignment = UserRoleAssignment(
        user_id=user.id,
        role_id=admin_role.id,
        university_id=univ.id,
        institution_id=None,
        department_id=None,
        is_active=True,
    )
    db.add(assignment)
    await db.flush()

    # 7. Record Immutable Audit Event
    await audit_service.record_event(
        db,
        event_type=AuditEventType.UNIVERSITY_ADMIN_PROVISIONED,
        user_id=user.id,
        details=(
            f"Initial University Admin provisioned: {email_identity} "
            f"for university {university_code} (env={effective_env})"
        ),
    )
    logger.info(
        "University Admin bootstrap completed successfully: %s (Univ: %s, RequiresPasswordChange: %s)",
        email_identity,
        university_code,
        user.password_changed_at is None,
    )
    return True


# ------------------------------------------------------------------------------
# Super Admin Bootstrap (Platform-Level)
# ------------------------------------------------------------------------------
async def run_bootstrap(
    email: str = "admin@apex.edu",
    password: str = "admin123",
    env: str | None = None,
    session: AsyncSession | None = None,
) -> bool:
    """Execute the Super Admin bootstrap process under strict environment and security constraints."""
    effective_env = env or settings.app_env
    logger.info("Executing Super Admin bootstrap under runtime environment: %s", effective_env)

    # 1. Enforce Production Security Constraints
    if effective_env == "production":
        if password == "admin123" or "admin" in password.lower():
            logger.error(
                "CRITICAL SECURITY VIOLATION: Default credentials ('admin123') are strictly "
                "prohibited in production environments."
            )
            raise ValueError(
                "Default development credentials are rejected in production. "
                "Provide a secure passphrase meeting NIST SP 800-63B standards."
            )
        policy_err = validate_password_policy(password)
        if policy_err:
            logger.error("Password policy violation: %s", policy_err)
            raise ValueError(policy_err)

    if session is not None:
        return await _provision_super_admin_in_session(session, email, password, effective_env)

    db_url = str(settings.database_url)
    engine = create_async_engine(db_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as db, db.begin():
        result = await _provision_super_admin_in_session(db, email, password, effective_env)

    await engine.dispose()
    return result


async def _provision_super_admin_in_session(
    db: AsyncSession,
    email: str,
    password: str,
    effective_env: str,
) -> bool:
    # 2. Seed Role Catalog first
    await role_service.seed_role_catalog(db)

    # 3. Check for existing Super Admin
    super_role = await role_service.get_role_by_code(db, RoleCode.SUPER_ADMIN)
    assert super_role is not None

    check_admin_stmt = select(UserRoleAssignment).where(
        UserRoleAssignment.role_id == super_role.id,
        UserRoleAssignment.is_active == True,  # noqa: E712
    )
    existing_admin = (await db.execute(check_admin_stmt)).scalar_one_or_none()
    if existing_admin:
        logger.warning(
            "Super Administrator is already provisioned in the system. "
            "Refusing to overwrite or reset existing administrator."
        )
        return False

    # 4. Ensure Apex University federation anchor exists
    univ_stmt = select(University).where(University.code == "APEX-UNIV")
    univ = (await db.execute(univ_stmt)).scalar_one_or_none()
    if not univ:
        univ = University(
            code="APEX-UNIV",
            name="Apex University Federation",
            type="Central University",
            status=OrganizationStatus.ACTIVE,
            region="Headquarters",
            address="Central Institutional Campus",
        )
        db.add(univ)
        await db.flush()
        logger.info("Seeded anchor university: APEX-UNIV (%s)", univ.name)

    # 5. Provision or associate Super Admin identity
    normalized_email = normalize_email(email)
    user_stmt = select(User).where(User.email == normalized_email)
    user = (await db.execute(user_stmt)).scalar_one_or_none()

    now = datetime.now(UTC)
    if not user:
        user = User(
            email=normalized_email,
            full_name="System Super Administrator",
            password_hash=hash_password(password),
            status=UserStatus.ACTIVE,
            email_verified_at=now,
            password_changed_at=now if effective_env == "production" else None,
        )
        db.add(user)
        await db.flush()
        logger.info("Created user identity for Super Admin: %s", normalized_email)
    else:
        user.status = UserStatus.ACTIVE
        user.email_verified_at = now

    # 6. Assign SUPER_ADMIN role (Platform-wide)
    assignment = UserRoleAssignment(
        user_id=user.id,
        role_id=super_role.id,
        university_id=None,
        institution_id=None,
        department_id=None,
        is_active=True,
    )
    db.add(assignment)
    await db.flush()

    # 7. Record Immutable Audit Event
    await audit_service.record_event(
        db,
        event_type=AuditEventType.BOOTSTRAP_SUPER_ADMIN,
        user_id=user.id,
        details=f"Initial Super Admin provisioned: {normalized_email} (env={effective_env})",
    )
    logger.info("Super Admin bootstrap completed successfully: %s", normalized_email)
    return True


# ------------------------------------------------------------------------------
# Domain-Based Access & Scoped Department Seeding
# ------------------------------------------------------------------------------
async def seed_domain_access_system(session: AsyncSession) -> None:
    """Seed sample organizational hierarchy, domain mappings, and verified accounts."""
    # 1. Role Catalog
    await role_service.seed_role_catalog(session)

    # 2. Apex University
    univ_stmt = select(University).where(University.code == "APEX-UNIV")
    univ = (await session.execute(univ_stmt)).scalar_one_or_none()
    if not univ:
        univ = University(
            code="APEX-UNIV",
            name="Apex University Federation",
            type="Central University",
            status=OrganizationStatus.ACTIVE,
            region="Headquarters",
            address="Central Institutional Campus",
        )
        session.add(univ)
        await session.flush()

    # 3. Apex Institute of Technology
    inst_stmt = select(Institution).where(Institution.code == "APEX-CAMPUS")
    inst = (await session.execute(inst_stmt)).scalar_one_or_none()
    if not inst:
        inst = Institution(
            university_id=univ.id,
            code="APEX-CAMPUS",
            name="Apex Institute of Technology",
            type="College",
            status=OrganizationStatus.ACTIVE,
            address="Technology Campus Block A",
            contact_email="director@apex.edu",
        )
        session.add(inst)
        await session.flush()

    # 4. BCA and MCA Departments
    dept_bca_stmt = select(Department).where(
        Department.institution_id == inst.id, Department.code == "BCA"
    )
    dept_bca = (await session.execute(dept_bca_stmt)).scalar_one_or_none()
    if not dept_bca:
        dept_bca = Department(
            institution_id=inst.id,
            code="BCA",
            name="Department of Computer Applications (BCA)",
            status=OrganizationStatus.ACTIVE,
        )
        session.add(dept_bca)
        await session.flush()

    dept_mca_stmt = select(Department).where(
        Department.institution_id == inst.id, Department.code == "MCA"
    )
    dept_mca = (await session.execute(dept_mca_stmt)).scalar_one_or_none()
    if not dept_mca:
        dept_mca = Department(
            institution_id=inst.id,
            code="MCA",
            name="Department of Master of Computer Applications (MCA)",
            status=OrganizationStatus.ACTIVE,
        )
        session.add(dept_mca)
        await session.flush()

    role_super_admin = await role_service.get_role_by_code(session, RoleCode.SUPER_ADMIN)
    role_univ_admin = await role_service.get_role_by_code(session, RoleCode.UNIVERSITY_ADMIN)
    role_dept_admin = await role_service.get_role_by_code(session, RoleCode.DEPARTMENT_ADMIN)
    role_faculty = await role_service.get_role_by_code(session, RoleCode.FACULTY_QUESTION_SETTER)
    role_exam_controller = await role_service.get_role_by_code(session, RoleCode.EXAM_CONTROLLER)
    role_student = await role_service.get_role_by_code(session, RoleCode.STUDENT)
    assert role_univ_admin and role_dept_admin and role_student

    # 5. Domain Mappings:
    mappings_data = [
        {
            "pattern": "*@superadmin.com",
            "role_id": role_super_admin.id if role_super_admin else None,
            "university_id": None,
            "institution_id": None,
            "department_id": None,
            "identity_type": "SUPER_ADMIN",
            "priority": 10,
            "desc": "Super Administrator wildcard pattern",
        },
        {
            "pattern": "*@universityadmin.com",
            "role_id": role_univ_admin.id,
            "university_id": univ.id,
            "institution_id": None,
            "department_id": None,
            "identity_type": "UNIVERSITY_ADMIN",
            "priority": 20,
            "desc": "University Admin wildcard pattern",
        },
        {
            "pattern": "universityadmin.in",
            "role_id": role_univ_admin.id,
            "university_id": univ.id,
            "institution_id": None,
            "department_id": None,
            "identity_type": "UNIVERSITY_ADMIN",
            "priority": 20,
            "desc": "University Admin domain mapping",
        },
        {
            "pattern": "cs.hod@hod.com",
            "role_id": role_dept_admin.id,
            "university_id": univ.id,
            "institution_id": inst.id,
            "department_id": dept_bca.id,
            "identity_type": "HOD",
            "priority": 5,
            "desc": "CS HOD exact email and department scope mapping",
        },
        {
            "pattern": "*@hod.com",
            "role_id": role_dept_admin.id,
            "university_id": univ.id,
            "institution_id": inst.id,
            "department_id": None,
            "identity_type": "HOD",
            "priority": 30,
            "desc": "Department Admin / HOD wildcard pattern",
        },
        {
            "pattern": "bca.hod.in",
            "role_id": role_dept_admin.id,
            "university_id": univ.id,
            "institution_id": inst.id,
            "department_id": dept_bca.id,
            "identity_type": "HOD",
            "priority": 30,
            "desc": "BCA HOD domain mapping",
        },
        {
            "pattern": "mca.hod.in",
            "role_id": role_dept_admin.id,
            "university_id": univ.id,
            "institution_id": inst.id,
            "department_id": dept_mca.id,
            "identity_type": "HOD",
            "priority": 30,
            "desc": "MCA HOD domain mapping",
        },
        {
            "pattern": "*@faculty.com",
            "role_id": role_faculty.id if role_faculty else None,
            "university_id": univ.id,
            "institution_id": inst.id,
            "department_id": dept_bca.id,
            "identity_type": "FACULTY_QUESTION_SETTER",
            "priority": 40,
            "desc": "Faculty Question Setter wildcard pattern",
        },
        {
            "pattern": "*@examcontroller.com",
            "role_id": role_exam_controller.id if role_exam_controller else None,
            "university_id": univ.id,
            "institution_id": inst.id,
            "department_id": None,
            "identity_type": "EXAM_CONTROLLER",
            "priority": 40,
            "desc": "Exam Controller wildcard pattern",
        },
    ]

    for m in mappings_data:
        if not m["role_id"]:
            continue
        map_stmt = select(DomainRoleMapping).where(
            DomainRoleMapping.domain_pattern == m["pattern"]
        )
        existing_map = (await session.execute(map_stmt)).scalar_one_or_none()
        if not existing_map:
            dm = DomainRoleMapping(
                domain_pattern=m["pattern"],
                role_id=m["role_id"],
                university_id=m["university_id"],
                institution_id=m["institution_id"],
                department_id=m["department_id"],
                identity_type=m.get("identity_type"),
                priority=m.get("priority", 100),
                is_active=True,
                description=m["desc"],
            )
            session.add(dm)
            logger.info("Configured domain mapping: %s -> role_id %s", m["pattern"], m["role_id"])

    await session.flush()

    # 6. Seed Authoritative User Accounts
    users_data = [
        {
            "email": "apex@superadmin.com",
            "name": "Apex Super Admin",
            "password": "ApexDev#2026!",
            "role_id": role_super_admin.id if role_super_admin else None,
            "univ_id": None,
            "inst_id": None,
            "dept_id": None,
        },
        {
            "email": "admin@universityadmin.com",
            "name": "University Administrator",
            "password": "ApexDev#2026!",
            "role_id": role_univ_admin.id,
            "univ_id": univ.id,
            "inst_id": None,
            "dept_id": None,
        },
        {
            "email": "cs.hod@hod.com",
            "name": "Computer Science HOD",
            "password": "ApexDev#2026!",
            "role_id": role_dept_admin.id,
            "univ_id": univ.id,
            "inst_id": inst.id,
            "dept_id": dept_bca.id,
        },
        {
            "email": "faculty@faculty.com",
            "name": "Assessment Faculty Member",
            "password": "ApexDev#2026!",
            "role_id": role_faculty.id if role_faculty else None,
            "univ_id": univ.id,
            "inst_id": inst.id,
            "dept_id": dept_bca.id,
        },
        {
            "email": "student@gmail.com",
            "name": "Student User (Gmail)",
            "password": "ApexDev#2026!",
            "role_id": role_student.id,
            "univ_id": univ.id,
            "inst_id": None,
            "dept_id": None,
        },
        {
            "email": "student@yahoo.com",
            "name": "Student User (Yahoo)",
            "password": "ApexDev#2026!",
            "role_id": role_student.id,
            "univ_id": univ.id,
            "inst_id": None,
            "dept_id": None,
        },
        {
            "email": "ali@universityadmin.in",
            "name": "Ali University Admin",
            "password": "UnivAdmin#Pass2026!",
            "role_id": role_univ_admin.id,
            "univ_id": univ.id,
            "inst_id": None,
            "dept_id": None,
        },
        {
            "email": "ali@bca.hod.in",
            "name": "Ali BCA HOD",
            "password": "BcaHod#Pass2026!",
            "role_id": role_dept_admin.id,
            "univ_id": univ.id,
            "inst_id": inst.id,
            "dept_id": dept_bca.id,
        },
        {
            "email": "ali@mca.hod.in",
            "name": "Ali MCA HOD",
            "password": "McaHod#Pass2026!",
            "role_id": role_dept_admin.id,
            "univ_id": univ.id,
            "inst_id": inst.id,
            "dept_id": dept_mca.id,
        },
        {
            "email": "student@general.in",
            "name": "Student Prep User",
            "password": "Student#Pass2026!",
            "role_id": role_student.id,
            "univ_id": univ.id,
            "inst_id": None,
            "dept_id": None,
        },
    ]

    now = datetime.now(UTC)
    for u in users_data:
        if not u["role_id"]:
            continue
        normalized = normalize_email(u["email"])
        u_stmt = select(User).where(User.email == normalized)
        usr = (await session.execute(u_stmt)).scalar_one_or_none()
        if not usr:
            usr = User(
                email=normalized,
                full_name=u["name"],
                password_hash=hash_password(u["password"]),
                status=UserStatus.ACTIVE,
                email_verified_at=now,
                password_changed_at=now,
            )
            session.add(usr)
            await session.flush()

            assign = UserRoleAssignment(
                user_id=usr.id,
                role_id=u["role_id"],
                university_id=u["univ_id"],
                institution_id=u["inst_id"],
                department_id=u["dept_id"],
                is_active=True,
            )
            session.add(assign)
            logger.info("Seeded user account: %s with scoped role", normalized)

    await session.flush()
    logger.info("Domain-based access system seed completed.")


async def run_domain_bootstrap() -> bool:
    """Run full domain access bootstrap provisioning."""
    db_url = str(settings.database_url)
    engine = create_async_engine(db_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as db, db.begin():
        await seed_domain_access_system(db)

    await engine.dispose()
    return True


def main() -> None:
    """CLI entrypoint for manual bootstrap invocation."""
    parser = argparse.ArgumentParser(
        description="Provision initial University or Super Administrator, or seed domain mappings."
    )
    parser.add_argument(
        "--role",
        choices=["university_admin", "super_admin", "domain_setup"],
        default="university_admin",
        help="Target action/role to provision (default: university_admin)",
    )
    parser.add_argument(
        "--username",
        "--email",
        dest="username",
        default="admin",
        help="Administrator username or email (default: admin)",
    )
    parser.add_argument(
        "--password",
        default="admin123",
        help="Temporary bootstrap password (default: admin123)",
    )
    parser.add_argument(
        "--university",
        default="APEX-UNIV",
        help="Target university code for University Admin (default: APEX-UNIV)",
    )
    parser.add_argument(
        "--env",
        default=None,
        help="Target environment override ('development', 'test', 'production')",
    )

    args = parser.parse_args()
    try:
        if args.role == "domain_setup":
            success = asyncio.run(run_domain_bootstrap())
        elif args.role == "university_admin":
            success = asyncio.run(
                run_university_admin_bootstrap(
                    username=args.username,
                    password=args.password,
                    university_code=args.university,
                    env=args.env,
                )
            )
        else:
            success = asyncio.run(
                run_bootstrap(
                    email=args.username if "@" in args.username else f"{args.username}@apex.edu",
                    password=args.password,
                    env=args.env,
                )
            )

        if not success:
            sys.exit(0)
    except Exception as e:
        logger.error("Bootstrap failed: %s", e)
        sys.exit(1)


if __name__ == "__main__":
    main()

