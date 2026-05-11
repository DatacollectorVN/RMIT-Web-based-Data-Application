from datetime import datetime

from pydantic import BaseModel


class PhotoCreate(BaseModel):
    """Used internally; url is derived from the saved file path, not supplied by the caller."""
    is_primary: bool = False
    sort_order: int = 0
    is_active: bool = True


class PhotoUpdate(BaseModel):
    is_primary: bool | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class PhotoResponse(BaseModel):
    id: int
    product_id: int
    url: str
    is_primary: bool
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
