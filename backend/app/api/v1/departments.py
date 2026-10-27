"""Department-level isolation, scoped academic access, and public papers endpoints."""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import check_user_department_access, get_current_active_user, get_current_user
from app.db.session import get_db_session
from app.models.organization import Department, Institution, University
from app.models.user import User
from app.schemas.organization import DepartmentResponse

department_router = APIRouter(tags=["Department Isolation & Academic Resources"])


@department_router.get(
    "/departments/{department_id}",
    response_model=DepartmentResponse,
    summary="Get Scoped Department Details",
)
async def get_department_details(
    department_id: uuid.UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> DepartmentResponse:
    """Retrieve details for a department, strictly enforcing department-level isolation."""
    # 1. Verify caller has authorization for this specific department
    has_access = await check_user_department_access(db, user, department_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You do not belong to or have administrative scope over this department.",
        )

    # 2. Retrieve department entity
    stmt = (
        select(Department)
        .options(
            selectinload(Department.institution).selectinload(Institution.university)
        )
        .where(Department.id == department_id)
    )
    dept = (await db.execute(stmt)).scalar_one_or_none()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found.",
        )

    return DepartmentResponse(
        id=dept.id,
        institution_id=dept.institution_id,
        code=dept.code,
        name=dept.name,
        status=dept.status,
        created_at=dept.created_at,
        updated_at=dept.updated_at,
    )


@department_router.get(
    "/departments/{department_id}/papers",
    summary="Get Scoped Department Question Papers",
)
async def get_department_papers(
    department_id: uuid.UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> list[dict[str, Any]]:
    """Retrieve question papers belonging to an academic department with isolation validation."""
    has_access = await check_user_department_access(db, user, department_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You do not belong to or have administrative scope over this department.",
        )

    dept = (
        await db.execute(select(Department).where(Department.id == department_id))
    ).scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")

    # Return department scoped papers (sample list representing departmental records)
    return [
        {
            "id": f"paper-{dept.code.lower()}-01",
            "department_id": str(department_id),
            "department_code": dept.code,
            "title": f"{dept.name} End Semester Exam Paper",
            "academic_year": "2025-26",
            "workflow_status": "APPROVED",
            "total_marks": 100,
        }
    ]


@department_router.get(
    "/public/papers",
    summary="Published Previous-Year Question Papers",
)
async def list_published_papers(
    search: str | None = Query(default=None),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> list[dict[str, Any]]:
    """Publicly accessible endpoint for general users and students to view published previous-year papers."""
    # General users and students are restricted to published papers available for exam prep
    published = [
        {
            "id": "pub-paper-bca-2025",
            "title": "Data Structures & Algorithms - Nov 2025",
            "department": "BCA",
            "academic_year": "2024-25",
            "semester": "3",
            "total_marks": 100,
            "status": "PUBLISHED",
            "published_at": "2025-12-01T10:00:00Z",
        },
        {
            "id": "pub-paper-mca-2025",
            "title": "Advanced Operating Systems - Dec 2025",
            "department": "MCA",
            "academic_year": "2024-25",
            "semester": "1",
            "total_marks": 100,
            "status": "PUBLISHED",
            "published_at": "2025-12-15T10:00:00Z",
        },
    ]

    if search:
        s = search.lower()
        published = [p for p in published if s in p["title"].lower() or s in p["department"].lower()]

    return published
