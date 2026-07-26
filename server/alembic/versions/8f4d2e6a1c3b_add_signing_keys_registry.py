"""add signing keys registry

Revision ID: 8f4d2e6a1c3b
Revises: 6c3d8f1a4e29
Create Date: 2026-07-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f4d2e6a1c3b'
down_revision: Union[str, Sequence[str], None] = '6c3d8f1a4e29'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Schema only: the first row (today's currently-configured signing
    # key) is seeded automatically by the app's own startup hook
    # (signing_key_service.ensure_current_key_registered, called from
    # main.py's lifespan), not by this migration. A migration would have
    # to import the running app's secret config to know what to insert,
    # and that secret differs per environment; letting the app seed
    # itself on first boot after this migration is simpler and correct
    # in every environment (dev, staging, prod) without special-casing.
    op.create_table(
        'signing_keys',
        sa.Column('key_id', sa.Text(), nullable=False),
        sa.Column('public_key_b64', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('retired_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('key_id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('signing_keys')
