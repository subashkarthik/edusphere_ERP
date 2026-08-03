from sqlalchemy import Column, String, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base
import uuid

class OrgPlan(enum.Enum):
    FREE = "FREE"
    PRO = "PRO"
    ENTERPRISE = "ENTERPRISE"

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    domain = Column(String(100), unique=True, nullable=True)
    plan = Column(Enum(OrgPlan), default=OrgPlan.FREE)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    users = relationship("User", back_populates="organization")
    courses = relationship("Course", back_populates="organization")
