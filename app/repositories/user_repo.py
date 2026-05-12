from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from schemas.user import UserCreate, UserUpdate


async def get_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def list_all(db: AsyncSession, page: int, limit: int) -> tuple[list[User], int]:
    offset = (page - 1) * limit
    count_result = await db.execute(select(func.count()).select_from(User))
    total = count_result.scalar_one()
    result = await db.execute(select(User).order_by(User.id).offset(offset).limit(limit))
    return list(result.scalars().all()), total


async def create(db: AsyncSession, data: UserCreate, password_hash: str) -> User:
    user = User(
        email=data.email,
        password_hash=password_hash,
        full_name=data.full_name,
        role=data.role,
        location=data.location,
        age=data.age,
        job=data.job,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update(db: AsyncSession, user: User, data: UserUpdate, password_hash: str | None = None) -> User:
    if data.email is not None:
        user.email = data.email
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role is not None:
        user.role = data.role
    if data.location is not None:
        user.location = data.location
    if data.age is not None:
        user.age = data.age
    if data.job is not None:
        user.job = data.job
    if password_hash is not None:
        user.password_hash = password_hash
    await db.commit()
    await db.refresh(user)
    return user


async def delete(db: AsyncSession, user: User) -> None:
    await db.delete(user)
    await db.commit()
