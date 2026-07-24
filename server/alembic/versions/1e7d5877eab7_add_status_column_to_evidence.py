"""add status column to evidence

Revision ID: 1e7d5877eab7
Revises: 489c66c83eb4
Create Date: 2026-07-04 19:59:36.336912

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1e7d5877eab7'
down_revision: Union[str, Sequence[str], None] = '489c66c83eb4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('evidence', sa.Column('status', sa.Text(), server_default='PENDING', nullable=False))
    op.create_check_constraint(
        'ck_evidence_status', 'evidence', "status IN ('VERIFIED','PENDING','REJECTED')"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('ck_evidence_status', 'evidence', type_='check')
    op.drop_column('evidence', 'status')
