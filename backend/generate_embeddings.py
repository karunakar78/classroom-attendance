import os
import cv2
import pickle
import numpy as np
from insightface.app import FaceAnalysis

from app.services.preprocessing import enhance_frame

# ------------------------------------------------------------------ #
#  Config                                                              #
# ------------------------------------------------------------------ #

KNOWN_FACES_DIR = "app/known_faces"
OUTPUT_PKL      = "embeddings.pkl"

MIN_DET_SCORE   = 0.55   # skip detections weaker than this
MIN_IMAGES      = 3      # warn when a person has fewer source images

# ------------------------------------------------------------------ #
#  Augmentation                                                        #
# ------------------------------------------------------------------ #

def _gamma_lut(gamma: float) -> np.ndarray:
    """Pre-built LUT for fast gamma correction."""
    return np.array(
        [min(255, int((i / 255.0) ** gamma * 255)) for i in range(256)],
        dtype=np.uint8,
    )


def _downscale_blur(frame: np.ndarray) -> np.ndarray:
    """
    Shrink then upscale to simulate a distant / CCTV-resolution face
    (~1/6 the linear detail). Without this, every training embedding
    comes from a crisp close-up and the gallery never sees the soft,
    low-detail faces the camera actually delivers at 3-6m.
    """
    h, w = frame.shape[:2]
    small_w, small_h = max(20, w // 6), max(20, h // 6)
    small = cv2.resize(frame, (small_w, small_h), interpolation=cv2.INTER_AREA)
    return cv2.resize(small, (w, h), interpolation=cv2.INTER_LINEAR)


def augment(frame: np.ndarray) -> list[np.ndarray]:
    """
    Return several synthetic variants of one source image.

    Variants produced:
      1. Original (always included)
      2. Heavy underexposure  — gamma 0.3
      3. Mild  underexposure  — gamma 0.5
      4. Gaussian noise       — std 12
      5. CLAHE enhanced       — simulates inference-time preprocessing
      6. CLAHE + dark         — worst-case: dark frame that was enhanced
      7. Downscale/blur       — simulates a distant CCTV-resolution face
    """
    variants: list[np.ndarray] = [frame]

    # --- Darkness levels ---
    for gamma in (0.3, 0.5):
        variants.append(cv2.LUT(frame, _gamma_lut(gamma)))

    # --- Gaussian noise ---
    noise = np.random.normal(0, 12, frame.shape).astype(np.float32)
    noisy = np.clip(frame.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    variants.append(noisy)

    # --- CLAHE enhanced (same pipeline used at inference time) ---
    variants.append(enhance_frame(frame))

    # --- CLAHE applied on darkened frame (hardest lighting condition) ---
    dark = cv2.LUT(frame, _gamma_lut(0.4))
    variants.append(enhance_frame(dark))

    # --- Distance simulation ---
    variants.append(_downscale_blur(frame))

    return variants


# ------------------------------------------------------------------ #
#  InsightFace setup                                                   #
# ------------------------------------------------------------------ #

app = FaceAnalysis(
    name="buffalo_l",
    allowed_modules=["detection", "recognition"],
    providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
)
app.prepare(ctx_id=0, det_size=(640, 640))

# ------------------------------------------------------------------ #
#  Main pipeline                                                       #
# ------------------------------------------------------------------ #

embeddings: list[np.ndarray] = []
names:      list[str]        = []

print("\nGenerating embeddings…\n")

for person_name in sorted(os.listdir(KNOWN_FACES_DIR)):

    person_dir = os.path.join(KNOWN_FACES_DIR, person_name)
    if not os.path.isdir(person_dir):
        continue

    image_files = [
        f for f in os.listdir(person_dir)
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".webp"))
    ]

    print(f"\nProcessing: {person_name}  ({len(image_files)} source image(s))")

    if len(image_files) < MIN_IMAGES:
        print(
            f"  ⚠ Warning: only {len(image_files)} image(s) — "
            f"recommend {MIN_IMAGES}+ for a reliable embedding"
        )

    accepted = skipped_det = skipped_score = 0
    person_template_count = 0

    for image_name in image_files:
        image_path = os.path.join(person_dir, image_name)

        try:
            source = cv2.imread(image_path)
            if source is None:
                print(f"  Could not read: {image_name}")
                continue

            variants = augment(source)
            image_embeddings: list[np.ndarray] = []

            for variant in variants:
                faces = app.get(variant)
                if not faces:
                    skipped_det += 1
                    continue

                face = max(faces, key=lambda f: f.det_score)

                if face.det_score < MIN_DET_SCORE:
                    skipped_score += 1
                    continue

                emb = face.embedding.astype(np.float32)
                emb /= np.linalg.norm(emb)
                image_embeddings.append(emb)
                accepted += 1

            if not image_embeddings:
                print(f"  ✗ {image_name}  → no usable detections, skipped")
                continue

            # One template per SOURCE IMAGE, not per person. Averaging only
            # this image's own lighting/noise variants smooths out sensor
            # noise while keeping this image's pose distinct — a frontal
            # shot and a 90° profile shot become two separate gallery
            # templates instead of being blurred into one centroid that
            # matches neither angle well. Matching (_best_match) already
            # scans every template and keeps the single best score, so
            # multiple templates per person work with no other changes.
            template = np.mean(image_embeddings, axis=0).astype(np.float32)
            template /= np.linalg.norm(template)

            embeddings.append(template)
            names.append(person_name)
            person_template_count += 1

            print(f"  ✓ {image_name}  → {len(image_embeddings)}/{len(variants)} variant(s) usable")

        except Exception as exc:
            print(f"  Error: {image_path} — {exc}")

    print(
        f"  Accepted {accepted} embeddings across {person_template_count} template(s)  |  "
        f"Skipped — no detection: {skipped_det}, low score: {skipped_score}"
    )

    if person_template_count == 0:
        print(f"  ✗ No valid embeddings — skipping {person_name}")
        continue

    print(f"  ✓ {person_template_count} pose template(s) saved for {person_name}")

# ------------------------------------------------------------------ #
#  Persist                                                             #
# ------------------------------------------------------------------ #

data = {"embeddings": embeddings, "names": names}
with open(OUTPUT_PKL, "wb") as f:
    pickle.dump(data, f)

print(f"\nembeddings.pkl saved — {len(set(names))} person(s), {len(names)} template(s)")