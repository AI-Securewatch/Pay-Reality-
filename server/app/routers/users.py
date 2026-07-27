import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Organization, User
from app.db.session import get_db
from app.dependencies import get_current_organization, require_permission
from app.domain.rbac.permissions import Permission, Role
from app.schemas.users import (
    CreateUserRequest,
    CreateUserResponse,
    UpdateUserRoleRequest,
    UpdateUserStatusRequest,
    UserResponse,
)
from app.services import auth_service

router = APIRouter(
    prefix="/v1/users",
    tags=["users"],
    dependencies=[Depends(require_permission(Permission.USERS_MANAGE))],
)


@router.get("", response_model=list[UserResponse])
def list_users(
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    users = db.scalars(
        select(User).where(User.organization_id == organization.id).order_by(User.created_at)
    )
    return [UserResponse.from_model(u) for u in users]


@router.post("", response_model=CreateUserResponse, status_code=201)
def create_user(
    body: CreateUserRequest,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    try:
        Role(body.role)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_role")

    existing = db.scalar(
        select(User).where(User.organization_id == organization.id, User.email == body.email)
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="email_already_exists")

    temporary_password = secrets.token_urlsafe(12)
    user = User(
        organization_id=organization.id,
        email=body.email,
        name=body.name,
        password_hash=auth_service.hash_password(temporary_password),
        role=body.role,
        must_reset_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return CreateUserResponse(user=UserResponse.from_model(user), temporary_password=temporary_password)


def _get_org_user(db: Session, organization: Organization, user_id: UUID) -> User:
    user = db.get(User, user_id)
    if user is None or user.organization_id != organization.id:
        raise HTTPException(status_code=404, detail="user_not_found")
    return user


@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: UUID,
    body: UpdateUserRoleRequest,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    try:
        Role(body.role)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_role")

    user = _get_org_user(db, organization, user_id)
    user.role = body.role
    db.commit()
    db.refresh(user)
    return UserResponse.from_model(user)


@router.patch("/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: UUID,
    body: UpdateUserStatusRequest,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    if body.status not in ("active", "disabled"):
        raise HTTPException(status_code=422, detail="invalid_status")

    user = _get_org_user(db, organization, user_id)
    user.status = body.status
    db.commit()
    db.refresh(user)
    return UserResponse.from_model(user)
