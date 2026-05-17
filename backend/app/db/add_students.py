"""
Add new students to the database.
Run from the backend directory:
    python -m app.db.add_students
"""
from app.db.database import SessionLocal, engine
from app.db.models import Base, Student

NEW_STUDENTS = [
    ("Aditya Narayan", "1JB23CS008"),
    ("Rishikesh Raj",  "1JB23CS123"),
    ("Sourabh Kumar",  "1JB23CS153"),
]


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        added = 0
        for name, roll_no in NEW_STUDENTS:
            existing = db.query(Student).filter(Student.roll_no == roll_no).first()
            if existing:
                print(f"Already exists: {roll_no} ({existing.name})")
                continue
            s = Student(name=name, roll_no=roll_no, dept="CSE", semester=4)
            db.add(s)
            print(f"Added: {roll_no} — {name}")
            added += 1
        db.commit()
        print(f"\n{added} student(s) added.")
    except Exception as exc:
        db.rollback()
        print(f"Error: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
