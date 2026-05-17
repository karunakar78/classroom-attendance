from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date,
    ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Student(Base):
    __tablename__ = "students"

    id        = Column(Integer, primary_key=True, index=True)
    name      = Column(String(100), nullable=False)
    roll_no   = Column(String(20), unique=True, nullable=False)
    dept      = Column(String(50), default="CSE")
    semester  = Column(Integer, default=4)

    attendance_records = relationship("Attendance", back_populates="student")


class Class(Base):
    __tablename__ = "classes"

    id       = Column(Integer, primary_key=True, index=True)
    code     = Column(String(20), unique=True, nullable=False)
    name     = Column(String(100), nullable=False)
    section  = Column(String(10))
    strength = Column(Integer)
    faculty  = Column(String(100))

    sessions = relationship("ClassSession", back_populates="cls")


class ClassSession(Base):
    __tablename__ = "sessions"

    id         = Column(Integer, primary_key=True, index=True)
    class_id   = Column(Integer, ForeignKey("classes.id"), nullable=False)
    date       = Column(Date, server_default=func.current_date())
    start_time = Column(DateTime, server_default=func.now())
    end_time   = Column(DateTime, nullable=True)
    is_active  = Column(Boolean, default=True)

    cls                = relationship("Class", back_populates="sessions")
    attendance_records = relationship("Attendance", back_populates="session")


class Attendance(Base):
    __tablename__ = "attendance"

    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    marked_at  = Column(DateTime, server_default=func.now())

    session = relationship("ClassSession", back_populates="attendance_records")
    student = relationship("Student", back_populates="attendance_records")

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_session_student"),
    )
