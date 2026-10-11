"""add quiz mastery

Revision ID: c5a2f58327df
Revises: e437a3b973d4
Create Date: 2026-10-11 02:57:26.779719

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5a2f58327df'
down_revision: Union[str, Sequence[str], None] = 'e437a3b973d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('topic_mastery', sa.Column('quiz_mastery', sa.Float(), server_default='0', nullable=False))

    # Mastery was only the quiz score until now, so existing progress carries over as the quiz half.
    op.execute('UPDATE topic_mastery SET quiz_mastery = mastery')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('topic_mastery', 'quiz_mastery')
