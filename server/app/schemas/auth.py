from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class CurrentUserResponse(BaseModel):
    id: UUID
    organization_id: UUID
    email: str
    name: str
    role: str
    status: str
    mfa_enabled: bool
    must_reset_password: bool
    last_login_at: datetime | None
    permissions: list[str]

    @classmethod
    def from_model(cls, user, permissions: list[str]):
        return cls(
            id=user.id,
            organization_id=user.organization_id,
            email=user.email,
            name=user.name,
            role=user.role,
            status=user.status,
            mfa_enabled=user.mfa_enabled,
            must_reset_password=user.must_reset_password,
            last_login_at=user.last_login_at,
            permissions=permissions,
        )


class LoginResponse(BaseModel):
    token: str
    expires_at: datetime
    user: CurrentUserResponse


class SetupOwnerRequest(BaseModel):
    email: str
    password: str
