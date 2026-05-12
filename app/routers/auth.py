from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from repositories import user_repo
from services.user_service import _verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    """
    Verify email + password and return the user's id, name, and role.
    Returns 401 if credentials are invalid.
    """
    user = await user_repo.get_by_email(db, payload.email)
    if user is None or not _verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return LoginResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )
