import pickle
from pathlib import Path
import numpy as np
_PKL_PATH = Path(__file__).parent.parent.parent / "embeddings.pkl"

with open(_PKL_PATH, "rb") as f:
    data = pickle.load(f)

KNOWN_EMBEDDINGS = data["embeddings"]

KNOWN_NAMES = data["names"]

print(
    f"Loaded {len(KNOWN_NAMES)} embeddings"
)
for name, emb in zip(KNOWN_NAMES, KNOWN_EMBEDDINGS):
    print(f"{name}: norm = {np.linalg.norm(emb):.6f}")