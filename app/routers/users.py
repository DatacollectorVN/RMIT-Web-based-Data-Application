import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.user import UserCreate, UserResponse, UserUpdate
from services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/")
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    users, total = await user_service.list_users(db, page, limit)
    return {
        "data": {
            "total": total,
            "total_pages": math.ceil(total / limit),
            "page": page,
            "limit": limit,
            "items": [UserResponse.model_validate(u) for u in users],
        }
    }


@router.get("/{user_id}")
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user = await user_service.get_user(db, user_id)
    return {"data": UserResponse.model_validate(user)}


@router.post("/", status_code=201)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user = await user_service.create_user(db, body)
    return {"data": UserResponse.model_validate(user)}


@router.patch("/{user_id}")
async def update_user(
    user_id: int,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user = await user_service.update_user(db, user_id, body)
    return {"data": UserResponse.model_validate(user)}


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await user_service.delete_user(db, user_id)
    return {"data": {"deleted": True, "id": user_id}}
