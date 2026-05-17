from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import and_, extract, func, or_
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Attendance, Class, ClassSession, Student
from app.services.face_recognizer import recognize_faces
from app.utils.image_utils import base64_to_image

router = APIRouter()


# ── Request schemas ────────────────────────────────────────────────────────────

class FrameRequest(BaseModel):
    image: str

class StartSessionRequest(BaseModel):
    class_id: int

class MarkAttendanceRequest(BaseModel):
    session_id: int
    student_name: str


# ── Face recognition ───────────────────────────────────────────────────────────

@router.post("/recognition/frame")
async def process_frame(request: FrameRequest, db: Session = Depends(get_db)):
    frame = base64_to_image(request.image)
    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image data")

    result = recognize_faces(frame)

    # Map folder/USN names → student full names for display
    for face in result.get("faces", []):
        if face["name"] != "Unknown":
            student = db.query(Student).filter(
                or_(Student.roll_no == face["name"], Student.name == face["name"])
            ).first()
            if student:
                face["name"] = student.name

    return result


# ── Students ───────────────────────────────────────────────────────────────────

@router.get("/students")
def get_students(db: Session = Depends(get_db)):
    students = db.query(Student).order_by(Student.roll_no).all()

    total_sessions = (
        db.query(func.count(ClassSession.id))
        .filter(ClassSession.is_active == False)
        .scalar()
        or 0
    )

    result = []
    for s in students:
        present = (
            db.query(func.count(Attendance.id))
            .join(ClassSession)
            .filter(
                Attendance.student_id == s.id,
                ClassSession.is_active == False,
            )
            .scalar()
            or 0
        )
        result.append(
            {
                "id": s.id,
                "name": s.name,
                "roll_no": s.roll_no,
                "dept": s.dept,
                "semester": s.semester,
                "present": present,
                "total": total_sessions,
            }
        )
    return result


