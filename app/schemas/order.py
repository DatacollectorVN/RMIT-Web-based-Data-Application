from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, field_validator


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price: Decimal

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("quantity must be at least 1")
        return v

    @field_validator("unit_price")
    @classmethod
    def unit_price_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("unit_price must be greater than 0")
        return v


class OrderItemUpdate(BaseModel):
    quantity: int | None = None

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v: int | None) -> int | None:
        if v is not None and v < 1:
            raise ValueError("quantity must be at least 1")
        return v


class OrderItemResponse(BaseModel):
    id: int
    order_id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderCreate(BaseModel):
    user_id: int
    items: list[OrderItemCreate]

    @field_validator("items")
    @classmethod
    def items_not_empty(cls, v: list[OrderItemCreate]) -> list[OrderItemCreate]:
        if not v:
            raise ValueError("order must contain at least one item")
        return v


class OrderUpdate(BaseModel):
    status: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed = {"pending", "confirmed", "shipped", "delivered", "cancelled"}
        if v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v


class OrderResponse(BaseModel):
    id: int
    user_id: int
    total_amount: Decimal
    status: str
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse] = []

    model_config = {"from_attributes": True}


class OrderListResponse(BaseModel):
    total: int
    total_pages: int
    page: int
    limit: int
    items: list[OrderResponse]
