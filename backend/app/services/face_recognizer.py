import torch
import cv2
import base64
import numpy as np

from io import BytesIO
from PIL import Image

from facenet_pytorch import (
    InceptionResnetV1,
    MTCNN
)

from app.services.embeddings_store import (
    KNOWN_EMBEDDINGS,
    KNOWN_NAMES
)

# Device configuration
device = "cuda" if torch.cuda.is_available() else "cpu"

# Initialize MTCNN
mtcnn = MTCNN(
    keep_all=True,
    device=device
)

# Initialize FaceNet model
resnet = InceptionResnetV1(
    pretrained="vggface2"
).eval().to(device)


def image_to_base64(frame):
    _, buffer = cv2.imencode(".jpg", frame)

    base64_image = base64.b64encode(
        buffer
    ).decode("utf-8")

    return f"data:image/jpeg;base64,{base64_image}"


def recognize_faces(frame):

    # Convert BGR to RGB
    rgb_frame = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2RGB
    )

    pil_image = Image.fromarray(rgb_frame)

    # Detect faces
    boxes, probs = mtcnn.detect(pil_image)

    results = []

    if boxes is None:
        return {
            "faces": [],
            "annotated_frame": image_to_base64(frame)
        }

    # Extract aligned faces
    faces = mtcnn.extract(
        pil_image,
        boxes,
        save_path=None
    )

    for face_tensor, box in zip(faces, boxes):

        if face_tensor is None:
            continue

        x1, y1, x2, y2 = map(int, box)

        # Generate embedding
        face_tensor = face_tensor.unsqueeze(0).to(device)

        embedding = resnet(
            face_tensor
        ).detach().cpu()

        # Compare with known embeddings
        min_dist = float("inf")
        identity = "Unknown"

        for known_embedding, name in zip(
            KNOWN_EMBEDDINGS,
            KNOWN_NAMES
        ):

            dist = torch.dist(
                embedding,
                known_embedding
            ).item()

            if dist < min_dist:
                min_dist = dist
                identity = name

        # Confidence calculation
        confidence = max(0, 1 - min_dist)

        # Recognition threshold
        THRESHOLD = 0.9

        if min_dist > THRESHOLD:
            identity = "Unknown"

        # Store results
        results.append({
            "name": identity,
            "confidence": round(confidence, 3),
            "box": [x1, y1, x2, y2]
        })

        # Draw bounding box
        color = (0, 255, 0)

        if identity == "Unknown":
            color = (0, 0, 255)

        cv2.rectangle(
            frame,
            (x1, y1),
            (x2, y2),
            color,
            2
        )

        # Draw label
        label = f"{identity} ({round(confidence * 100)}%)"

        cv2.putText(
            frame,
            label,
            (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            color,
            2
        )

    return {
        "faces": results,
        "annotated_frame": image_to_base64(frame)
    }