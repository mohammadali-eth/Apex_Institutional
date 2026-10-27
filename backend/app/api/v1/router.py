"""API Router version 1 root boundary."""

from fastapi import APIRouter

from app.api.v1.auth import auth_router
from app.api.v1.departments import department_router
from app.api.v1.super_admin import super_admin_router
from app.api.v1.university_admin import university_admin_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(super_admin_router)
api_v1_router.include_router(university_admin_router)
api_v1_router.include_router(department_router)

