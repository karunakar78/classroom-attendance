from facenet_pytorch import MTCNN
import torch

# Device configuration
device = "cuda" if torch.cuda.is_available() else "cpu"

# Initialize MTCNN
mtcnn = MTCNN(
    image_size=160,
    margin=20,
    device=device
)


def detect_face(frame):
    """
    Detect and extract face from frame
    """

    face = mtcnn(frame)

    return face