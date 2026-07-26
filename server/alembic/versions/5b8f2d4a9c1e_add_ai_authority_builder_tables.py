"""add ai authority builder tables

Revision ID: 5b8f2d4a9c1e
Revises: 3e7a1c9f8b2d
Create Date: 2026-07-26 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '5b8f2d4a9c1e'
down_revision: Union[str, Sequence[str], None] = '3e7a1c9f8b2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'authority_corpora',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('status', sa.Text(), nullable=False),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("status IN ('uploaded','extracted','failed')", name='ck_authority_corpora_status'),
    )

    op.create_table(
        'authority_corpus_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('corpus_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('filename', sa.Text(), nullable=False),
        sa.Column('format', sa.Text(), nullable=False),
        sa.Column('content', sa.LargeBinary(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['corpus_id'], ['authority_corpora.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("format IN ('pdf','docx','xlsx','csv','text')", name='ck_authority_corpus_documents_format'),
    )
    op.create_index('idx_authority_corpus_documents_corpus', 'authority_corpus_documents', ['corpus_id'])

    op.create_table(
        'authority_principals',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('corpus_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('role', sa.Text(), nullable=True),
        sa.Column('reports_to', sa.Text(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('source_excerpt', sa.Text(), nullable=True),
        sa.Column('source_location', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['corpus_id'], ['authority_corpora.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_authority_principals_corpus', 'authority_principals', ['corpus_id'])

    op.create_table(
        'authority_resources',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('corpus_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('source_excerpt', sa.Text(), nullable=True),
        sa.Column('source_location', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['corpus_id'], ['authority_corpora.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_authority_resources_corpus', 'authority_resources', ['corpus_id'])

    op.create_table(
        'authority_operations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('corpus_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('source_excerpt', sa.Text(), nullable=True),
        sa.Column('source_location', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['corpus_id'], ['authority_corpora.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_authority_operations_corpus', 'authority_operations', ['corpus_id'])

    op.create_table(
        'authority_relationships',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('corpus_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('kind', sa.Text(), nullable=False),
        sa.Column('from_principal', sa.Text(), nullable=False),
        sa.Column('to_principal', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('source_excerpt', sa.Text(), nullable=True),
        sa.Column('source_location', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['corpus_id'], ['authority_corpora.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "kind IN ('delegation','escalation','inheritance')", name='ck_authority_relationships_kind'
        ),
    )
    op.create_index('idx_authority_relationships_corpus', 'authority_relationships', ['corpus_id'])

    op.create_table(
        'authority_conflicts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('corpus_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('reasoning', sa.Text(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['corpus_id'], ['authority_corpora.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_authority_conflicts_corpus', 'authority_conflicts', ['corpus_id'])

    op.create_table(
        'authority_gaps',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('corpus_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('source_excerpt', sa.Text(), nullable=True),
        sa.Column('source_location', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['corpus_id'], ['authority_corpora.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_authority_gaps_corpus', 'authority_gaps', ['corpus_id'])

    op.create_table(
        'authority_questions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('corpus_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('context', sa.Text(), nullable=True),
        sa.Column('answered', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('answer', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['corpus_id'], ['authority_corpora.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_authority_questions_corpus', 'authority_questions', ['corpus_id'])

    # Additive changes to the existing policy_extraction_candidates table:
    # upload_id becomes nullable, corpus_id is added, and exactly one of
    # the two must be set. Every existing row already has upload_id set,
    # so this is a pure relaxation, not a breaking change.
    op.alter_column('policy_extraction_candidates', 'upload_id', nullable=True)
    op.add_column(
        'policy_extraction_candidates', sa.Column('corpus_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        'fk_policy_extraction_candidates_corpus', 'policy_extraction_candidates', 'authority_corpora',
        ['corpus_id'], ['id'],
    )
    op.create_index('idx_policy_extraction_candidates_corpus', 'policy_extraction_candidates', ['corpus_id'])
    op.create_check_constraint(
        'ck_policy_extraction_candidates_exactly_one_owner',
        'policy_extraction_candidates',
        '(upload_id IS NOT NULL) != (corpus_id IS NOT NULL)',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        'ck_policy_extraction_candidates_exactly_one_owner', 'policy_extraction_candidates', type_='check'
    )
    op.drop_index('idx_policy_extraction_candidates_corpus', table_name='policy_extraction_candidates')
    op.drop_constraint(
        'fk_policy_extraction_candidates_corpus', 'policy_extraction_candidates', type_='foreignkey'
    )
    op.drop_column('policy_extraction_candidates', 'corpus_id')
    op.alter_column('policy_extraction_candidates', 'upload_id', nullable=False)

    op.drop_index('idx_authority_questions_corpus', table_name='authority_questions')
    op.drop_table('authority_questions')
    op.drop_index('idx_authority_gaps_corpus', table_name='authority_gaps')
    op.drop_table('authority_gaps')
    op.drop_index('idx_authority_conflicts_corpus', table_name='authority_conflicts')
    op.drop_table('authority_conflicts')
    op.drop_index('idx_authority_relationships_corpus', table_name='authority_relationships')
    op.drop_table('authority_relationships')
    op.drop_index('idx_authority_operations_corpus', table_name='authority_operations')
    op.drop_table('authority_operations')
    op.drop_index('idx_authority_resources_corpus', table_name='authority_resources')
    op.drop_table('authority_resources')
    op.drop_index('idx_authority_principals_corpus', table_name='authority_principals')
    op.drop_table('authority_principals')
    op.drop_index('idx_authority_corpus_documents_corpus', table_name='authority_corpus_documents')
    op.drop_table('authority_corpus_documents')
    op.drop_table('authority_corpora')
