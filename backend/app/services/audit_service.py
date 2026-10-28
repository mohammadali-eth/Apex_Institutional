import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.models import AuditLog

def log_audit(
    db: Session,
    action: str,
    entity_type: str,
    user_id: Optional[str] = None,
    entity_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    metadata: Optional[Any] = None
) -> AuditLog:
    meta_str = None
    if metadata is not None:
        try:
            meta_str = json.dumps(metadata)
        except Exception:
            meta_str = str(metadata)

    log_entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        ip_address=ip_address,
        metadata_json=meta_str
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
