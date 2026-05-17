"""
Run once to create tables and seed historical data:
    cd backend && python -m app.db.seed
"""
import random
from datetime import date, datetime, timedelta

from app.db.database import engine, SessionLocal
from app.db.models import Base, Student, Class, ClassSession, Attendance


STUDENTS_DATA = [
    ("Arjun Sharma",  "CS2101"),
    ("Priya Nair",    "CS2102"),
    ("Rohan Mehta",   "CS2103"),
    ("Sneha Iyer",    "CS2104"),
    ("Karan Patel",   "CS2105"),
    ("Divya Reddy",   "CS2106"),
    ("Aditya Kumar",  "CS2107"),
    ("Meera Pillai",  "CS2108"),
    ("Vikram Singh",  "CS2109"),
    ("Ananya Bose",   "CS2110"),
    ("Rahul Gupta",   "CS2111"),
    ("Kavya Menon",   "CS2112"),
]

CLASSES_DATA = [
    ("CS301", "Data Structures & Algorithms", "A", 32, "Prof. R. Verma"),
    ("CS302", "Operating Systems",            "A", 30, "Prof. A. Singh"),
    ("CS303", "Database Management Systems",  "B", 28, "Prof. M. Sharma"),
    ("CS304", "Computer Networks",            "A", 35, "Prof. S. Kumar"),
    ("CS305", "Software Engineering",         "C", 29, "Prof. P. Nair"),
    ("MA101", "Engineering Mathematics",      "B", 60, "Prof. D. Rao"),
]

# Per-student attendance probability (seeded so it's consistent)
def attendance_prob(student_idx: int) -> float:
    random.seed(student_idx * 17 + 3)
    return 0.55 + random.random() * 0.40  # 55% – 95%


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if db.query(Student).count() > 0:
            print("Database already seeded — skipping.")
            return

        # ── Students ──────────────────────────────────────────────
        students = []
        for name, roll in STUDENTS_DATA:
            s = Student(name=name, roll_no=roll, dept="CSE", semester=4)
            db.add(s)
            students.append(s)

        # ── Classes ───────────────────────────────────────────────
        classes = []
        for code, name, section, strength, faculty in CLASSES_DATA:
            c = Class(code=code, name=name, section=section,
                      strength=strength, faculty=faculty)
            db.add(c)
            classes.append(c)

        db.flush()  # get IDs

        # ── Historical sessions + attendance (last 30 weeks) ──────
        today = date.today()
        # Assign a fixed probability per student
        probs = [attendance_prob(i) for i in range(len(students))]
        rng = random.Random(42)

        for week_offset in range(1, 31):
            monday = today - timedelta(weeks=week_offset)
            # Adjust to the Monday of that week
            monday -= timedelta(days=monday.weekday())

            for day_offset in range(5):  # Mon–Fri
                day = monday + timedelta(days=day_offset)
                if day >= today:
                    continue

                # 2–4 random classes per day
                day_classes = rng.sample(classes, k=rng.randint(2, 4))

                for cls in day_classes:
                    hour = rng.randint(8, 16)
                    start_dt = datetime(day.year, day.month, day.day, hour, 0)
                    end_dt = datetime(day.year, day.month, day.day, hour + 1, 0)

                    sess = ClassSession(
                        class_id=cls.id,
                        date=day,
                        start_time=start_dt,
                        end_time=end_dt,
                        is_active=False,
                    )
                    db.add(sess)
                    db.flush()

                    for i, student in enumerate(students):
                        if rng.random() < probs[i]:
                            att = Attendance(
                                session_id=sess.id,
                                student_id=student.id,
                                marked_at=start_dt + timedelta(minutes=rng.randint(0, 10)),
                            )
                            db.add(att)

        db.commit()
        print("Database seeded successfully.")

    except Exception as exc:
        db.rollback()
        print(f"Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
