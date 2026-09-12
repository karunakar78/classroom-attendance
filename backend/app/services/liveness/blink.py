# Active liveness via blink detection on InsightFace's 106-point 2D
# landmarks (already bundled with the buffalo_l pack, just not enabled by
# default). A blink is a much more reliable "is this a real person" signal
# across arbitrary camera angles/lighting than a pretrained anti-spoofing
# CNN — it's a plain geometric measurement, and it's passive: people blink
# involuntarily every few seconds, so no on-screen prompt is needed.
#
# Landmark index groups (see the 106pt markup at
# https://github.com/nttstar/insightface-resources/blob/master/alignment/images/2d106markup.jpg):
#   left eye  -> points 33-42
#   right eye -> points 87-96

import statistics
from collections import deque

import numpy as np

LEFT_EYE_IDX  = list(range(33, 43))
RIGHT_EYE_IDX = list(range(87, 97))

# A fixed absolute threshold doesn't hold up in practice: measured on a
# single formal photo, open eyes came back ~0.33, but live tracking across
# different head poses/angles/camera positions produced values anywhere
# from ~0.2 to ~1.5 for eyes that were plainly open the whole time — head
# roll and yaw change the eye contour's on-screen aspect ratio far more
# than a fixed threshold can absorb. So instead of comparing to a global
# constant, BlinkTracker compares each frame to that same track's own
# recent baseline — a blink is a large *relative* drop-then-recovery,
# whatever the absolute scale happens to be for this person/pose.
#
# The baseline is a MEDIAN of recent samples, not a max/peak: live capture
# also throws the occasional wild outlier read (e.g. a landmark glitch
# reporting eye-taller-than-wide, ratio > 1) and a max-based baseline gets
# permanently skewed by a single such spike, making recovery unreachable
# for the rest of the window. The median shrugs off one-off outliers.
BASELINE_WINDOW = 20    # frames of recent history used as the "open" reference
MIN_SAMPLES     = 8     # frames needed before a baseline is trustworthy — a
                         # too-small window lets the very dip we're trying to
                         # detect drag its own reference baseline down with it
# DIP_RATIO started at 0.6, but live testing showed a real blink often
# doesn't collapse the measured ratio that far — a genuine blink is brief
# (~100-200ms) relative to the ~300ms frame-capture interval, so most
# samples land mid-closure rather than fully closed. Loosened to 0.75 so a
# partial closure still counts; RECOVER_RATIO stays comfortably below that
# so the two thresholds don't collide.
DIP_RATIO       = 0.75  # eyes must shrink below 75% of the recent baseline to count as closing
RECOVER_RATIO   = 0.85  # must climb back above 85% of the recent baseline to count as reopened


def eye_openness(landmarks_106: np.ndarray) -> float:
    """
    Average, per-eye, of (vertical extent / horizontal extent) across each
    eye's 10 contour points. Larger while open, collapses toward 0 when
    closed. Not the classic 6-point EAR formula, but the same idea, sized
    for the points this model actually gives us. The absolute scale isn't
    meaningful across tracks/poses — see BlinkTracker.
    """
    def ratio(idx: list[int]) -> float:
        pts = landmarks_106[idx]
        w = pts[:, 0].max() - pts[:, 0].min()
        h = pts[:, 1].max() - pts[:, 1].min()
        return float(h / w) if w > 0 else 0.0

    return (ratio(LEFT_EYE_IDX) + ratio(RIGHT_EYE_IDX)) / 2


class BlinkTracker:
    """
    Per-track blink detector. Feed it one eye-openness ratio per frame;
    once it has seen a relative dip-then-recovery against its own recent
    baseline, `confirmed` latches True for the lifetime of this instance
    (mirrors how identity locks in face_recognizer.py once confidence
    clears the bar).
    """

    def __init__(self):
        self._recent = deque(maxlen=BASELINE_WINDOW)
        self._seen_dip = False
        self.confirmed = False

    def update(self, ear: float) -> bool:
        if self.confirmed:
            return True

        # Baseline comes from history strictly BEFORE this sample — folding
        # the current reading into its own reference window would let a
        # real dip (or a run of low noise) drag the baseline down with it,
        # masking the very thing we're trying to detect.
        if len(self._recent) >= MIN_SAMPLES:
            baseline = statistics.median(self._recent)
            if baseline > 0:
                if ear < baseline * DIP_RATIO:
                    self._seen_dip = True
                elif ear > baseline * RECOVER_RATIO and self._seen_dip:
                    self.confirmed = True

        self._recent.append(ear)
        return self.confirmed
