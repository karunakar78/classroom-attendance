import cv2
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database.models import AttendanceLog, Student, Session as ClassSession
from recognition.face_encoder import extract_embedding
from recognition.faiss_index import search_face
import os

# In-memory lock: { student_id: last_marked_datetime }
_recently_marked: dict[int, datetime] = {}

LOCK_MINUTES = int(os.getenv("DUPLICATE_LOCK_MINUTES", 30))
THRESHOLD    = float(os.getenv("FACE_MATCH_THRESHOLD", 0.60))


def process_frame(frame: np.ndarray, session_id: int, db: Session) -> list[dict]:
    """
    Process one video frame:
    1. Extract embedding
    2. Search FAISS
    3. Check duplicate lock
    4. Mark attendance in DB
    Returns list of recognition events (one per detected face).
    """
    events = []

    # Try to get embedding from this frame
    embedding = extract_embedding(frame)

    if embedding is None:
        return events   # No face in frame

    student_id, score = search_face(embedding, threshold=THRESHOLD)

    if student_id is None:
        events.append({"status": "unknown", "score": round(score, 4)})
        return events

    # Duplicate lock check
    now        = datetime.utcnow()
    last_seen  = _recently_marked.get(student_id)
    if last_seen and (now - last_seen) < timedelta(minutes=LOCK_MINUTES):
        events.append({
            "status":     "duplicate",
            "student_id": student_id,
            "score":      round(score, 4),
            "message":    "Already marked within lock window."
        })
        return events

    # Check DB for existing entry (double safety)
    existing = db.query(AttendanceLog).filter_by(
        student_id = student_id,
        session_id = session_id
    ).first()

    if existing:
        _recently_marked[student_id] = now
        events.append({
            "status":     "duplicate",
            "student_id": student_id,
            "score":      round(score, 4)
        })
        return events

    # Mark attendance
    log = AttendanceLog(
        student_id       = student_id,
        session_id       = session_id,
        timestamp        = now,
        confidence_score = score
    )
    db.add(log)
    db.commit()

    _recently_marked[student_id] = now

    # Fetch student name for the event
    student = db.query(Student).filter(Student.id == student_id).first()

    events.append({
        "status":     "marked",
        "student_id": student_id,
        "name":       student.name if student else "Unknown",
        "score":      round(score, 4),
        "timestamp":  now.isoformat()
    })

    print(f"[Live] Marked attendance: {student.name} (score={score:.4f})")
    return events