"""phase 1 authority model schema

Revision ID: b58b031aeb21
Revises: 805e62a44ac1
Create Date: 2026-07-30 01:48:06.244153

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b58b031aeb21'
down_revision: Union[str, Sequence[str], None] = '805e62a44ac1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    PHASE_1_AUTHORITY_MODEL.md: every table/column here is new or
    additive-nullable. Zero existing row changes shape; every existing
    match against Principal.name (RuntimePolicy.scope.principal, Agent
    lookup) is unaffected until these are actually populated.
    """
    op.create_table(
        'business_units',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='business_units_organization_id_fkey'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'departments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('business_unit_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['business_unit_id'], ['business_units.id'], name='departments_business_unit_id_fkey'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'teams',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('department_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], name='teams_department_id_fkey'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'resources',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('type', sa.Text(), nullable=True),
        sa.Column('owner_principal_id', sa.UUID(), nullable=True),
        sa.Column('organization_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='resources_organization_id_fkey'),
        sa.ForeignKeyConstraint(['owner_principal_id'], ['principals.id'], name='resources_owner_principal_id_fkey'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.add_column('authority_relationships', sa.Column('from_principal_id', sa.UUID(), nullable=True))
    op.add_column('authority_relationships', sa.Column('to_principal_id', sa.UUID(), nullable=True))
    op.add_column('authority_relationships', sa.Column('resource_id', sa.UUID(), nullable=True))
    op.add_column('authority_relationships', sa.Column('operation', sa.Text(), nullable=True))
    op.add_column('authority_relationships', sa.Column('valid_from', sa.DateTime(timezone=True), nullable=True))
    op.add_column('authority_relationships', sa.Column('valid_to', sa.DateTime(timezone=True), nullable=True))
    op.add_column('authority_relationships', sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('authority_relationships', sa.Column('revoked_by', sa.Text(), nullable=True))
    op.add_column('authority_relationships', sa.Column('status', sa.Text(), server_default='proposed', nullable=False))
    op.add_column('authority_relationships', sa.Column('cross_org_approved', sa.Boolean(), server_default='false', nullable=False))
    op.create_foreign_key(
        'authority_relationships_resource_id_fkey', 'authority_relationships', 'resources', ['resource_id'], ['id']
    )
    op.create_foreign_key(
        'authority_relationships_from_principal_id_fkey', 'authority_relationships', 'principals', ['from_principal_id'], ['id']
    )
    op.create_foreign_key(
        'authority_relationships_to_principal_id_fkey', 'authority_relationships', 'principals', ['to_principal_id'], ['id']
    )
    op.create_check_constraint(
        'ck_authority_relationships_status', 'authority_relationships',
        "status IN ('proposed','active','revoked','expired')",
    )

    op.add_column('principals', sa.Column('organization_id', sa.UUID(), nullable=True))
    op.add_column('principals', sa.Column('business_unit_id', sa.UUID(), nullable=True))
    op.add_column('principals', sa.Column('department_id', sa.UUID(), nullable=True))
    op.add_column('principals', sa.Column('team_id', sa.UUID(), nullable=True))
    op.add_column('principals', sa.Column('role', sa.Text(), nullable=True))
    op.create_foreign_key(
        'principals_organization_id_fkey', 'principals', 'organizations', ['organization_id'], ['id']
    )
    op.create_foreign_key(
        'principals_business_unit_id_fkey', 'principals', 'business_units', ['business_unit_id'], ['id']
    )
    op.create_foreign_key(
        'principals_department_id_fkey', 'principals', 'departments', ['department_id'], ['id']
    )
    op.create_foreign_key(
        'principals_team_id_fkey', 'principals', 'teams', ['team_id'], ['id']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('principals_team_id_fkey', 'principals', type_='foreignkey')
    op.drop_constraint('principals_department_id_fkey', 'principals', type_='foreignkey')
    op.drop_constraint('principals_business_unit_id_fkey', 'principals', type_='foreignkey')
    op.drop_constraint('principals_organization_id_fkey', 'principals', type_='foreignkey')
    op.drop_column('principals', 'role')
    op.drop_column('principals', 'team_id')
    op.drop_column('principals', 'department_id')
    op.drop_column('principals', 'business_unit_id')
    op.drop_column('principals', 'organization_id')

    op.drop_constraint('ck_authority_relationships_status', 'authority_relationships', type_='check')
    op.drop_constraint('authority_relationships_to_principal_id_fkey', 'authority_relationships', type_='foreignkey')
    op.drop_constraint('authority_relationships_from_principal_id_fkey', 'authority_relationships', type_='foreignkey')
    op.drop_constraint('authority_relationships_resource_id_fkey', 'authority_relationships', type_='foreignkey')
    op.drop_column('authority_relationships', 'cross_org_approved')
    op.drop_column('authority_relationships', 'status')
    op.drop_column('authority_relationships', 'revoked_by')
    op.drop_column('authority_relationships', 'revoked_at')
    op.drop_column('authority_relationships', 'valid_to')
    op.drop_column('authority_relationships', 'valid_from')
    op.drop_column('authority_relationships', 'operation')
    op.drop_column('authority_relationships', 'resource_id')
    op.drop_column('authority_relationships', 'to_principal_id')
    op.drop_column('authority_relationships', 'from_principal_id')

    op.drop_table('resources')
    op.drop_table('teams')
    op.drop_table('departments')
    op.drop_table('business_units')
