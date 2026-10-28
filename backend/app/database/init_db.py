import sys
import os

# Add parent directory to sys.path so app can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.database.session import engine, SessionLocal, Base
import app.models.models
from app.database.seed_data import seed_database

def init_db():
    print("[*] Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    print("[OK] Tables created.")
    
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
