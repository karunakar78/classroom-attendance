# preprocessing.py
import cv2
import numpy as np

def enhance_frame(frame: np.ndarray) -> np.ndarray:
    """
    Mild bilateral denoise + CLAHE in LAB space. Denoising first keeps
    CLAHE from amplifying sensor noise in low light — boosting contrast
    on a noisy frame boosts the noise right along with the face detail.
    Bilateral (not fastNlMeans) because this has to run every frame.
    """
    denoised = cv2.bilateralFilter(frame, d=5, sigmaColor=50, sigmaSpace=50)

    lab = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)

    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    l = clahe.apply(l)

    enhanced = cv2.merge([l, a, b])
    return cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)    