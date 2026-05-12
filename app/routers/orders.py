import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.order import OrderCreate, OrderItemCreate, OrderItemUpdate, OrderResponse, OrderUpdate
from services import order_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/")
async def list_orders(
    user_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    orders, total = await order_service.list_orders(db, page, limit, user_id)
    return {
        "data": {
            "total": total,
            "total_pages": math.ceil(total / limit),
            "page": page,
            "limit": limit,
            "items": [OrderResponse.model_validate(o) for o in orders],
        }
    }


@router.get("/{order_id}")
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    order = await order_service.get_order(db, order_id)
    return {"data": OrderResponse.model_validate(order)}


@router.post("/", status_code=201)
async def create_order(
    body: OrderCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    order = await order_service.create_order(db, body)
    return {"data": OrderResponse.model_validate(order)}


@router.patch("/{order_id}")
async def update_order(
    order_id: int,
    body: OrderUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    order = await order_service.update_order(db, order_id, body)
    return {"data": OrderResponse.model_validate(order)}


@router.delete("/{order_id}")
async def delete_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await order_service.delete_order(db, order_id)
    return {"data": {"deleted": True, "id": order_id}}


# --- Order item sub-routes ---

@router.post("/{order_id}/items", status_code=201)
async def add_order_item(
    order_id: int,
    body: OrderItemCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    order = await order_service.add_order_item(db, order_id, body)
    return {"data": OrderResponse.model_validate(order)}


@router.patch("/{order_id}/items/{item_id}")
async def update_order_item(
    order_id: int,
    item_id: int,
    body: OrderItemUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    order = await order_service.update_order_item(db, order_id, item_id, body)
    return {"data": OrderResponse.model_validate(order)}


@router.delete("/{order_id}/items/{item_id}")
async def delete_order_item(
    order_id: int,
    item_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    order = await order_service.delete_order_item(db, order_id, item_id)
    return {"data": OrderResponse.model_validate(order)}