@router.get("/students/{student_id}/analysis")
def get_student_analysis(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    today = date.today()

    # ── Monthly attendance (last 7 months) ─────────────────────────────────
    monthly = []
    for i in range(6, -1, -1):
        # Step back month by month
        month_offset = today.month - i
        year = today.year + (month_offset - 1) // 12
        month = ((month_offset - 1) % 12) + 1

        total = (
            db.query(func.count(ClassSession.id))
            .filter(
                ClassSession.is_active == False,
                extract("year", ClassSession.date) == year,
                extract("month", ClassSession.date) == month,
            )
            .scalar()
            or 0
        )
        present = (
            db.query(func.count(Attendance.id))
            .join(ClassSession)
            .filter(
                Attendance.student_id == student_id,
                ClassSession.is_active == False,
                extract("year", ClassSession.date) == year,
                extract("month", ClassSession.date) == month,
            )
            .scalar()
            or 0
        )
        monthly.append(
            {
                "month": datetime(year, month, 1).strftime("%b"),
                "present": present,
                "total": max(total, 1),
            }
        )

    # ── Subject-wise attendance ────────────────────────────────────────────
    classes = db.query(Class).all()
    subjects = []
    for cls in classes:
        total = (
            db.query(func.count(ClassSession.id))
            .filter(
                ClassSession.class_id == cls.id,
                ClassSession.is_active == False,
            )
            .scalar()
            or 0
        )
        present = (
            db.query(func.count(Attendance.id))
            .join(ClassSession)
            .filter(
                Attendance.student_id == student_id,
                ClassSession.class_id == cls.id,
                ClassSession.is_active == False,
            )
            .scalar()
            or 0
        )
        if total > 0:
            subjects.append({"subject": cls.code, "present": present, "total": total})

    # ── Recent 10 sessions ─────────────────────────────────────────────────
    recent_rows = (
        db.query(ClassSession, Attendance)
        .outerjoin(
            Attendance,
            and_(
                Attendance.session_id == ClassSession.id,
                Attendance.student_id == student_id,
            ),
        )
        .filter(ClassSession.is_active == False)
        .order_by(ClassSession.date.desc(), ClassSession.start_time.desc())
        .limit(10)
        .all()
    )

    recent_sessions = [
        {
            "date": sess.date.strftime("%d %b %Y"),
            "subject": sess.cls.code,
            "status": "present" if att else "absent",
        }
        for sess, att in recent_rows
    ]

    # ── Consecutive-session streak ─────────────────────────────────────────
    streak = 0
    for _, att in recent_rows:
        if att:
            streak += 1
        else:
            break

    return {
        "monthly": monthly,
        "subjects": subjects,
        "recent_sessions": recent_sessions,
        "streak": streak,
    }


# ── Classes ────────────────────────────────────────────────────────────────────

@router.get("/classes")
def get_classes(db: Session = Depends(get_db)):
    classes = db.query(Class).order_by(Class.code).all()
    return [
        {
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "section": c.section,
            "strength": c.strength,
            "faculty": c.faculty,
            "label": f"{c.code} — {c.name}",
        }
        for c in classes
    ]


# ── Sessions ───────────────────────────────────────────────────────────────────

@router.get("/sessions/current")
def get_current_session(db: Session = Depends(get_db)):
    session = (
        db.query(ClassSession)
        .filter(ClassSession.is_active == True)
        .order_by(ClassSession.start_time.desc())
        .first()
    )
    if not session:
        return None

    return _session_payload(session, db)


@router.post("/sessions/start")
def start_session(request: StartSessionRequest, db: Session = Depends(get_db)):
    cls = db.query(Class).filter(Class.id == request.class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    # Deactivate any current active session
    db.query(ClassSession).filter(ClassSession.is_active == True).update(
        {"is_active": False, "end_time": datetime.now()}
    )

    session = ClassSession(
        class_id=cls.id,
        date=date.today(),
        start_time=datetime.now(),
        is_active=True,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _session_payload(session, db)


@router.post("/sessions/end")
def end_session(db: Session = Depends(get_db)):
    updated = (
        db.query(ClassSession)
        .filter(ClassSession.is_active == True)
        .update({"is_active": False, "end_time": datetime.now()})
    )
    db.commit()
    return {"success": True, "sessions_ended": updated}


def _session_payload(session: ClassSession, db: Session) -> dict:
    records = (
        db.query(Attendance, Student)
        .join(Student, Attendance.student_id == Student.id)
        .filter(Attendance.session_id == session.id)
        .order_by(Attendance.marked_at)
        .all()
    )
    return {
        "id": session.id,
        "class_id": session.class_id,
        "class_code": session.cls.code,
        "class_name": session.cls.name,
        "section": session.cls.section,
        "strength": session.cls.strength,
        "faculty": session.cls.faculty,
        "start_time": session.start_time.isoformat(),
        "present_count": len(records),
        "attendance": [
            {
                "id": att.id,
                "student_id": s.id,
                "name": s.name,
                "roll_no": s.roll_no,
                "dept": s.dept,
                "marked_at": att.marked_at.strftime("%I:%M %p"),
            }
            for att, s in records
        ],
    }


# ── Attendance ─────────────────────────────────────────────────────────────────

@router.post("/attendance/mark")
def mark_attendance(request: MarkAttendanceRequest, db: Session = Depends(get_db)):
    session = (
        db.query(ClassSession)
        .filter(
            ClassSession.id == request.session_id,
            ClassSession.is_active == True,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Active session not found")

    student = db.query(Student).filter(
        or_(Student.roll_no == request.student_name, Student.name == request.student_name)
    ).first()
    if not student:
        return {"success": False, "reason": "Student not in database"}

    existing = (
        db.query(Attendance)
        .filter(
            Attendance.session_id == request.session_id,
            Attendance.student_id == student.id,
        )
        .first()
    )
    if existing:
        return {"success": True, "already_marked": True, "student_id": student.id}

    att = Attendance(
        session_id=request.session_id,
        student_id=student.id,
        marked_at=datetime.now(),
    )
    db.add(att)
    db.commit()

    return {
        "success": True,
        "already_marked": False,
        "student": {
            "id": student.id,
            "name": student.name,
            "roll_no": student.roll_no,
            "dept": student.dept,
            "marked_at": att.marked_at.strftime("%I:%M %p"),
        },
    }


# ── Report ─────────────────────────────────────────────────────────────────────

@router.get("/report")
def get_report(
    class_id: int = Query(...),
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: Session = Depends(get_db),
):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    sessions = (
        db.query(ClassSession)
        .filter(
            ClassSession.class_id == class_id,
            ClassSession.date >= from_date,
            ClassSession.date <= to_date,
            ClassSession.is_active == False,
        )
        .all()
    )

    total = len(sessions)
    session_ids = [s.id for s in sessions]

    students = db.query(Student).order_by(Student.roll_no).all()
    result = []
    for student in students:
        if session_ids:
            present = (
                db.query(func.count(Attendance.id))
                .filter(
                    Attendance.student_id == student.id,
                    Attendance.session_id.in_(session_ids),
                )
                .scalar()
                or 0
            )
        else:
            present = 0

        pct = round((present / total) * 100) if total > 0 else 0
        result.append(
            {
                "roll": student.roll_no,
                "name": student.name,
                "present": present,
                "total": total,
                "pct": pct,
            }
        )

    return result
