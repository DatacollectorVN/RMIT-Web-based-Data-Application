import bcrypt
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from repositories import user_repo
from schemas.user import UserCreate, UserUpdate


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


async def get_user(db: AsyncSession, user_id: int) -> User:
    user = await user_repo.get_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


async def list_users(db: AsyncSession, page: int, limit: int) -> tuple[list[User], int]:
    return await user_repo.list_all(db, page, limit)


async def create_user(db: AsyncSession, data: UserCreate) -> User:
    existing = await user_repo.get_by_email(db, data.email)
    if existing is not None:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = _hash_password(data.password)
    return await user_repo.create(db, data, hashed)


async def update_user(db: AsyncSession, user_id: int, data: UserUpdate) -> User:
    user = await get_user(db, user_id)
    if data.email is not None:
        existing = await user_repo.get_by_email(db, data.email)
        if existing is not None and existing.id != user_id:
            raise HTTPException(status_code=400, detail="Email already in use")
    hashed = _hash_password(data.password) if data.password else None
    return await user_repo.update(db, user, data, hashed)


async def delete_user(db: AsyncSession, user_id: int) -> None:
    user = await get_user(db, user_id)
    await user_repo.delete(db, user)
