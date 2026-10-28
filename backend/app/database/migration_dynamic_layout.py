from sqlalchemy import text
from sqlalchemy.engine import Engine
from app.database.session import Base

def run_dynamic_layout_migrations(engine: Engine):
    """
    Idempotent migration to add Dynamic Question Paper Layout and OR / Alternative Question
    columns and tables without dropping or modifying existing data.
    """
    # 1. Ensure any missing tables are created
    Base.metadata.create_all(bind=engine)

    # 2. Add columns to question_paper_sections
    alter_sections = [
        "ALTER TABLE question_paper_sections ADD COLUMN IF NOT EXISTS section_type VARCHAR(50) DEFAULT 'STANDARD';",
        "ALTER TABLE question_paper_sections ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 0;",
        "ALTER TABLE question_paper_sections ADD COLUMN IF NOT EXISTS displayed_marks INTEGER DEFAULT 0;",
        "ALTER TABLE question_paper_sections ADD COLUMN IF NOT EXISTS required_attempts INTEGER;",
        "ALTER TABLE question_paper_sections ADD COLUMN IF NOT EXISTS selection_rule VARCHAR(50) DEFAULT 'ALL';",
    ]

    # 3. Add columns to question_paper_questions
    alter_questions = [
        "ALTER TABLE question_paper_questions ADD COLUMN IF NOT EXISTS group_id VARCHAR(36);",
        "ALTER TABLE question_paper_questions ADD COLUMN IF NOT EXISTS group_type VARCHAR(50) DEFAULT 'SINGLE';",
        "ALTER TABLE question_paper_questions ADD COLUMN IF NOT EXISTS selection_rule VARCHAR(50) DEFAULT 'SINGLE';",
        "ALTER TABLE question_paper_questions ADD COLUMN IF NOT EXISTS required_attempts INTEGER DEFAULT 1;",
        "ALTER TABLE question_paper_questions ADD COLUMN IF NOT EXISTS alternative_label VARCHAR(10);",
        "ALTER TABLE question_paper_questions ADD COLUMN IF NOT EXISTS group_marks INTEGER;",
        # Backfill existing or_group_id into group_id if group_id is null
        """
        UPDATE question_paper_questions
        SET group_id = or_group_id,
            group_type = 'OR_PAIR',
            selection_rule = 'OR_PAIR'
        WHERE or_group_id IS NOT NULL AND group_id IS NULL;
        """,
    ]

    # 4. Add columns to question_paper_templates
    alter_templates = [
        "ALTER TABLE question_paper_templates ADD COLUMN IF NOT EXISTS description TEXT;",
        "ALTER TABLE question_paper_templates ADD COLUMN IF NOT EXISTS sections_config JSONB;",
        "ALTER TABLE question_paper_templates ADD COLUMN IF NOT EXISTS created_by VARCHAR(36);",
        "ALTER TABLE question_paper_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE question_paper_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();",
    ]

    with engine.connect() as conn:
        for sql in alter_sections + alter_questions + alter_templates:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception as e:
                print(f"[Dynamic Layout Migration Note] {sql.strip()[:60]}...: {e}")
