import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import Student
from database.schemas import StudentResponse
from recognition.enrollment import enroll_student
from recognition.faiss_index import remove_face
from utils.auth import get_current_admin
from typing import List

router = APIRouter(prefix="/students", tags=["Students"])

UPLOAD_TEMP = "recognition/data/temp"


@router.post("/enroll")
async def enroll(
    name:        str        = Form(...),
    roll_number: str        = Form(...),
    class_name:  str        = Form(...),
    images:      List[UploadFile] = File(...),
    db:          Session    = Depends(get_db),
    _:           str        = Depends(get_current_admin)
):
    """Upload 1–5 photos of a student to enroll them."""
    os.makedirs(UPLOAD_TEMP, exist_ok=True)

    saved_paths = []
    for img in images:
        dest = os.path.join(UPLOAD_TEMP, img.filename)
        with open(dest, "wb") as f:
            f.write(await img.read())
        saved_paths.append(dest)

    result = enroll_student(db, name, roll_number, class_name, saved_paths)

    # Clean up temp files
    for p in saved_paths:
        if os.path.exists(p):
            os.remove(p)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.get("/", response_model=List[StudentResponse])
def list_students(
    db: Session = Depends(get_db),
    _:  str     = Depends(get_current_admin)
):
    return db.query(Student).all()


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    _:  str     = Depends(get_current_admin)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    db:  Session = Depends(get_db),
    _:   str     = Depends(get_current_admin)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Remove from FAISS index
    remove_face(student_id)

    # Delete saved files
    for path in [student.face_encoding, student.image_path]:
        if path and os.path.exists(path):
            os.remove(path)

    db.delete(student)
    db.commit()
    return {"message": f"Student {student.name} deleted successfully"}