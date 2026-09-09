import statistics
import sys
import time
from pathlib import Path

import cv2
import numpy as np
from insightface.app.common import Face

from app.services import face_recognizer
from app.services.face_recognizer import recognize_faces

FACE_DIR = Path(__file__).parent.parent / "face"
NUM_FRAMES = int(sys.argv[1]) if len(sys.argv) > 1 else 1000


def load_frames() -> list[np.ndarray]:
    paths = sorted(FACE_DIR.glob("*.jpg"))
    frames = [cv2.imread(str(p)) for p in paths]
    frames = [f for f in frames if f is not None]
    if not frames:
        raise RuntimeError(f"No readable images found in {FACE_DIR}")
    return frames


def report(label: str, timings: list[float]) -> None:
    n = len(timings)
    total = sum(timings)
    print(f"\n{label} ({n} frames)")
    print(f"  total : {total:.3f}s")
    print(f"  mean  : {statistics.mean(timings) * 1000:.2f}ms")
    print(f"  median: {statistics.median(timings) * 1000:.2f}ms")
    print(f"  min   : {min(timings) * 1000:.2f}ms")
    print(f"  max   : {max(timings) * 1000:.2f}ms")
    if n > 1:
        print(f"  stdev : {statistics.stdev(timings) * 1000:.2f}ms")
    print(f"  fps   : {n / total:.2f}")


def bench_detection(frames: list[np.ndarray]) -> None:
    timings = []
    for i in range(NUM_FRAMES):
        frame = frames[i % len(frames)]
        t = time.perf_counter()
        face_recognizer._det_model.detect(frame, max_num=0, metric="default")
        timings.append(time.perf_counter() - t)
    report("Detection only", timings)


def bench_recognition(frames: list[np.ndarray]) -> None:
    timings = []
    for i in range(NUM_FRAMES):
        frame = frames[i % len(frames)]
        bboxes, kpss = face_recognizer._det_model.detect(frame, max_num=0, metric="default")
        if bboxes.shape[0] == 0:
            continue
        face = Face(
            bbox=bboxes[0, 0:4],
            kps=kpss[0] if kpss is not None else None,
            det_score=bboxes[0, 4],
        )
        t = time.perf_counter()
        face_recognizer._rec_model.get(frame, face)
        timings.append(time.perf_counter() - t)
    report("Recognition only (forced every frame)", timings)


def bench_pipeline(frames: list[np.ndarray]) -> None:
    timings = []
    for i in range(NUM_FRAMES):
        frame = frames[i % len(frames)]
        t = time.perf_counter()
        recognize_faces(frame)
        timings.append(time.perf_counter() - t)
    report("Full pipeline (detect + track + recognize)", timings)


def main() -> None:
    frames = load_frames()
    print(f"Loaded {len(frames)} source images from {FACE_DIR}, cycling to {NUM_FRAMES} frames")
    bench_detection(frames)
    bench_recognition(frames)
    bench_pipeline(frames)


if __name__ == "__main__":
    main()
