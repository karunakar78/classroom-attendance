import cv2
import numpy as np
from deepface import DeepFace
import os

MODEL_NAME = "Facenet"          # Fast and accurate enough for classrooms
DETECTOR  = "opencv"            # Fastest detector; swap to "retinaface" for better accuracy

def extract_embedding(image_input) -> np.ndarray | None:
    """
    Accept a file path (str) or a numpy BGR image array.
    Returns a 128-d numpy embedding, or None if no face found.
    """
    try:
        if isinstance(image_input, str):
            img = cv2.imread(image_input)
        else:
            img = image_input

        if img is None:
            print("[Encoder] Could not load image.")
            return None

        # DeepFace expects RGB
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        result = DeepFace.represent(
            img_path      = img_rgb,
            model_name    = MODEL_NAME,
            detector_backend = DETECTOR,
            enforce_detection = True
        )

        embedding = np.array(result[0]["embedding"], dtype=np.float32)
        return embedding

    except Exception as e:
        print(f"[Encoder] Failed to extract embedding: {e}")
        return None


def extract_embedding_from_multiple(image_paths: list[str]) -> np.ndarray | None:
    """
    Extract embeddings from multiple images of the same student
    and return the average — more robust than a single image.
    """
    embeddings = []
    for path in image_paths:
        emb = extract_embedding(path)
        if emb is not None:
            embeddings.append(emb)

    if not embeddings:
        print("[Encoder] No valid faces found in any image.")
        return None

    avg_embedding = np.mean(embeddings, axis=0)
    return avg_embedding.astype(np.float32)