from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import engine, SessionLocal
from database import models
from recognition.enrollment import load_all_embeddings_to_faiss
from dotenv import load_dotenv

load_dotenv()

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Classroom Attendance System",
    description="Automated face recognition-based attendance",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        load_all_embeddings_to_faiss(db)
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "Attendance System API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}