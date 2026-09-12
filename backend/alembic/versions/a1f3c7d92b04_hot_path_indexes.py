"""hot path indexes

Every dashboard request filters demand signals by location, opportunities by
status, and locations by district. None of those columns were indexed, so each
one was a full table scan that grows linearly with adoption.

Revision ID: a1f3c7d92b04
Revises: 9c4177ae21b3
Create Date: 2026-09-12

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a1f3c7d92b04'
down_revision: Union[str, None] = '9c4177ae21b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # DemandEngine and every dashboard aggregate by location.
    op.create_index('ix_demand_signals_location_id', 'demand_signals', ['location_id'])

    # The opportunities feed always filters status='active' for one distributor.
    op.create_index(
        'ix_opportunities_distributor_status',
        'opportunities',
        ['distributor_id', 'status'],
    )

    # "Everyone in my district" backs the distributor dashboard, the supplier
    # list, the market search and the pack builder.
    op.create_index('ix_locations_district', 'locations', ['district'])

    # Order history drives reorder cadence, always scoped to one retailer.
    op.create_index('ix_orders_retailer_status', 'orders', ['retailer_id', 'status'])


def downgrade() -> None:
    op.drop_index('ix_orders_retailer_status', table_name='orders')
    op.drop_index('ix_locations_district', table_name='locations')
    op.drop_index('ix_opportunities_distributor_status', table_name='opportunities')
    op.drop_index('ix_demand_signals_location_id', table_name='demand_signals')
