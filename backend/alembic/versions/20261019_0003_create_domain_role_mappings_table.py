"""create domain role mappings table

Revision ID: 20261019_0003
Revises: 20261016_0002
Create Date: 2026-10-19 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261019_0003"
down_revision: str | None = "20261016_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "domain_role_mappings",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("domain_pattern", sa.String(length=255), nullable=False),
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
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_domain_role_mappings_domain_pattern", "domain_role_mappings", ["domain_pattern"], unique=True)
    op.create_index("ix_domain_role_mappings_role_id", "domain_role_mappings", ["role_id"])
    op.create_index("ix_domain_role_mappings_university_id", "domain_role_mappings", ["university_id"])
    op.create_index("ix_domain_role_mappings_institution_id", "domain_role_mappings", ["institution_id"])
    op.create_index("ix_domain_role_mappings_department_id", "domain_role_mappings", ["department_id"])
    op.create_index("ix_domain_role_mappings_is_active", "domain_role_mappings", ["is_active"])
    op.create_index("ix_domain_pattern_active", "domain_role_mappings", ["domain_pattern", "is_active"])


def downgrade() -> None:
    op.drop_index("ix_domain_pattern_active", table_name="domain_role_mappings")
    op.drop_index("ix_domain_role_mappings_is_active", table_name="domain_role_mappings")
    op.drop_index("ix_domain_role_mappings_department_id", table_name="domain_role_mappings")
    op.drop_index("ix_domain_role_mappings_institution_id", table_name="domain_role_mappings")
    op.drop_index("ix_domain_role_mappings_university_id", table_name="domain_role_mappings")
    op.drop_index("ix_domain_role_mappings_role_id", table_name="domain_role_mappings")
    op.drop_index("ix_domain_role_mappings_domain_pattern", table_name="domain_role_mappings")
    op.drop_table("domain_role_mappings")
