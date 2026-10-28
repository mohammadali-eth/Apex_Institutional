from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database.session import get_db
from app.models.models import AuditLog, User
from app.schemas.dashboard import AuditLogResponse
from app.schemas.common import StandardResponse
from app.api.deps import require_permission

router = APIRouter(prefix="/audit", tags=["Audit Log"])

@router.get("", response_model=StandardResponse[List[AuditLogResponse]])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("audit.read"))
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)

    logs = query.order_by(desc(AuditLog.created_at)).limit(limit).all()
    results = [
        AuditLogResponse(
            id=l.id,
            user_id=l.user_id,
            user_email=l.user.email if l.user else None,
            user_name=l.user.full_name if l.user else "System",
            action=l.action,
            entity_type=l.entity_type,
            entity_id=l.entity_id,
            ip_address=l.ip_address,
            metadata_json=l.metadata_json,
            created_at=l.created_at
        ) for l in logs
    ]
    return StandardResponse(data=results)
