from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    role: str
    status: str
    mfa_enabled: bool
    last_login_at: datetime | None
    created_at: datetime

    @classmethod
    def from_model(cls, user):
        return cls(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            status=user.status,
            mfa_enabled=user.mfa_enabled,
            last_login_at=user.last_login_at,
            created_at=user.created_at,
        )


class CreateUserRequest(BaseModel):
    email: str
    name: str
    role: str


class CreateUserResponse(BaseModel):
    user: UserResponse
    # Shown exactly once, at creation time, the same way the Organisation
    # Owner bootstrap's password is logged once: there is no email
    # delivery in this platform yet (see Notifications in
    # ORGANISATION_SETTINGS.md), so this response is the real, disclosed
    # way an Owner hands a new teammate their first credential today.
    temporary_password: str


class UpdateUserRoleRequest(BaseModel):
    role: str


class UpdateUserStatusRequest(BaseModel):
    status: str
