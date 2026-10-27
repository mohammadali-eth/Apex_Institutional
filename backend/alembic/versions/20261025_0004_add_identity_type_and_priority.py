"""add identity_type and priority to domain_role_mappings

Revision ID: 20261025_0004
Revises: 20261019_0003
Create Date: 2026-10-25 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261025_0004"
down_revision: str | None = "20261019_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "domain_role_mappings",
        sa.Column("identity_type", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "domain_role_mappings",
        sa.Column("priority", sa.Integer(), server_default="100", nullable=False),
    )
    op.create_index(
        "ix_domain_role_mappings_identity_type",
        "domain_role_mappings",
        ["identity_type"],
    )
    op.create_index(
        "ix_domain_role_mappings_priority",
        "domain_role_mappings",
        ["priority"],
    )


def downgrade() -> None:
    op.drop_index("ix_domain_role_mappings_priority", table_name="domain_role_mappings")
    op.drop_index("ix_domain_role_mappings_identity_type", table_name="domain_role_mappings")
    op.drop_column("domain_role_mappings", "priority")
    op.drop_column("domain_role_mappings", "identity_type")
