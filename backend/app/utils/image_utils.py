import base64
import cv2
import numpy as np


def base64_to_image(base64_string: str):

    if not base64_string:
        return None

    try:

        if "," in base64_string:
            base64_string = base64_string.split(",")[1]

        image_data = base64.b64decode(
            base64_string
        )

        np_arr = np.frombuffer(
            image_data,
            np.uint8
        )

        if np_arr.size == 0:
            return None

        image = cv2.imdecode(
            np_arr,
            cv2.IMREAD_COLOR
        )

        return image

    except Exception as e:

        print("Image decode error:", e)

        return None