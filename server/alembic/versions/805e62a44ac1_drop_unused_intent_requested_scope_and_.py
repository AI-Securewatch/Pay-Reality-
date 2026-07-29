"""drop unused intent requested_scope and metadata columns

Revision ID: 805e62a44ac1
Revises: 2d5a7c9e1f43
Create Date: 2026-07-30 00:55:37.274232

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '805e62a44ac1'
down_revision: Union[str, Sequence[str], None] = '2d5a7c9e1f43'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Both columns confirmed dead against production data before this
    migration was written (PHASE_0.md): requested_scope has zero
    non-null rows; metadata has zero rows differing from its '{}'
    default, across every row in the intents table.
    """
    op.drop_column('intents', 'requested_scope')
    op.drop_column('intents', 'metadata')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('intents', sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False))
    op.add_column('intents', sa.Column('requested_scope', sa.Text(), nullable=True))
