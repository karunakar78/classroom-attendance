from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import AttendanceLog, Student, Session as ClassSession
from database.schemas import AttendanceResponse
from utils.auth import get_current_admin
from typing import List

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.get("/{session_id}", response_model=List[AttendanceResponse])
def get_attendance(
    session_id: int,
    db: Session = Depends(get_db),
    _:  str     = Depends(get_current_admin)
):
    logs = db.query(AttendanceLog).filter(
        AttendanceLog.session_id == session_id
    ).all()

    result = []
    for log in logs:
        student = db.query(Student).filter(Student.id == log.student_id).first()
        result.append(AttendanceResponse(
            id               = log.id,
            student_id       = log.student_id,
            session_id       = log.session_id,
            timestamp        = log.timestamp,
            confidence_score = log.confidence_score,
            student_name     = student.name if student else None
        ))
    return result


@router.get("/student/{student_id}", response_model=List[AttendanceResponse])
def get_student_attendance(
    student_id: int,
    db: Session = Depends(get_db),
    _:  str     = Depends(get_current_admin)
):
    logs = db.query(AttendanceLog).filter(
        AttendanceLog.student_id == student_id
    ).all()
    return [AttendanceResponse(
        id               = l.id,
        student_id       = l.student_id,
        session_id       = l.session_id,
        timestamp        = l.timestamp,
        confidence_score = l.confidence_score
    ) for l in logs]