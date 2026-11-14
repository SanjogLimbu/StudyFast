"""add interactive lessons

Revision ID: 39856b3cdab2
Revises: b8e2d41f6a90
Create Date: 2026-11-14 20:33:47.089423

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '39856b3cdab2'
down_revision: Union[str, Sequence[str], None] = 'b8e2d41f6a90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
