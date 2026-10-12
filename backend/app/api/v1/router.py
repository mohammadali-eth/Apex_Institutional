"""API Router version 1 root boundary.

Future domain modules (users, questions, question-papers, examinations, etc.)
will register their sub-routers here in future phases.
"""

from fastapi import APIRouter

api_v1_router = APIRouter()
