import os
import time

import numpy as np
import supervision as sv
from collections import deque
from dotenv import load_dotenv
from insightface.app import FaceAnalysis
from insightface.app.common import Face
from app.services.preprocessing import enhance_frame
from app.services.embeddings_store import (
    KNOWN_EMBEDDINGS,
    KNOWN_NAMES,
)
from app.services.liveness.blink import BlinkTracker, eye_openness
from app.services.liveness.motion import MotionTracker
from app.services.liveness.gaze import GazeTracker, eye_gaze_positions

load_dotenv()

# Toggle for A/B testing with and without the liveness gate — set
# LIVENESS_ENABLED=false in .env to recognize faces immediately, with no
# blink/motion check, exactly like before this feature existed.
LIVENESS_ENABLED = os.getenv("LIVENESS_ENABLED", "true").strip().lower() in ("1", "true", "yes", "on")

# ------------------------------------------------------------------ #
#  InsightFace + ByteTrack setup                                       #
# ------------------------------------------------------------------ #

_app = FaceAnalysis(
    name="buffalo_l",
    allowed_modules=["detection", "recognition", "landmark_2d_106"],
    providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
)
_app.prepare(ctx_id=0, det_size=(1280, 1280), det_thresh=0.4)

# `FaceAnalysis.get()` always runs the recognition (embedding) model on
# every detected face, even ones whose track is already locked in. We
# call detection and recognition separately so recognition only runs
# for tracks that still need it (see recognize_faces below).
_det_model      = _app.det_model
_rec_model      = _app.models["recognition"]
_landmark_model = _app.models["landmark_2d_106"]

_tracker = sv.ByteTrack(
    track_activation_threshold=0.25,
    minimum_matching_threshold=0.8,
    lost_track_buffer=30,
    frame_rate=30,
)

# ------------------------------------------------------------------ #
#  Tuning knobs                                                        #
# ------------------------------------------------------------------ #

THRESHOLD            = 0.40   # cosine sim needed to claim identity
CACHE_CONFIDENCE_MIN = 0.62   # minimum score to permanently lock identity
BUFFER_SIZE          = 10     # max embeddings kept per track (rolling)
MIN_BUFFER           = 3      # frames to collect before first attempt

# NOTE: No retry cooldown — Unknown faces are re-tried every frame.
# Gallery matching is pure dot products so this costs almost nothing.

# ------------------------------------------------------------------ #
#  Per-track state                                                     #
# ------------------------------------------------------------------ #

# track_id → (identity, score) — only written once, high confidence only
_track_identities: dict[int, tuple[str, float]] = {}

# track_id → rolling deque of L2-normalised embeddings
_track_emb_buffer: dict[int, deque]             = {}

# track_id → BlinkTracker  — liveness signal, latches on a real blink
_track_blink: dict[int, BlinkTracker]           = {}

# track_id → MotionTracker — fallback, latches on whole-head sway
_track_motion: dict[int, MotionTracker]         = {}

# track_id → GazeTracker   — fallback, latches on pupil movement within the eye
_track_gaze: dict[int, GazeTracker]             = {}

# ------------------------------------------------------------------ #
#  Helpers                                                             #
# ------------------------------------------------------------------ #

def _safe(v):
    """Recursively convert numpy scalars to Python natives."""
    if isinstance(v, dict):
        return {k: _safe(val) for k, val in v.items()}
    if isinstance(v, list):
        return [_safe(i) for i in v]
    if isinstance(v, np.integer):
        return int(v)
    if isinstance(v, np.floating):
        return float(v)
    return v


def _smooth_embedding(buf: deque) -> np.ndarray:
    """Average the buffered embeddings and re-normalise to unit sphere."""
    avg = np.mean(buf, axis=0).astype(np.float32)
    norm = np.linalg.norm(avg)
    return avg / norm if norm > 0 else avg


def _best_match(embedding: np.ndarray) -> tuple[str, float]:
    """Return (name, similarity) for the closest gallery entry."""
    best_sim  = -1.0
    best_name = "Unknown"
    for known_emb, name in zip(KNOWN_EMBEDDINGS, KNOWN_NAMES):
        sim = float(np.dot(embedding, known_emb))
        if sim > best_sim:
            best_sim  = sim
            best_name = name
    if best_sim < THRESHOLD:
        best_name = "Unknown"
    return best_name, float(best_sim)


