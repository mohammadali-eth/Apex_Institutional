"""create organization and role tables

Revision ID: 20261016_0002
Revises: 20261012_0001
Create Date: 2026-10-16 23:55:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261016_0002"
down_revision: str | None = "20261012_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. users: add full_name
    op.add_column("users", sa.Column("full_name", sa.String(length=255), nullable=True))

    # 2. universities
    op.create_table(
        "universities",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=64), server_default="State University", nullable=False),
        sa.Column("status", sa.String(length=32), server_default="active", nullable=False),
        sa.Column("region", sa.String(length=128), nullable=True),
        sa.Column("address", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_universities_code", "universities", ["code"], unique=True)
    op.create_index("ix_universities_status", "universities", ["status"])

    # 3. institutions
    op.create_table(
        "institutions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "university_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("universities.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=64), server_default="College", nullable=False),
        sa.Column("status", sa.String(length=32), server_default="active", nullable=False),
        sa.Column("address", sa.String(length=512), nullable=True),
        sa.Column("contact_email", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_institutions_university_id", "institutions", ["university_id"])
    op.create_index("ix_institutions_code", "institutions", ["code"], unique=True)
    op.create_index("ix_institutions_status", "institutions", ["status"])

    # 4. departments
    op.create_table(
        "departments",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "institution_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("institutions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_departments_institution_id", "departments", ["institution_id"])
    op.create_index("ix_departments_code", "departments", ["code"])
    op.create_index("ix_departments_status", "departments", ["status"])
    op.create_index("ix_departments_inst_code", "departments", ["institution_id", "code"], unique=True)

    # 5. roles
    op.create_table(
        "roles",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.String(length=512), nullable=True),
        sa.Column("is_system", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_roles_code", "roles", ["code"], unique=True)
    op.create_index("ix_roles_is_active", "roles", ["is_active"])

    # 6. user_role_assignments
    op.create_table(
        "user_role_assignments",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "role_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("roles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "university_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("universities.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "institution_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("institutions.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "department_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("departments.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column(
            "assigned_by_user_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_user_role_assignments_user_id", "user_role_assignments", ["user_id"])
    op.create_index("ix_user_role_assignments_role_id", "user_role_assignments", ["role_id"])
    op.create_index("ix_user_role_assignments_university_id", "user_role_assignments", ["university_id"])
    op.create_index("ix_user_role_assignments_institution_id", "user_role_assignments", ["institution_id"])
    op.create_index("ix_user_role_assignments_department_id", "user_role_assignments", ["department_id"])
    op.create_index("ix_user_role_assignments_is_active", "user_role_assignments", ["is_active"])
    op.create_index(
        "ix_active_role_scope",
        "user_role_assignments",
        ["user_id", "role_id", "university_id", "institution_id", "department_id", "is_active"],
    )

    # 7. staff_invitations
    op.create_table(
        "staff_invitations",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column(
            "role_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("roles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "university_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("universities.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "institution_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("institutions.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "department_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("departments.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "invited_by_user_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=32), server_default="INVITED", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_staff_invitations_email", "staff_invitations", ["email"])
    op.create_index("ix_staff_invitations_role_id", "staff_invitations", ["role_id"])
    op.create_index("ix_staff_invitations_university_id", "staff_invitations", ["university_id"])
    op.create_index("ix_staff_invitations_institution_id", "staff_invitations", ["institution_id"])
    op.create_index("ix_staff_invitations_department_id", "staff_invitations", ["department_id"])
    op.create_index("ix_staff_invitations_token_hash", "staff_invitations", ["token_hash"], unique=True)
    op.create_index("ix_staff_invitations_invited_by_user_id", "staff_invitations", ["invited_by_user_id"])
    op.create_index("ix_staff_invitations_status", "staff_invitations", ["status"])


def downgrade() -> None:
    op.drop_table("staff_invitations")
    op.drop_table("user_role_assignments")
    op.drop_table("roles")
    op.drop_table("departments")
    op.drop_table("institutions")
    op.drop_table("universities")
    op.drop_column("users", "full_name")
