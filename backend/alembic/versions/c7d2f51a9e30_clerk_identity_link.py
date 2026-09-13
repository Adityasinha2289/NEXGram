"""Link a user to a Clerk identity.

One nullable column. Clerk is an additional way to prove who you are, not a
replacement for the mobile+password accounts that already exist, so every
current row stays valid with this left empty.

Revision ID: c7d2f51a9e30
Revises: adfbe48d1dcd
Create Date: 2026-09-13

"""
from alembic import op
import sqlalchemy as sa

revision = "c7d2f51a9e30"
down_revision = "adfbe48d1dcd"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("clerk_user_id", sa.String(), nullable=True))
    # Unique so one Clerk identity cannot be attached to two shops, and indexed
    # because it is the lookup on every sign-in. SQLite cannot add a constraint
    # to an existing table, so the uniqueness rides on the index itself — which
    # is what Postgres does underneath anyway.
    op.create_index(
        "ix_users_clerk_user_id", "users", ["clerk_user_id"], unique=True
    )


def downgrade() -> None:
    op.drop_index("ix_users_clerk_user_id", table_name="users")
    op.drop_column("users", "clerk_user_id")
