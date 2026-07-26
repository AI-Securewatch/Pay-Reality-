"""add runtime_policy_records table

Revision ID: 9a4e6c1f2b7d
Revises: 7c2f9a1b3e4d
Create Date: 2026-07-26 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '9a4e6c1f2b7d'
down_revision: Union[str, Sequence[str], None] = '7c2f9a1b3e4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'runtime_policy_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('policy_key', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('status', sa.Text(), nullable=False),
        sa.Column('content', postgresql.JSONB(), nullable=False),
        sa.Column('bundle_id', sa.Text(), nullable=True),
        sa.Column('bundle_hash', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "status IN ('draft','pending_review','approved','rejected','compiled','active','retired')",
            name='ck_runtime_policy_records_status',
        ),
        sa.UniqueConstraint('policy_key', 'version', name='uq_runtime_policy_records_key_version'),
    )
    op.create_index(
        'idx_runtime_policy_records_policy_key', 'runtime_policy_records', ['policy_key']
    )
    op.create_index(
        'idx_runtime_policy_records_status', 'runtime_policy_records', ['status']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_runtime_policy_records_status', table_name='runtime_policy_records')
    op.drop_index('idx_runtime_policy_records_policy_key', table_name='runtime_policy_records')
    op.drop_table('runtime_policy_records')
