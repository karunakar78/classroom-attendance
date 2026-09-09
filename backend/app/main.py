from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.db.database import SessionLocal, engine
from app.db.models import Base, Camera


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _seed_default_camera()
    yield


def _seed_default_camera():
    db = SessionLocal()
    try:
        if db.query(Camera).count() == 0:
            db.add(Camera(name="CAM-01", location="Main Hall", camera_index=0))
            db.commit()
    finally:
        db.close()


app = FastAPI(title="Face Recognition Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
