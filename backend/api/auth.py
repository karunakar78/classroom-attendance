from fastapi import APIRouter, HTTPException, status
from database.schemas import LoginRequest, TokenResponse
from utils.auth import verify_password, create_access_token, ADMIN_USERNAME, ADMIN_PASSWORD_HASH

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest):
    if data.username != ADMIN_USERNAME:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(data.password, ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": data.username})
    return TokenResponse(access_token=token)