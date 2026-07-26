"""add agent lifecycle management

Revision ID: 6c3d8f1a4e29
Revises: 5b8f2d4a9c1e
Create Date: 2026-07-26 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '6c3d8f1a4e29'
down_revision: Union[str, Sequence[str], None] = '5b8f2d4a9c1e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Agent: widen status to add 'registered' and 'retired', add ownership
    # and metadata columns. All new columns are nullable (or default to an
    # empty JSON array), so every existing agent row (all currently
    # 'active') needs no backfill and keeps working unchanged.
    op.drop_constraint('ck_agents_status', 'agents', type_='check')
    op.create_check_constraint(
        'ck_agents_status',
        'agents',
        "status IN ('registered','active','suspended','revoked','retired')",
    )
    op.add_column('agents', sa.Column('business_unit', sa.Text(), nullable=True))
    op.add_column('agents', sa.Column('environment', sa.Text(), nullable=True))
    op.add_column('agents', sa.Column('tags', postgresql.JSONB(), server_default='[]', nullable=False))
    op.add_column('agents', sa.Column('purpose', sa.Text(), nullable=True))
    op.add_column('agents', sa.Column('model', sa.Text(), nullable=True))
    op.add_column('agents', sa.Column('version', sa.Text(), nullable=True))
    op.add_column('agents', sa.Column('runtime', sa.Text(), nullable=True))
    op.add_column('agents', sa.Column('platform', sa.Text(), nullable=True))
    op.add_column('agents', sa.Column('labels', postgresql.JSONB(), server_default='[]', nullable=False))
    op.add_column('agents', sa.Column('sdk_version', sa.Text(), nullable=True))
    op.add_column('agents', sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('agents', sa.Column('rotation_requested_at', sa.DateTime(timezone=True), nullable=True))

    # Certificate: widen status to add 'issued' and 'expired', add
    # activated_at/rotated_at/expires_at, and enforce "only one active
    # certificate per agent" at the database level (previously only a
    # code-comment convention).
    op.drop_constraint('ck_certificates_status', 'certificates', type_='check')
    op.create_check_constraint(
        'ck_certificates_status',
        'certificates',
        "status IN ('issued','active','rotated','expired','revoked')",
    )
    op.add_column('certificates', sa.Column('activated_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('certificates', sa.Column('rotated_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('certificates', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(
        'idx_certificates_single_active', 'certificates', ['agent_id'],
        unique=True, postgresql_where=sa.text("status = 'active'"),
    )

    op.create_table(
        'agent_audit_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_type', sa.Text(), nullable=False),
        sa.Column('actor', sa.Text(), nullable=True),
        sa.Column('payload', postgresql.JSONB(), nullable=False),
        sa.Column('key_id', sa.Text(), nullable=False),
        sa.Column('signature', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_agent_audit_events_agent', 'agent_audit_events', ['agent_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_agent_audit_events_agent', table_name='agent_audit_events')
    op.drop_table('agent_audit_events')

    op.drop_index('idx_certificates_single_active', table_name='certificates')
    op.drop_column('certificates', 'expires_at')
    op.drop_column('certificates', 'rotated_at')
    op.drop_column('certificates', 'activated_at')
    op.drop_constraint('ck_certificates_status', 'certificates', type_='check')
    op.create_check_constraint(
        'ck_certificates_status', 'certificates', "status IN ('active','rotated','revoked')"
    )

    op.drop_column('agents', 'rotation_requested_at')
    op.drop_column('agents', 'last_seen_at')
    op.drop_column('agents', 'sdk_version')
    op.drop_column('agents', 'labels')
    op.drop_column('agents', 'platform')
    op.drop_column('agents', 'runtime')
    op.drop_column('agents', 'version')
    op.drop_column('agents', 'model')
    op.drop_column('agents', 'purpose')
    op.drop_column('agents', 'tags')
    op.drop_column('agents', 'environment')
    op.drop_column('agents', 'business_unit')
    op.drop_constraint('ck_agents_status', 'agents', type_='check')
    op.create_check_constraint(
        'ck_agents_status', 'agents', "status IN ('active','suspended','revoked')"
    )
