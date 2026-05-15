import numpy as np
from insightface.app import FaceAnalysis

from app.services.embeddings_store import (
    KNOWN_EMBEDDINGS,
    KNOWN_NAMES
)

_app = FaceAnalysis(
    name='buffalo_l',
    allowed_modules=['detection', 'recognition'],
    providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
)
_app.prepare(ctx_id=0, det_size=(640, 640))

THRESHOLD = 0.7


def recognize_faces(frame):

    faces = _app.get(frame)

    results = []

    for face in faces:

        x1, y1, x2, y2 = map(int, face.bbox)

        embedding = face.embedding  # L2-normalised, shape [512]

        best_sim = -1.0
        identity = "Unknown"

        for known_emb, name in zip(KNOWN_EMBEDDINGS, KNOWN_NAMES):

            sim = float(np.dot(embedding, known_emb))

            if sim > best_sim:
                best_sim = sim
                identity = name

        if best_sim < THRESHOLD:
            identity = "Unknown"

        results.append({
            "name": identity,
            "confidence": round(max(0.0, best_sim), 3),
            "box": [x1, y1, x2, y2]
        })

    return {"faces": results}
