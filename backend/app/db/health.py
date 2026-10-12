"""Infrastructure database health verification."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def check_database_health(session: AsyncSession) -> bool:
    """Execute minimal connectivity test without revealing sensitive metadata."""
    try:
        result = await session.execute(text("SELECT 1"))
        return result.scalar() == 1
    except Exception:
        return False
