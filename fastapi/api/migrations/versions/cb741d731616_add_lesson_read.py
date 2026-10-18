"""add lesson read

Revision ID: cb741d731616
Revises: d7b8b3ab0203
Create Date: 2026-10-17 05:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cb741d731616'
down_revision: Union[str, Sequence[str], None] = 'd7b8b3ab0203'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('topic_mastery', sa.Column('lesson_read', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('topic_mastery', 'lesson_read')
