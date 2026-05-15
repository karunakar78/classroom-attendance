import pickle
from pathlib import Path

_PKL_PATH = Path(__file__).parent.parent.parent / "embeddings.pkl"

with open(_PKL_PATH, "rb") as f:
    data = pickle.load(f)

KNOWN_EMBEDDINGS = data["embeddings"]

KNOWN_NAMES = data["names"]

print(
    f"Loaded {len(KNOWN_NAMES)} embeddings"
)