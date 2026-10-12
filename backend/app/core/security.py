"""Security foundation interfaces and configuration boundaries.

NOTE: This module establishes the architectural boundaries and contracts for future
security, password hashing, and token handling. Business authentication and RBAC logic
will be implemented in a subsequent phase.
"""

from typing import Final

# Future token algorithms and token types
TOKEN_ALGORITHM: Final[str] = "HS256"
TOKEN_TYPE_BEARER: Final[str] = "bearer"
TOKEN_PURPOSE_ACCESS: Final[str] = "access"
TOKEN_PURPOSE_REFRESH: Final[str] = "refresh"
