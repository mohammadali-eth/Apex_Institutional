from sqlalchemy import text
from sqlalchemy.engine import Engine
from app.database.session import Base

def run_ai_generator_migrations(engine: Engine):
    """
    Idempotent migration to add new AI Question Paper Generator columns and tables
    without dropping or modifying existing data.
    """
    # 1. Create any missing tables (paper_blueprints, paper_validation_reports, generation_jobs)
    Base.metadata.create_all(bind=engine)

    # 2. Add columns to questions if not present
    alter_questions = [
        "ALTER TABLE questions ADD COLUMN IF NOT EXISTS bloom_level VARCHAR(50) DEFAULT 'UNDERSTAND';",
        "ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'QUESTION_BANK';",
        "ALTER TABLE questions ADD COLUMN IF NOT EXISTS marking_rubric TEXT;",
    ]

    # 3. Add columns to question_paper_questions if not present
    alter_paper_questions = [
        "ALTER TABLE question_paper_questions ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'QUESTION_BANK';",
        "ALTER TABLE question_paper_questions ADD COLUMN IF NOT EXISTS bloom_level VARCHAR(50) DEFAULT 'UNDERSTAND';",
        "ALTER TABLE question_paper_questions ADD COLUMN IF NOT EXISTS marking_scheme TEXT;",
        "ALTER TABLE question_paper_questions ADD COLUMN IF NOT EXISTS expected_answer TEXT;",
    ]

    with engine.connect() as conn:
        for sql in alter_questions + alter_paper_questions:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception as e:
                # Log or ignore if already applied or running in dialect that doesn't support IF NOT EXISTS
                print(f"[Migration Warning] {sql}: {e}")
