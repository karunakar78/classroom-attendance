from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.utils.image_utils import (
    base64_to_image
)

from app.services.face_recognizer import (
    recognize_faces
)

router = APIRouter()


class FrameRequest(BaseModel):
    image: str

frame_counter = 0

previous_result = {
    "faces": []
}
@router.post("/recognition/frame")
async def process_frame(
    request: FrameRequest
):

    frame = base64_to_image(
        request.image
    )

    if frame is None:

        raise HTTPException(
            status_code=400,
            detail="Invalid image data"
        )

    result = recognize_faces(frame)

    return result