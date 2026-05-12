from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, computed_field, field_validator

from schemas.photo import PhotoResponse


class ProductCreate(BaseModel):
    brand: str
    name: str
    description: str
    price: Decimal
    category: str

    @field_validator("price")
    @classmethod
    def price_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("price must be greater than 0")
        return v


class ProductUpdate(BaseModel):
    brand: str | None = None
    name: str | None = None
    description: str | None = None
    price: Decimal | None = None
    category: str | None = None

    @field_validator("price")
    @classmethod
    def price_must_be_positive(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v <= 0:
            raise ValueError("price must be greater than 0")
        return v


class ProductSummaryResponse(BaseModel):
    """Product row only — used by GET /products list (no photos)."""

    id: int
    brand: str
    name: str
    description: str
    price: Decimal
    category: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductResponse(BaseModel):
    id: int
    brand: str
    name: str
    description: str
    price: Decimal
    category: str
    created_at: datetime
    updated_at: datetime
    photos: list[PhotoResponse] = Field(default_factory=list)
    review_count: int = 0
    avg_rating: float | None = None

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def photo_url(self) -> str:
        """URL of the best active photo (primary first), or empty string if none."""
        active = [p for p in self.photos if p.is_active]
        if not active:
            return ""
        best = sorted(active, key=lambda p: (not p.is_primary, p.sort_order, p.id))[0]
        return best.url or ""


class ProductListResponse(BaseModel):
    total: int
    total_pages: int
    page: int
    limit: int
    items: list[ProductSummaryResponse]
