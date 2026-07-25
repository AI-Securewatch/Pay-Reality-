"""store document content in the database instead of local disk

Revision ID: 7c2f9a1b3e4d
Revises: 1e7d5877eab7
Create Date: 2026-07-25 16:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c2f9a1b3e4d'
down_revision: Union[str, Sequence[str], None] = '1e7d5877eab7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    storage_uri pointed at a path on the container's local disk, which
    doesn't survive a redeploy or restart, and turned out to be unwritable
    by the app's non-root user in production regardless. No document was
    ever successfully stored under the old scheme (every attempt failed
    at write time), so this is a straight column swap, not a backfill.
    """
    op.add_column('documents', sa.Column('content', sa.LargeBinary(), nullable=False))
    op.drop_column('documents', 'storage_uri')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('documents', sa.Column('storage_uri', sa.Text(), nullable=False))
    op.drop_column('documents', 'content')
