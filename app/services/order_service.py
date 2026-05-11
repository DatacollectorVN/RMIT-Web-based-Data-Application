from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models.order import Order
from repositories import order_repo
from schemas.order import OrderCreate, OrderItemCreate, OrderItemUpdate, OrderUpdate


async def get_order(db: AsyncSession, order_id: int) -> Order:
    order = await order_repo.get_by_id(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


async def list_orders(
    db: AsyncSession,
    page: int,
    limit: int,
    user_id: int | None = None,
) -> tuple[list[Order], int]:
    return await order_repo.list_all(db, page, limit, user_id)


async def create_order(db: AsyncSession, data: OrderCreate) -> Order:
    return await order_repo.create(db, data)


async def update_order(db: AsyncSession, order_id: int, data: OrderUpdate) -> Order:
    order = await get_order(db, order_id)
    return await order_repo.update(db, order, data)


async def delete_order(db: AsyncSession, order_id: int) -> None:
    order = await get_order(db, order_id)
    await order_repo.delete(db, order)


# --- Order item sub-operations ---

async def add_order_item(db: AsyncSession, order_id: int, data: OrderItemCreate) -> Order:
    order = await get_order(db, order_id)
    return await order_repo.add_item(db, order, data)


async def update_order_item(
    db: AsyncSession, order_id: int, item_id: int, data: OrderItemUpdate
) -> Order:
    order = await get_order(db, order_id)
    item = await order_repo.get_item_by_id(db, item_id)
    if item is None or item.order_id != order_id:
        raise HTTPException(status_code=404, detail="Order item not found")
    return await order_repo.update_item(db, order, item, data)


async def delete_order_item(db: AsyncSession, order_id: int, item_id: int) -> Order:
    order = await get_order(db, order_id)
    item = await order_repo.get_item_by_id(db, item_id)
    if item is None or item.order_id != order_id:
        raise HTTPException(status_code=404, detail="Order item not found")
    return await order_repo.delete_item(db, order, item)
