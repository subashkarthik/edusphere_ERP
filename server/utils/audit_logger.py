from sqlalchemy.orm import Session
from models.audit import AuditLog
from fastapi import Request
import json

async def log_audit(
    db: Session,
    user_id: str,
    org_id: str,
    action: str,
    resource_type: str,
    resource_id: str = None,
    metadata: dict = None,
    request: Request = None
):
    """Utility to record an enterprise audit event."""
    ip_address = request.client.host if request else None
    user_agent = request.headers.get("user-agent") if request else None
    
    audit_entry = AuditLog(
        user_id=user_id,
        org_id=org_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata_json=metadata,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    db.add(audit_entry)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[AUDIT ERROR] Failed to log action {action}: {e}")
