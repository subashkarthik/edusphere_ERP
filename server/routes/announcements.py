from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.user import User, UserRole
from models.misc import Announcement
from schemas.schemas import AnnouncementCreate, AnnouncementResponse
from middleware.auth import get_current_user, require_roles
from utils.websocket_manager import manager

router = APIRouter(prefix="/api/announcements", tags=["Announcements"])


@router.get("/", response_model=List[AnnouncementResponse])
def list_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List announcements targeted at the current user's role."""
    announcements = db.query(Announcement).filter(
        Announcement.org_id == current_user.org_id,
        Announcement.target_roles.contains(current_user.role.value)
    ).order_by(Announcement.is_pinned.desc(), Announcement.published_at.desc()).limit(50).all()

    return [
        AnnouncementResponse(
            id=a.id, title=a.title, content=a.content,
            author_name=a.author.name if a.author else "System",
            target_roles=a.target_roles, priority=a.priority.value,
            is_pinned=a.is_pinned, published_at=a.published_at,
        )
        for a in announcements
    ]


@router.post("/", response_model=AnnouncementResponse)
async def create_announcement(
    request: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY])),
):
    """Create an announcement. Admin/Faculty only."""
    announcement = Announcement(
        org_id=current_user.org_id,
        title=request.title,
        content=request.content,
        author_id=current_user.id,
        target_roles=request.target_roles,
        is_pinned=request.is_pinned,
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    response_data = AnnouncementResponse(
        id=announcement.id, title=announcement.title, content=announcement.content,
        author_name=current_user.name, target_roles=announcement.target_roles,
        priority=announcement.priority.value, is_pinned=announcement.is_pinned,
        published_at=announcement.published_at,
    )

    # Broadcast new announcement via WebSockets
    await manager.broadcast_to_institution({
        "type": "NEW_ANNOUNCEMENT",
        "announcement": {
            "id": response_data.id,
            "title": response_data.title,
            "content": response_data.content,
            "author_name": response_data.author_name,
            "target_roles": response_data.target_roles,
            "priority": response_data.priority,
            "is_pinned": response_data.is_pinned,
            "published_at": response_data.published_at.isoformat()
        }
    }, current_user.org_id)

    return response_data

