from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# ── Student ──────────────────────────────────────────
class StudentCreate(BaseModel):
    name:        str
    roll_number: str
    class_name:  str

class StudentResponse(BaseModel):
    id:          int
    name:        str
    roll_number: str
    class_name:  str
    created_at:  datetime

    class Config:
        from_attributes = True

# ── Session ──────────────────────────────────────────
class SessionCreate(BaseModel):
    class_name: str
    subject:    str

class SessionResponse(BaseModel):
    id:         int
    class_name: str
    subject:    str
    date:       datetime
    is_active:  int
    start_time: Optional[datetime]
    end_time:   Optional[datetime]

    class Config:
        from_attributes = True

# ── Attendance ────────────────────────────────────────
class AttendanceResponse(BaseModel):
    id:               int
    student_id:       int
    session_id:       int
    timestamp:        datetime
    confidence_score: Optional[float]
    student_name:     Optional[str] = None

    class Config:
        from_attributes = True

# ── Auth ──────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"