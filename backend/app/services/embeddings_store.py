import os
import torch
from PIL import Image
from facenet_pytorch import (
    InceptionResnetV1,
    MTCNN
)

# Device configuration
device = "cuda" if torch.cuda.is_available() else "cpu"

# Initialize MTCNN
mtcnn = MTCNN(
    image_size=160,
    margin=20,
    device=device
)

# Initialize FaceNet model
resnet = InceptionResnetV1(
    pretrained='vggface2'
).eval().to(device)

# Storage for embeddings and names
KNOWN_EMBEDDINGS = []
KNOWN_NAMES = []

# Known faces directory
KNOWN_FACES_DIR = "app/known_faces"


def load_known_faces():
    print("Loading known faces...")

    for person_name in os.listdir(KNOWN_FACES_DIR):

        person_dir = os.path.join(
            KNOWN_FACES_DIR,
            person_name
        )

        if not os.path.isdir(person_dir):
            continue

        for image_name in os.listdir(person_dir):

            image_path = os.path.join(
                person_dir,
                image_name
            )

            try:
                # Load image
                image = Image.open(
                    image_path
                ).convert("RGB")

                # Detect and align face
                face = mtcnn(image)

                if face is None:
                    continue

                # Prepare tensor
                face = face.unsqueeze(0).to(device)

                # Generate embedding
                embedding = resnet(face).detach().cpu()

                # Store data
                KNOWN_EMBEDDINGS.append(embedding)
                KNOWN_NAMES.append(person_name)

                print(f"Loaded: {person_name}")

            except Exception as e:
                print(f"Error loading {image_path}: {e}")


# Load all known faces
load_known_faces()