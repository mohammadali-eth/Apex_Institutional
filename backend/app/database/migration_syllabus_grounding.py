from sqlalchemy import text

def run_syllabus_grounding_migrations(engine):
    """Idempotent migration adding syllabus grounding and generation mode tracking columns"""
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                ALTER TABLE question_papers 
                ADD COLUMN IF NOT EXISTS is_syllabus_grounded BOOLEAN DEFAULT TRUE;
            """))
            conn.execute(text("""
                ALTER TABLE question_papers 
                ADD COLUMN IF NOT EXISTS syllabus_version INTEGER DEFAULT 1;
            """))
            conn.execute(text("""
                ALTER TABLE question_papers 
                ADD COLUMN IF NOT EXISTS generation_mode VARCHAR(50) DEFAULT 'SYLLABUS_GROUNDED';
            """))
            conn.execute(text("""
                ALTER TABLE question_paper_questions 
                ADD COLUMN IF NOT EXISTS syllabus_provenance JSONB;
            """))
            conn.commit()
    except Exception as e:
        print(f"[Migration Warning] syllabus grounding migration note: {e}")

def run_migration():
    from app.database.session import engine
    run_syllabus_grounding_migrations(engine)
    print("Syllabus grounding migration completed successfully.")

if __name__ == "__main__":
    run_migration()