def _cleanup_stale(active_ids: set[int]) -> None:
    """Drop all per-track state for tracks that have disappeared."""
    for store in (_track_identities, _track_emb_buffer, _track_blink, _track_motion, _track_gaze):
        for tid in [k for k in store if k not in active_ids]:
            del store[tid]


def _iou(box_a, box_b) -> float:
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b
    ix1 = max(ax1, bx1); iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2); iy2 = min(ay2, by2)
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    if inter == 0:
        return 0.0
    union = (ax2-ax1)*(ay2-ay1) + (bx2-bx1)*(by2-by1) - inter
    return inter / union if union > 0 else 0.0

# ------------------------------------------------------------------ #
#  Public API                                                          #
# ------------------------------------------------------------------ #

def recognize_faces(frame: np.ndarray) -> dict:
    total_time = time.perf_counter()
    recognition_time = 0.0
    liveness_time = 0.0

    t = time.perf_counter()
    frame = enhance_frame(frame)
    preprocessing_time = time.perf_counter() - t

    t = time.perf_counter()
    bboxes, kpss = _det_model.detect(frame, max_num=0, metric="default")
    face_detection_time = time.perf_counter() - t

    if bboxes.shape[0] == 0:
        print(
            f"Preprocess: {preprocessing_time:.4f}s | "
            f"InsightFace-detect: {face_detection_time:.4f}s | "
            f"InsightFace-recognize: {recognition_time:.4f}s | "
            f"Total: {time.perf_counter() - total_time:.4f}s"
        )
        return {"faces": []}

    faces = []
    for i in range(bboxes.shape[0]):
        faces.append(Face(
            bbox=bboxes[i, 0:4],
            kps=kpss[i] if kpss is not None else None,
            det_score=bboxes[i, 4],
        ))

    t = time.perf_counter()
    # ── Build supervision Detections ──────────────────────────────── #
    detections = sv.Detections(
        xyxy=np.array([f.bbox.astype(np.float32) for f in faces]),
        confidence=np.array([float(f.det_score) for f in faces]),
    )
    detection_time = time.perf_counter() - t

    t = time.perf_counter()
    # ── ByteTrack update ─────────────────────────────────────────── #
    detections = _tracker.update_with_detections(detections)
    active_ids = {int(tid) for tid in detections.tracker_id if tid is not None}
    _cleanup_stale(active_ids)
    tracking_time = time.perf_counter() - t

    results = []

    for track_box, track_id in zip(detections.xyxy, detections.tracker_id):

        # ── Match tracker box → InsightFace face via IoU ─────────── #
        best_face = max(faces, key=lambda f: _iou(track_box, f.bbox))
        if _iou(track_box, best_face.bbox) == 0:
            continue

        x1, y1, x2, y2 = [int(v) for v in best_face.bbox]
        tid = int(track_id)

        # ── Confirmed identity — serve immediately, no re-check ───── #
        if tid in _track_identities:
            identity, score = _track_identities[tid]
            results.append(_safe({
                "track_id":   tid,
                "name":       identity,
                "confidence": round(score, 3),
                "box":        [x1, y1, x2, y2],
                "live":       True,
            }))
            continue

        # ── Liveness gate — identity is only attempted once this track ──
        # clears at least one of three signals: a blink, the pupil moving
        # within its own eye socket, or sustained whole-head sway. Blink
        # and gaze are both "relative" measurements a rigid photo can't
        # fake by itself (a printed eye never opens, and its printed pupil
        # never moves relative to its own printed eye corners, no matter
        # how the page is handled) — but at classroom/CCTV distance, the
        # eye region may simply be too few pixels for either to resolve at
        # all. Motion is added to still recognize distant faces in that
        # case, at a known, accepted cost:
        #
        # KNOWN VULNERABILITY (reported to the user, not hidden): a photo
        # or phone held in a human hand wobbles with the same tremor
        # amplitude as a real head, since the same hand/wrist drives both.
        # Motion alone cannot tell them apart, so a hand-held (not
        # tripod-mounted/taped) spoof can pass via this fallback. This
        # trade favors recognizing every real, distant student over
        # closing that specific gap. Disable the whole gate via
        # LIVENESS_ENABLED=false in .env.
        if LIVENESS_ENABLED:
            t = time.perf_counter()
            if tid not in _track_blink:
                _track_blink[tid] = BlinkTracker()
            if tid not in _track_gaze:
                _track_gaze[tid] = GazeTracker()
            if tid not in _track_motion:
                _track_motion[tid] = MotionTracker()
            blink  = _track_blink[tid]
            gaze   = _track_gaze[tid]
            motion = _track_motion[tid]

            if not blink.confirmed or not gaze.confirmed:
                landmarks = _landmark_model.get(frame, best_face)
                if not blink.confirmed:
                    blink.update(eye_openness(landmarks))
                if not gaze.confirmed:
                    left_pos, right_pos = eye_gaze_positions(frame, landmarks)
                    gaze.update(left_pos, right_pos)
            if not motion.confirmed:
                motion.update((x1, y1, x2, y2))

            is_live = blink.confirmed or gaze.confirmed or motion.confirmed
            liveness_time += time.perf_counter() - t

            print(
                f"[Track {tid}] liveness: blink={blink.confirmed} "
                f"gaze={gaze.confirmed} motion={motion.confirmed}"
            )
        else:
            is_live = True

        if not is_live:
            results.append(_safe({
                "track_id":   tid,
                "name":       "Unknown",
                "confidence": 0.0,
                "box":        [x1, y1, x2, y2],
                "live":       False,
                "liveness":   "awaiting_blink",
            }))
            continue

        # ── Confirmed live — only now do we pay for recognition ──── #
        t = time.perf_counter()
        _rec_model.get(frame, best_face)
        recognition_time += time.perf_counter() - t

        # ── Accumulate embedding into rolling buffer ──────────────── #
        raw_emb = best_face.embedding.astype(np.float32).copy()
        raw_emb /= np.linalg.norm(raw_emb)

        if tid not in _track_emb_buffer:
            _track_emb_buffer[tid] = deque(maxlen=BUFFER_SIZE)
        _track_emb_buffer[tid].append(raw_emb)

        buf = _track_emb_buffer[tid]

        # ── Not enough frames yet — hold as Pending ───────────────── #
        if len(buf) < MIN_BUFFER:
            results.append(_safe({
                "track_id":   tid,
                "name":       "Pending",
                "confidence": 0.0,
                "box":        [x1, y1, x2, y2],
                "live":       True,
            }))
            continue

        # ── Retry recognition every frame until identity locks in ──── #
        # No cooldown — Unknown faces are re-tried on every single frame.
        # The rolling buffer smooths noise so repeated attempts converge
        # as soon as the person turns to a recognisable angle.
        smoothed        = _smooth_embedding(buf)
        identity, score = _best_match(smoothed)

        print(f"[Track {tid}] {identity}: {score:.4f}  (buffer={len(buf)}, face={x2-x1}x{y2-y1}px, det={best_face.det_score:.3f})")

        # Lock in permanently once confidence clears the bar
        if identity != "Unknown" and score >= CACHE_CONFIDENCE_MIN:
            _track_identities[tid] = (identity, score)

        results.append(_safe({
            "track_id":   tid,
            "name":       identity,
            "confidence": round(score, 3) if identity != "Unknown" else 0.0,
            "box":        [x1, y1, x2, y2],
            "live":       True,
        }))

    total_pipeline_time = time.perf_counter() - total_time
    print(
        f"Preprocess: {preprocessing_time:.4f}s | "
        f"InsightFace-detect: {face_detection_time:.4f}s | "
        f"Liveness: {liveness_time:.4f}s | "
        f"InsightFace-recognize: {recognition_time:.4f}s | "
        f"Detection: {detection_time:.4f}s | "
        f"Tracking: {tracking_time:.4f}s | "
        f"Total: {total_pipeline_time:.4f}s"
    )
    return {"faces": results}