from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "buyer"

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed = {"buyer", "seller", "admin"}
        if v not in allowed:
            raise ValueError(f"role must be one of {allowed}")
        return v


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = None
    full_name: str | None = None
    role: str | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed = {"buyer", "seller", "admin"}
        if v not in allowed:
            raise ValueError(f"role must be one of {allowed}")
        return v


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
