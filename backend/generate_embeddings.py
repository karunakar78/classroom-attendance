import os
import cv2
import pickle
import numpy as np

from insightface.app import FaceAnalysis

app = FaceAnalysis(
    name='buffalo_l',
    allowed_modules=['detection', 'recognition'],
    providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
)
app.prepare(ctx_id=0, det_size=(640, 640))

KNOWN_FACES_DIR = "app/known_faces"

embeddings = []
names = []

print("\nGenerating embeddings...\n")

for person_name in os.listdir(KNOWN_FACES_DIR):

    person_dir = os.path.join(
        KNOWN_FACES_DIR,
        person_name
    )

    if not os.path.isdir(person_dir):
        continue

    print(f"\nProcessing: {person_name}")

    person_embeddings = []

    for image_name in os.listdir(person_dir):

        image_path = os.path.join(
            person_dir,
            image_name
        )

        try:

            frame = cv2.imread(image_path)

            if frame is None:
                continue

            faces = app.get(frame)

            if not faces:
                print(f"No face: {image_name}")
                continue

            # pick the highest-confidence detection
            face = max(faces, key=lambda f: f.det_score)

            person_embeddings.append(face.embedding)

            print(f"Added: {image_name}")

        except Exception as e:
            print(f"Error: {image_path} — {e}")

    if not person_embeddings:
        print(f"No valid embeddings for {person_name}")
        continue

    # average all embeddings for this person, then re-normalise
    avg = np.mean(person_embeddings, axis=0)
    avg = avg / np.linalg.norm(avg)

    embeddings.append(avg)
    names.append(person_name)

    print(f"Saved embedding for {person_name}")

data = {"embeddings": embeddings, "names": names}

with open("embeddings.pkl", "wb") as f:
    pickle.dump(data, f)

print(f"\nembeddings.pkl saved — {len(names)} person(s)")
