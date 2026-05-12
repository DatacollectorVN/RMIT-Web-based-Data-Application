from datetime import datetime

from pydantic import BaseModel, field_validator


class ReviewCreate(BaseModel):
    user_id: int
    product_id: int
    title: str
    content: str
    rating: int

    @field_validator("rating")
    @classmethod
    def rating_in_range(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("rating must be between 1 and 5")
        return v


class ReviewUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    rating: int | None = None
    status: str | None = None

    @field_validator("rating")
    @classmethod
    def rating_in_range(cls, v: int | None) -> int | None:
        if v is not None and (v < 1 or v > 5):
            raise ValueError("rating must be between 1 and 5")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed = {"pending", "approved", "rejected"}
        if v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v


class ReviewResponse(BaseModel):
    id: int
    user_id: int
    user_name: str | None = None
    product_id: int
    title: str
    content: str
    rating: int
    status: str
    ai_label: bool | None
    final_label: bool | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReviewListResponse(BaseModel):
    total: int
    total_pages: int
    page: int
    limit: int
    items: list[ReviewResponse]
