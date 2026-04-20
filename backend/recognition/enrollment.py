import os
import shutil
import numpy as np
from sqlalchemy.orm import Session
from database.models import Student
from recognition.face_encoder import extract_embedding, extract_embedding_from_multiple
from recognition.faiss_index import add_face

FACES_DIR = "recognition/data/faces"

def enroll_student(
    db: Session,
    name: str,
    roll_number: str,
    class_name: str,
    image_paths: list[str]
) -> dict:
    """
    Full enrollment flow:
    1. Check for duplicate roll number
    2. Extract averaged face embedding
    3. Save student record to DB
    4. Save embedding .npy file
    5. Add to FAISS index
    """

    # 1. Duplicate check
    existing = db.query(Student).filter(Student.roll_number == roll_number).first()
    if existing:
        return {"success": False, "error": f"Roll number {roll_number} already enrolled."}

    # 2. Extract embedding
    if len(image_paths) == 1:
        embedding = extract_embedding(image_paths[0])
    else:
        embedding = extract_embedding_from_multiple(image_paths)

    if embedding is None:
        return {"success": False, "error": "No face detected in provided images."}

    # 3. Save student to DB (get the auto-generated ID)
    student = Student(
        name        = name,
        roll_number = roll_number,
        class_name  = class_name,
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    # 4. Save embedding as .npy file
    os.makedirs(FACES_DIR, exist_ok=True)
    emb_path = os.path.join(FACES_DIR, f"{student.id}.npy")
    np.save(emb_path, embedding)

    # Copy reference image
    img_dest = os.path.join(FACES_DIR, f"{student.id}.jpg")
    shutil.copy(image_paths[0], img_dest)

    # Update DB record with file paths
    student.face_encoding = emb_path
    student.image_path    = img_dest
    db.commit()

    # 5. Add to FAISS
    add_face(student.id, embedding)

    return {
        "success":    True,
        "student_id": student.id,
        "name":       name,
        "message":    f"Student {name} enrolled successfully."
    }


def load_all_embeddings_to_faiss(db: Session):
    """
    Rebuild the entire FAISS index from DB on server startup.
    Useful if the index file gets deleted.
    """
    import faiss
    from recognition.faiss_index import EMBEDDING_DIM, save_index

    students  = db.query(Student).filter(Student.face_encoding != None).all()
    new_index = faiss.IndexFlatIP(EMBEDDING_DIM)
    mapping   = {}

    for slot, student in enumerate(students):
        if not os.path.exists(student.face_encoding):
            continue
        emb  = np.load(student.face_encoding).astype(np.float32)
        norm = np.linalg.norm(emb)
        if norm == 0:
            continue
        emb  = (emb / norm).reshape(1, -1)
        new_index.add(emb)
        mapping[str(slot)] = student.id

    save_index(new_index, mapping)
    print(f"[Startup] Rebuilt FAISS index with {new_index.ntotal} students.")