"""phase 5 evidence chaining organization scope

Revision ID: 411edb414123
Revises: b58b031aeb21
Create Date: 2026-07-30 02:22:56.303146

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '411edb414123'
down_revision: Union[str, Sequence[str], None] = 'b58b031aeb21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    PHASE_5_EVIDENCE.md: Evidence chaining's scope key. Additive/nullable
    -- every existing Evidence row is unaffected, and un-scoped (NULL)
    is itself a valid, consistent chain scope, not an error state.
    """
    op.add_column('evidence', sa.Column('organization_id', sa.UUID(), nullable=True))
    op.create_index('idx_evidence_organization_created', 'evidence', ['organization_id', 'created_at'], unique=False)
    op.create_foreign_key('evidence_organization_id_fkey', 'evidence', 'organizations', ['organization_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('evidence_organization_id_fkey', 'evidence', type_='foreignkey')
    op.drop_index('idx_evidence_organization_created', table_name='evidence')
    op.drop_column('evidence', 'organization_id')
