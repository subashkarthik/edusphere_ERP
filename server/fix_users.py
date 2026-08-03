from database import SessionLocal
from models.user import User, UserRole
from models.organization import Organization, OrgPlan
from utils.password import hash_password
import uuid

def fix_user():
    db = SessionLocal()
    try:
        # Create Org if missing
        org = db.query(Organization).filter(Organization.name == 'College Alpha').first()
        if not org:
            org = Organization(id=str(uuid.uuid4()), name='College Alpha', domain='alpha.edu', plan=OrgPlan.ENTERPRISE)
            db.add(org)
            db.commit()
            db.refresh(org)
        
        # Force recreate user
        u = db.query(User).filter(User.email == 'faculty@alpha.edu').first()
        if u:
            db.delete(u)
            db.commit()
            
        u = User(
            email='faculty@alpha.edu', 
            password_hash=hash_password('test123'), 
            name='Dr. Alpha', 
            role=UserRole.FACULTY, 
            org_id=org.id
        )
        db.add(u)
        db.commit()
        print("[OK] User faculty@alpha.edu created successfully")
        
        # Also fix Beta
        org_b = db.query(Organization).filter(Organization.name == 'University Beta').first()
        if not org_b:
            org_b = Organization(id=str(uuid.uuid4()), name='University Beta', domain='beta.edu', plan=OrgPlan.PRO)
            db.add(org_b)
            db.commit()
            db.refresh(org_b)
            
        u_b = db.query(User).filter(User.email == 'faculty@beta.edu').first()
        if u_b:
            db.delete(u_b)
            db.commit()
            
        u_b = User(
            email='faculty@beta.edu', 
            password_hash=hash_password('test123'), 
            name='Prof. Beta', 
            role=UserRole.FACULTY, 
            org_id=org_b.id
        )
        db.add(u_b)
        db.commit()
        print("[OK] User faculty@beta.edu created successfully")

    finally:
        db.close()

if __name__ == "__main__":
    fix_user()
