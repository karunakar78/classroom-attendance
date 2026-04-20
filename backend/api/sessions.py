from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from database.connection import get_db
from database.models import Session as ClassSession
from database.schemas import SessionCreate, SessionResponse
from utils.auth import get_current_admin
from datetime import datetime
from typing import List

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post("/", response_model=SessionResponse)
def create_session(
    data: SessionCreate,
    db:   DBSession = Depends(get_db),
    _:    str       = Depends(get_current_admin)
):
    session = ClassSession(
        class_name = data.class_name,
        subject    = data.subject,
        date       = datetime.utcnow(),
        start_time = datetime.utcnow(),
        is_active  = 1
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/", response_model=List[SessionResponse])
def list_sessions(
    db: DBSession = Depends(get_db),
    _:  str       = Depends(get_current_admin)
):
    return db.query(ClassSession).order_by(ClassSession.date.desc()).all()


@router.get("/active", response_model=List[SessionResponse])
def active_sessions(
    db: DBSession = Depends(get_db),
    _:  str       = Depends(get_current_admin)
):
    return db.query(ClassSession).filter(ClassSession.is_active == 1).all()


@router.patch("/{session_id}/end", response_model=SessionResponse)
def end_session(
    session_id: int,
    db:  DBSession = Depends(get_db),
    _:   str       = Depends(get_current_admin)
):
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.is_active = 0
    session.end_time  = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session