"""
One-time migration:
  - adds `semester` and `camera_id` columns to the sessions table
  - assigns a random semester (1-8) to every student

Run from the backend directory:
    python -m app.db.migrate
"""
import random
from sqlalchemy import text
from app.db.database import engine, SessionLocal
from app.db.models import Student


def main():
    # ── DDL: add columns if they don't exist yet ──────────────────────────────
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS semester INTEGER"
        ))
        conn.execute(text(
            "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS camera_id INTEGER"
            " REFERENCES cameras(id) ON DELETE SET NULL"
        ))
        conn.commit()
    print("DDL applied.")

    # ── Assign random semesters to students ───────────────────────────────────
    db = SessionLocal()
    try:
        students = db.query(Student).order_by(Student.id).all()
        rng = random.Random(42)
        for s in students:
            s.semester = rng.randint(1, 8)
            print(f"  {s.roll_no:15s} {s.name:25s} sem={s.semester}")
        db.commit()
        print(f"\n{len(students)} student(s) updated.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
