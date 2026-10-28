from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import ContactInquiry, User
from app.schemas.contact import ContactInquiryCreate, ContactInquiryResponse
from app.schemas.common import StandardResponse
from app.api.deps import get_current_user, require_permission
from app.services.audit_service import log_audit

router = APIRouter(prefix="/contact", tags=["Public & Contact"])

@router.post("", response_model=StandardResponse[ContactInquiryResponse])
def submit_contact_inquiry(
    inquiry: ContactInquiryCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to submit university or general inquiries.
    Persists to database with validation and audit trail.
    """
    client_ip = request.client.host if request.client else None

    # Server-side validation
    if len(inquiry.full_name.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Full name must be at least 2 characters long"
        )
    if len(inquiry.subject.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Subject must be at least 3 characters long"
        )
    if len(inquiry.message.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message must be at least 10 characters long"
        )

    db_inquiry = ContactInquiry(
        full_name=inquiry.full_name.strip(),
        email=inquiry.email.lower().strip(),
        subject=inquiry.subject.strip(),
        message=inquiry.message.strip(),
        ip_address=client_ip,
        is_resolved=False
    )
    db.add(db_inquiry)
    db.commit()
    db.refresh(db_inquiry)

    log_audit(
        db,
        action="CONTACT_INQUIRY_RECEIVED",
        entity_type="ContactInquiry",
        entity_id=db_inquiry.id,
        ip_address=client_ip,
        metadata={"subject": db_inquiry.subject, "email": db_inquiry.email}
    )

    return StandardResponse(
        success=True,
        message="Thank you! Your inquiry has been logged and our examination support team will respond shortly.",
        data=ContactInquiryResponse(
            id=db_inquiry.id,
            full_name=db_inquiry.full_name,
            email=db_inquiry.email,
            subject=db_inquiry.subject,
            message=db_inquiry.message,
            created_at=db_inquiry.created_at,
            is_resolved=db_inquiry.is_resolved
        )
    )

@router.get("/inquiries", response_model=StandardResponse[List[ContactInquiryResponse]])
def get_contact_inquiries(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("audit.read"))
):
    """Administrative inquiry inspection"""
    inquiries = db.query(ContactInquiry).order_by(ContactInquiry.created_at.desc()).limit(100).all()
    results = [
        ContactInquiryResponse(
            id=i.id,
            full_name=i.full_name,
            email=i.email,
            subject=i.subject,
            message=i.message,
            created_at=i.created_at,
            is_resolved=i.is_resolved
        )
        for i in inquiries
    ]
    return StandardResponse(data=results)
