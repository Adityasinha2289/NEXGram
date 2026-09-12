"""opportunity score components

Splits the opportunity score into its weighted parts and records the confidence
label alongside it, so the API can return the arithmetic behind a score rather
than a bare number.

Revision ID: 9c4177ae21b3
Revises: 738c068c7ca4
Create Date: 2026-09-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c4177ae21b3'
down_revision: Union[str, None] = '738c068c7ca4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('opportunities', sa.Column('fit_score', sa.Float(), nullable=True))
    op.add_column('opportunities', sa.Column('confidence', sa.String(), nullable=True))
    # The upsert in OpportunityEngine stamps this on every recompute.
    op.add_column('opportunities', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('opportunities', 'updated_at')
    op.drop_column('opportunities', 'confidence')
    op.drop_column('opportunities', 'fit_score')
