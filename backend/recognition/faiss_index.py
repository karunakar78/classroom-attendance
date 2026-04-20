import faiss
import numpy as np
import os
import json

EMBEDDING_DIM  = 128
INDEX_PATH     = "recognition/data/faiss.index"
MAPPING_PATH   = "recognition/data/id_mapping.json"

# id_mapping maps FAISS internal index → student DB id
# e.g. { "0": 5, "1": 12, "2": 3 }

def _ensure_dir():
    os.makedirs("recognition/data", exist_ok=True)


def load_index() -> tuple[faiss.IndexFlatIP, dict]:
    """Load existing index and mapping from disk, or create fresh ones."""
    _ensure_dir()

    if os.path.exists(INDEX_PATH) and os.path.exists(MAPPING_PATH):
        index = faiss.read_index(INDEX_PATH)
        with open(MAPPING_PATH, "r") as f:
            mapping = json.load(f)
        print(f"[FAISS] Loaded index with {index.ntotal} faces.")
    else:
        index   = faiss.IndexFlatIP(EMBEDDING_DIM)   # Inner product = cosine on normalised vectors
        mapping = {}
        print("[FAISS] Created fresh index.")

    return index, mapping


def save_index(index: faiss.IndexFlatIP, mapping: dict):
    _ensure_dir()
    faiss.write_index(index, INDEX_PATH)
    with open(MAPPING_PATH, "w") as f:
        json.dump(mapping, f)
    print(f"[FAISS] Saved index with {index.ntotal} faces.")


def add_face(student_db_id: int, embedding: np.ndarray):
    """Add a single student embedding to the FAISS index."""
    index, mapping = load_index()

    # Normalise so inner product == cosine similarity
    norm = np.linalg.norm(embedding)
    if norm == 0:
        print("[FAISS] Zero-norm embedding, skipping.")
        return

    normed = (embedding / norm).reshape(1, -1).astype(np.float32)

    faiss_id           = index.ntotal          # next slot
    mapping[str(faiss_id)] = student_db_id

    index.add(normed)
    save_index(index, mapping)
    print(f"[FAISS] Added student {student_db_id} at slot {faiss_id}.")


def search_face(embedding: np.ndarray, threshold: float = 0.60) -> tuple[int | None, float]:
    """
    Search for the closest match.
    Returns (student_db_id, score) or (None, 0.0) if no match above threshold.
    """
    index, mapping = load_index()

    if index.ntotal == 0:
        return None, 0.0

    norm = np.linalg.norm(embedding)
    if norm == 0:
        return None, 0.0

    normed = (embedding / norm).reshape(1, -1).astype(np.float32)

    scores, indices = index.search(normed, k=1)
    top_score = float(scores[0][0])
    top_index = int(indices[0][0])

    print(f"[FAISS] Best match: slot {top_index}, score {top_score:.4f}")

    if top_score >= threshold:
        student_id = mapping.get(str(top_index))
        return student_id, top_score

    return None, top_score


def remove_face(student_db_id: int):
    """
    Remove a student from the index.
    FAISS flat index does not support deletion — we rebuild from remaining entries.
    """
    index, mapping = load_index()

    new_index   = faiss.IndexFlatIP(EMBEDDING_DIM)
    new_mapping = {}
    new_slot    = 0

    for slot_str, sid in mapping.items():
        if sid == student_db_id:
            continue                            # skip the deleted student
        # Reconstruct vector from old index
        vec = np.zeros((1, EMBEDDING_DIM), dtype=np.float32)
        index.reconstruct(int(slot_str), vec[0])
        new_index.add(vec)
        new_mapping[str(new_slot)] = sid
        new_slot += 1

    save_index(new_index, new_mapping)
    print(f"[FAISS] Removed student {student_db_id}. Index rebuilt.")