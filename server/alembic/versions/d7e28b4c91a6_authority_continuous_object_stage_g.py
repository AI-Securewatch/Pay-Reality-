"""authority continuous object, stage G authority mandate revival

Revision ID: d7e28b4c91a6
Revises: c4a91d7e5f38
Create Date: 2026-08-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7e28b4c91a6'
down_revision: Union[str, Sequence[str], None] = 'c4a91d7e5f38'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Stage G revives the legacy `authorities` table (Phase 1's original
    Authority Model) as the canonical source Authority Builder
    promotions now write to. `document_id` was NOT NULL because the
    table was designed around the single-document pipeline
    (`documents`); Authority Builder corpora live in a completely
    separate table (`authority_corpus_documents`) and have no row in
    `documents` at all. Rather than inventing a duplicate `documents`
    row per corpus (or a new table this report's own "reuse existing
    models" instruction argues against), `document_id` is loosened to
    nullable and a new, equally-nullable `corpus_id` is added, with a
    check constraint requiring at least one source to be recorded --
    the same "exactly one owner" shape PolicyExtractionCandidate already
    established for upload_id/corpus_id, relaxed to "at least one"
    since a future Authority could plausibly cite both.

    Every existing `authorities` row (there are none in production
    today -- this table has had zero HTTP-reachable write path until
    this stage) already satisfies document_id being not-null, so
    loosening the constraint changes nothing for any existing row.
    """
    op.alter_column('authorities', 'document_id', existing_type=sa.UUID(), nullable=True)
    op.add_column('authorities', sa.Column('corpus_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'authorities_corpus_id_fkey', 'authorities', 'authority_corpora', ['corpus_id'], ['id'],
    )
    op.create_index('idx_authorities_corpus', 'authorities', ['corpus_id'])
    op.create_check_constraint(
        'ck_authorities_has_a_source', 'authorities',
        '(document_id IS NOT NULL) OR (corpus_id IS NOT NULL)',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('ck_authorities_has_a_source', 'authorities', type_='check')
    op.drop_index('idx_authorities_corpus', table_name='authorities')
    op.drop_constraint('authorities_corpus_id_fkey', 'authorities', type_='foreignkey')
    op.drop_column('authorities', 'corpus_id')
    op.alter_column('authorities', 'document_id', existing_type=sa.UUID(), nullable=False)
