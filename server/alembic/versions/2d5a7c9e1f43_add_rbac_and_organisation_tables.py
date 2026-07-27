"""add rbac and organisation tables

Revision ID: 2d5a7c9e1f43
Revises: 8f4d2e6a1c3b
Create Date: 2026-07-27 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '2d5a7c9e1f43'
down_revision: Union[str, Sequence[str], None] = '8f4d2e6a1c3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ROLE_VALUES = "'owner','governance_admin','agent_admin','reviewer','auditor','executive'"


def upgrade() -> None:
    """Upgrade schema."""
    # Schema only, same pattern as 8f4d2e6a1c3b: the first Organisation and
    # its Owner User are seeded by the app's own startup hook (mirroring
    # signing_key_service.ensure_current_key_registered), not by this
    # migration, since the Owner's identity is derived from the existing
    # operator key at boot time, not from anything this migration can see.
    op.create_table(
        'organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('logo_url', sa.Text(), nullable=True),
        sa.Column('timezone', sa.Text(), nullable=False, server_default='UTC'),
        sa.Column('default_currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('default_language', sa.Text(), nullable=False, server_default='en'),
        sa.Column('settings', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.Text(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('password_hash', sa.Text(), nullable=False),
        sa.Column('role', sa.Text(), nullable=False),
        sa.Column('status', sa.Text(), nullable=False, server_default='active'),
        sa.Column('mfa_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('must_reset_password', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(f"role IN ({ROLE_VALUES})", name='ck_users_role'),
        sa.CheckConstraint("status IN ('active','disabled')", name='ck_users_status'),
        sa.UniqueConstraint('organization_id', 'email', name='uq_users_organization_email'),
    )
    op.create_index('idx_users_organization', 'users', ['organization_id'])

    op.create_table(
        'sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_sessions_user', 'sessions', ['user_id'])

    op.create_table(
        'api_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('key_hash', sa.Text(), nullable=False),
        sa.Column('key_prefix', sa.Text(), nullable=False),
        sa.Column('role', sa.Text(), nullable=False),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(f"role IN ({ROLE_VALUES})", name='ck_api_keys_role'),
        sa.UniqueConstraint('key_hash', name='uq_api_keys_key_hash'),
    )
    op.create_index('idx_api_keys_organization', 'api_keys', ['organization_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_api_keys_organization', table_name='api_keys')
    op.drop_table('api_keys')
    op.drop_index('idx_sessions_user', table_name='sessions')
    op.drop_table('sessions')
    op.drop_index('idx_users_organization', table_name='users')
    op.drop_table('users')
    op.drop_table('organizations')
