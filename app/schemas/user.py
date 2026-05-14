from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


_ALLOWED_GENDERS = {"male", "female"}


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "buyer"
    location: str | None = None
    age: int | None = None
    job: str | None = None
    gender: str | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed = {"buyer", "admin"}
        if v not in allowed:
            raise ValueError(f"role must be one of {allowed}")
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str | None) -> str | None:
        if v is not None and v not in _ALLOWED_GENDERS:
            raise ValueError(f"gender must be one of {_ALLOWED_GENDERS}")
        return v


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = None
    full_name: str | None = None
    role: str | None = None
    location: str | None = None
    age: int | None = None
    job: str | None = None
    gender: str | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed = {"buyer", "admin"}
        if v not in allowed:
            raise ValueError(f"role must be one of {allowed}")
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str | None) -> str | None:
        if v is not None and v not in _ALLOWED_GENDERS:
            raise ValueError(f"gender must be one of {_ALLOWED_GENDERS}")
        return v


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    location: str | None = None
    age: int | None = None
    job: str | None = None
    gender: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
