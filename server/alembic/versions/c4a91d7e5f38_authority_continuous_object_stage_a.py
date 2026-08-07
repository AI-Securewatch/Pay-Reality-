"""authority continuous object, stage A schema additions

Revision ID: c4a91d7e5f38
Revises: 411edb414123
Create Date: 2026-08-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4a91d7e5f38'
down_revision: Union[str, Sequence[str], None] = '411edb414123'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Stage A of the Authority-as-a-continuous-object plan (CHIEF PRODUCT
    ARCHITECT REPORT, "Authority as a Continuous Object"): schema only,
    every column nullable and additive, no behavior change, no existing
    row changes shape. This migration exists so later stages have
    somewhere real to write; nothing reads or writes these columns yet.

    - authority_corpora.organization_id: the Authority Builder's
      discovery layer currently has no organisational owner at all.
    - authority_principals.resolved_principal_id: the eventual link from
      a discovered person to the real, canonical Principal row, once
      Stage E's resolver is built. Nullable forever for any corpus a
      reviewer chooses not to resolve.
    - decisions.evaluated_mandate_ids: a correctly-named replacement for
      the existing evaluated_mandates column, which despite its name has
      never referenced the real `mandates` table (bundle_builder.py's own
      comment admits the name is reused, not accurate -- it actually
      holds matched RuntimePolicy ids). The old column is left in place,
      untouched, and kept as the source of truth until Stage H populates
      this one with real Mandate ids alongside it.
    - decisions.enterprise_system_id / enterprise_systems table: no
      representation of a protected downstream system exists anywhere in
      this schema today. Added honestly empty; Stage J is what starts
      populating it.
    - decision_resolutions.resolved_by_user_id: today's resolved_by is
      free text even though a real, authenticated session already exists
      by the time this code path runs (Phase 10 RBAC). This column gives
      Stage D somewhere real to record that session's user id, without
      touching the existing free-text column any existing reader depends on.
    """
    op.add_column(
        'authority_corpora',
        sa.Column('organization_id', sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        'authority_corpora_organization_id_fkey',
        'authority_corpora', 'organizations', ['organization_id'], ['id'],
    )
    op.create_index(
        'idx_authority_corpora_organization', 'authority_corpora', ['organization_id'],
    )

    op.add_column(
        'authority_principals',
        sa.Column('resolved_principal_id', sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        'authority_principals_resolved_principal_id_fkey',
        'authority_principals', 'principals', ['resolved_principal_id'], ['id'],
    )

    op.add_column(
        'decisions',
        sa.Column('evaluated_mandate_ids', sa.JSON(), server_default='[]', nullable=False),
    )

    op.create_table(
        'enterprise_systems',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('type', sa.Text(), nullable=False),
        sa.Column('status', sa.Text(), server_default='configuration_required', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='enterprise_systems_organization_id_fkey'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "type IN ('erp','crm','finance','hr','procurement','legal','manufacturing','other')",
            name='ck_enterprise_systems_type',
        ),
        sa.CheckConstraint(
            "status IN ('configuration_required','connected')",
            name='ck_enterprise_systems_status',
        ),
    )
    op.create_index('idx_enterprise_systems_organization', 'enterprise_systems', ['organization_id'])

    op.add_column(
        'decisions',
        sa.Column('enterprise_system_id', sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        'decisions_enterprise_system_id_fkey',
        'decisions', 'enterprise_systems', ['enterprise_system_id'], ['id'],
    )

    op.add_column(
        'decision_resolutions',
        sa.Column('resolved_by_user_id', sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        'decision_resolutions_resolved_by_user_id_fkey',
        'decision_resolutions', 'users', ['resolved_by_user_id'], ['id'],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('decision_resolutions_resolved_by_user_id_fkey', 'decision_resolutions', type_='foreignkey')
    op.drop_column('decision_resolutions', 'resolved_by_user_id')

    op.drop_constraint('decisions_enterprise_system_id_fkey', 'decisions', type_='foreignkey')
    op.drop_column('decisions', 'enterprise_system_id')

    op.drop_index('idx_enterprise_systems_organization', table_name='enterprise_systems')
    op.drop_table('enterprise_systems')

    op.drop_column('decisions', 'evaluated_mandate_ids')

    op.drop_constraint('authority_principals_resolved_principal_id_fkey', 'authority_principals', type_='foreignkey')
    op.drop_column('authority_principals', 'resolved_principal_id')

    op.drop_index('idx_authority_corpora_organization', table_name='authority_corpora')
    op.drop_constraint('authority_corpora_organization_id_fkey', 'authority_corpora', type_='foreignkey')
    op.drop_column('authority_corpora', 'organization_id')
