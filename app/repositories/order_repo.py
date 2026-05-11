from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.order import Order, OrderItem
from schemas.order import OrderCreate, OrderItemCreate, OrderItemUpdate, OrderUpdate


async def get_by_id(db: AsyncSession, order_id: int) -> Order | None:
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    return result.scalar_one_or_none()


async def list_all(
    db: AsyncSession,
    page: int,
    limit: int,
    user_id: int | None = None,
) -> tuple[list[Order], int]:
    offset = (page - 1) * limit
    query = select(Order).options(selectinload(Order.items))
    count_query = select(func.count()).select_from(Order)

    if user_id is not None:
        query = query.where(Order.user_id == user_id)
        count_query = count_query.where(Order.user_id == user_id)

    count_result = await db.execute(count_query)
    total = count_result.scalar_one()
    result = await db.execute(query.order_by(Order.id).offset(offset).limit(limit))
    return list(result.scalars().all()), total


async def create(db: AsyncSession, data: OrderCreate) -> Order:
    total_amount = sum(
        item.unit_price * item.quantity for item in data.items
    )
    order = Order(
        user_id=data.user_id,
        total_amount=total_amount,
        status="pending",
    )
    db.add(order)
    await db.flush()  # Get order.id before creating items

    for item_data in data.items:
        item = OrderItem(
            order_id=order.id,
            product_id=item_data.product_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
        )
        db.add(item)

    await db.commit()
    return await get_by_id(db, order.id)  # type: ignore[return-value]


async def update(db: AsyncSession, order: Order, data: OrderUpdate) -> Order:
    if data.status is not None:
        order.status = data.status
    await db.commit()
    await db.refresh(order)
    return await get_by_id(db, order.id)  # type: ignore[return-value]


async def delete(db: AsyncSession, order: Order) -> None:
    await db.delete(order)
    await db.commit()


# --- Order item sub-operations ---

async def get_item_by_id(db: AsyncSession, item_id: int) -> OrderItem | None:
    result = await db.execute(select(OrderItem).where(OrderItem.id == item_id))
    return result.scalar_one_or_none()


async def add_item(db: AsyncSession, order: Order, data: OrderItemCreate) -> Order:
    item = OrderItem(
        order_id=order.id,
        product_id=data.product_id,
        quantity=data.quantity,
        unit_price=data.unit_price,
    )
    db.add(item)
    await db.flush()

    # Recalculate total_amount from all items
    await db.refresh(order, attribute_names=["items"])
    order.total_amount = Decimal(
        sum(i.unit_price * i.quantity for i in order.items)
    )
    await db.commit()
    return await get_by_id(db, order.id)  # type: ignore[return-value]


async def update_item(db: AsyncSession, order: Order, item: OrderItem, data: OrderItemUpdate) -> Order:
    if data.quantity is not None:
        item.quantity = data.quantity
    await db.flush()

    await db.refresh(order, attribute_names=["items"])
    order.total_amount = Decimal(
        sum(i.unit_price * i.quantity for i in order.items)
    )
    await db.commit()
    return await get_by_id(db, order.id)  # type: ignore[return-value]


async def delete_item(db: AsyncSession, order: Order, item: OrderItem) -> Order:
    await db.delete(item)
    await db.flush()

    await db.refresh(order, attribute_names=["items"])
    order.total_amount = Decimal(
        sum(i.unit_price * i.quantity for i in order.items)
    )
    await db.commit()
    return await get_by_id(db, order.id)  # type: ignore[return-value]
