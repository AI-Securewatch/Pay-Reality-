"""add ai policy builder tables

Revision ID: 3e7a1c9f8b2d
Revises: 9a4e6c1f2b7d
Create Date: 2026-07-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '3e7a1c9f8b2d'
down_revision: Union[str, Sequence[str], None] = '9a4e6c1f2b7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'policy_extraction_uploads',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('filename', sa.Text(), nullable=False),
        sa.Column('format', sa.Text(), nullable=False),
        sa.Column('content', sa.LargeBinary(), nullable=False),
        sa.Column('status', sa.Text(), nullable=False),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("format IN ('pdf','docx','xlsx','csv','text')", name='ck_policy_extraction_uploads_format'),
        sa.CheckConstraint("status IN ('uploaded','extracted','failed')", name='ck_policy_extraction_uploads_status'),
    )
    op.create_table(
        'policy_extraction_candidates',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('upload_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content', postgresql.JSONB(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('missing_fields', postgresql.JSONB(), server_default='[]', nullable=False),
        sa.Column('source_excerpt', sa.Text(), nullable=True),
        sa.Column('source_location', sa.Text(), nullable=True),
        sa.Column('status', sa.Text(), nullable=False),
        sa.Column('promoted_policy_key', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['upload_id'], ['policy_extraction_uploads.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "status IN ('pending_review','promoted','dismissed')",
            name='ck_policy_extraction_candidates_status',
        ),
    )
    op.create_index(
        'idx_policy_extraction_candidates_upload', 'policy_extraction_candidates', ['upload_id']
    )
    op.create_index(
        'idx_policy_extraction_candidates_status', 'policy_extraction_candidates', ['status']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_policy_extraction_candidates_status', table_name='policy_extraction_candidates')
    op.drop_index('idx_policy_extraction_candidates_upload', table_name='policy_extraction_candidates')
    op.drop_table('policy_extraction_candidates')
    op.drop_table('policy_extraction_uploads')
