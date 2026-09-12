# Fallback passive liveness signal: eye/gaze movement.
#
# InsightFace's 106-point model gives eye CONTOUR points (used for blink
# in blink.py) but no dedicated pupil/iris landmark, so gaze tracking here
# is done with a small classical-CV step: threshold each eye crop for its
# darkest blob (the pupil/iris) and take its centroid, normalised to the
# eye's own bounding box — i.e. position WITHIN the eye socket, not
# position in the frame.
#
# That relative framing is the point: a rigid printed photo or phone
# screen can be translated, rotated, or shaken by hand, but its printed
# pupil never moves relative to its own printed eye corners — the whole
# eye region moves together as one rigid pattern. So unlike whole-face
# motion (motion.py), a genuine shift in normalised pupil position is
# actual evidence of an eye independently moving inside a socket, not
# just the object holding it being jostled.
#
# CAVEAT (report to the user): this needs the eye crop to contain enough
# real pixels to localise a pupil-sized dark blob — a harder resolution
# requirement than blink, which only needs to see the eyelid's overall
# shape collapse. At classroom/CCTV distance this may never resolve; it
# degrades to "never confirms" rather than confirming incorrectly (see
# MIN_EYE_PX), so it's a safe no-op rather than a false pass when the eye
# is too small — but it also means it won't rescue recognition for very
# distant faces the way head motion (motion.py) more crudely can.

from collections import deque

import cv2
import numpy as np

from .blink import LEFT_EYE_IDX, RIGHT_EYE_IDX

MIN_EYE_PX  = 6      # minimum eye crop width/height (px) to even attempt this
WINDOW      = 20     # frames of recent pupil-position history
MIN_SAMPLES = 8       # frames needed before judging movement
MOVE_RATIO  = 0.12   # combined x+y spread (fraction of eye box) to count as movement


def _pupil_relative_pos(frame: np.ndarray, eye_pts: np.ndarray):
    """
    Return the pupil's (x, y) position normalised to [0, 1] within its own
    eye's bounding box, or None if the crop is too small/degenerate to
    trust.
    """
    x1, y1 = float(eye_pts[:, 0].min()), float(eye_pts[:, 1].min())
    x2, y2 = float(eye_pts[:, 0].max()), float(eye_pts[:, 1].max())
    w, h = x2 - x1, y2 - y1
    if w < MIN_EYE_PX or h < MIN_EYE_PX:
        return None

    crop = frame[int(y1):int(y2), int(x1):int(x2)]
    if crop.size == 0:
        return None
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if crop.ndim == 3 else crop

    try:
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    except cv2.error:
        return None

    m = cv2.moments(thresh)
    if m["m00"] == 0:
        return None

    return (float(m["m10"] / m["m00"]) / w, float(m["m01"] / m["m00"]) / h)


def eye_gaze_positions(frame: np.ndarray, landmarks_106: np.ndarray):
    """Return (left_eye_pos, right_eye_pos), each either a normalised (x, y) or None."""
    left  = _pupil_relative_pos(frame, landmarks_106[LEFT_EYE_IDX])
    right = _pupil_relative_pos(frame, landmarks_106[RIGHT_EYE_IDX])
    return left, right


class GazeTracker:
    """
    Per-track fallback liveness detector. Feed it (left, right) normalised
    pupil positions every frame; once either eye has shown its pupil move
    meaningfully within its own socket, `confirmed` latches True.
    """

    def __init__(self):
        self._left: deque[tuple[float, float]]  = deque(maxlen=WINDOW)
        self._right: deque[tuple[float, float]] = deque(maxlen=WINDOW)
        self.confirmed = False

    @staticmethod
    def _has_moved(buf: deque) -> bool:
        if len(buf) < MIN_SAMPLES:
            return False
        xs = [p[0] for p in buf]
        ys = [p[1] for p in buf]
        spread = (max(xs) - min(xs)) + (max(ys) - min(ys))
        return spread > MOVE_RATIO

    def update(self, left_pos, right_pos) -> bool:
        if self.confirmed:
            return True

        if left_pos is not None:
            self._left.append(left_pos)
        if right_pos is not None:
            self._right.append(right_pos)

        if self._has_moved(self._left) or self._has_moved(self._right):
            self.confirmed = True
        return self.confirmed
