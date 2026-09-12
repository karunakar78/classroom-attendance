# Fallback passive liveness signal: whole-head micro-motion.
#
# Blink (blink.py) is the primary signal, but it's a brief, discrete event
# that faster sampling can still miss for a few seconds. This tracks the
# face box centre for sustained natural sway instead — cheap, and doesn't
# depend on catching a single instant.
#
# KNOWN VULNERABILITY (accepted, reported to the user): a printed photo or
# phone held in a human hand wobbles with the same tremor amplitude as a
# real head, since the same hand/wrist drives both. This signal cannot
# distinguish "a real head" from "a rigid photo in a shaking hand" — it
# was removed once already for exactly this reason, and is being
# reinstated deliberately as an accepted tradeoff to raise the recognition
# rate for distant/low-resolution faces where blink alone may never
# resolve. Report this limitation explicitly: a spoof attempt using a
# hand-held (not tripod-mounted/taped) photo or phone can pass via this
# signal alone.

from collections import deque

import numpy as np

WINDOW      = 20     # frames of recent box-centre history (a few seconds)
MIN_SAMPLES = 15     # require a fairly full window — natural sway shows up
                      # over ~1s+, not frame to frame
MIN_JITTER  = 0.006  # std-dev of box centre, normalised by face width,
                      # needed to call it "moving" rather than motionless


def _center_and_width(box: tuple[int, int, int, int]) -> tuple[float, float, float]:
    x1, y1, x2, y2 = box
    w = max(1, x2 - x1)
    return ((x1 + x2) / 2, (y1 + y2) / 2, w)


class MotionTracker:
    """
    Per-track fallback liveness detector. Feed it the face box every
    frame; once the box centre has shown natural, sustained jitter over a
    long-enough window (normalised by face size, so it's scale-
    independent), `confirmed` latches True for this instance's lifetime.
    """

    def __init__(self):
        self._samples: deque[tuple[float, float, float]] = deque(maxlen=WINDOW)
        self.confirmed = False

    def update(self, box: tuple[int, int, int, int]) -> bool:
        if self.confirmed:
            return True

        self._samples.append(_center_and_width(box))
        if len(self._samples) < MIN_SAMPLES:
            return False

        xs = np.array([s[0] for s in self._samples])
        ys = np.array([s[1] for s in self._samples])
        avg_w = float(np.mean([s[2] for s in self._samples]))
        if avg_w <= 0:
            return False

        jitter = (float(np.std(xs)) + float(np.std(ys))) / avg_w
        if jitter > MIN_JITTER:
            self.confirmed = True
        return self.confirmed
