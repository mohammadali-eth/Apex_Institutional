from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class ContactInquiryCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    subject: str = Field(..., min_length=3, max_length=250)
    message: str = Field(..., min_length=10, max_length=3000)

class ContactInquiryResponse(BaseModel):
    id: str
    full_name: str
    email: str
    subject: str
    message: str
    created_at: datetime
    is_resolved: bool
