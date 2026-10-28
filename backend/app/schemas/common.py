from typing import Generic, TypeVar, Optional, Any, List
from pydantic import BaseModel

T = TypeVar("T")

class StandardResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation successful"
    data: Optional[T] = None
    code: Optional[str] = None

class PaginationMeta(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int

class PaginatedData(BaseModel, Generic[T]):
    items: List[T]
    meta: PaginationMeta

class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Data fetched successfully"
    data: PaginatedData[T]
