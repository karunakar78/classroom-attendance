from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from .connection import Base

class Student(Base):
    __tablename__ = "students"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, nullable=False)
    roll_number   = Column(String, unique=True, nullable=False)
    class_name    = Column(String, nullable=False)
    face_encoding = Column(String, nullable=True)   # path to saved .npy file
    image_path    = Column(String, nullable=True)   # path to reference photo
    created_at    = Column(DateTime, default=datetime.utcnow)

    attendance_logs = relationship("AttendanceLog", back_populates="student")


class Session(Base):
    __tablename__ = "sessions"

    id         = Column(Integer, primary_key=True, index=True)
    class_name = Column(String, nullable=False)
    subject    = Column(String, nullable=False)
    date       = Column(DateTime, default=datetime.utcnow)
    start_time = Column(DateTime, nullable=True)
    end_time   = Column(DateTime, nullable=True)
    is_active  = Column(Integer, default=1)  # 1 = active, 0 = ended

    attendance_logs = relationship("AttendanceLog", back_populates="session")


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id               = Column(Integer, primary_key=True, index=True)
    student_id       = Column(Integer, ForeignKey("students.id"), nullable=False)
    session_id       = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    timestamp        = Column(DateTime, default=datetime.utcnow)
    confidence_score = Column(Float, nullable=True)

    student = relationship("Student", back_populates="attendance_logs")
    session = relationship("Session", back_populates="attendance_logs")

    __table_args__ = (
        UniqueConstraint("student_id", "session_id", name="unique_attendance"),
    )