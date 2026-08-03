import sys
import os

# Ensure the server directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from models.organization import Organization, OrgPlan
from models.user import User, UserRole
from utils.password import hash_password
import uuid

def setup_multitenancy_test():
    db = SessionLocal()
    try:
        # 1. Create ORG_ALPHA
        org_alpha = db.query(Organization).filter(Organization.name == "College Alpha").first()
        if not org_alpha:
            org_alpha = Organization(
                id=str(uuid.uuid4()),
                name="College Alpha",
                domain="alpha.edu",
                plan=OrgPlan.ENTERPRISE
            )
            db.add(org_alpha)
            print("[OK] Created Organization: College Alpha")
        
        # 2. Create ORG_BETA
        org_beta = db.query(Organization).filter(Organization.name == "University Beta").first()
        if not org_beta:
            org_beta = Organization(
                id=str(uuid.uuid4()),
                name="University Beta",
                domain="beta.edu",
                plan=OrgPlan.PRO
            )
            db.add(org_beta)
            print("[OK] Created Organization: University Beta")

        db.commit()

        # 3. Create User A (Faculty in Alpha)
        user_a = db.query(User).filter(User.email == "faculty@alpha.edu").first()
        if not user_a:
            user_a = User(
                email="faculty@alpha.edu",
                password_hash=hash_password("test123"),
                name="Dr. Alpha",
                role=UserRole.FACULTY,
                org_id=org_alpha.id
            )
            db.add(user_a)
            print("[OK] Created User A: faculty@alpha.edu (College Alpha)")

        # 4. Create User B (Faculty in Beta)
        user_b = db.query(User).filter(User.email == "faculty@beta.edu").first()
        if not user_b:
            user_b = User(
                email="faculty@beta.edu",
                password_hash=hash_password("test123"),
                name="Prof. Beta",
                role=UserRole.FACULTY,
                org_id=org_beta.id
            )
            db.add(user_b)
            print("[OK] Created User B: faculty@beta.edu (University Beta)")

        db.commit()
        print("\n[SUCCESS] Multitenancy test environment is ready.")
        print("-" * 40)
        print("LOGIN 1: faculty@alpha.edu / test123")
        print("LOGIN 2: faculty@beta.edu / test123")
        print("-" * 40)

    except Exception as e:
        print(f"[ERROR] Setup failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    setup_multitenancy_test()
