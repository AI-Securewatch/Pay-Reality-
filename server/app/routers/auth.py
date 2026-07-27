from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Organization, User
from app.db.session import get_db
from app.dependencies import get_current_organization, get_current_user, require_permission
from app.domain.rbac.permissions import Permission, Role, permissions_for_role
from app.schemas.auth import CurrentUserResponse, LoginRequest, LoginResponse, SetupOwnerRequest
from app.services import auth_service

router = APIRouter(prefix="/v1/auth", tags=["auth"])


def _permissions_for(user: User) -> list[str]:
    try:
        return permissions_for_role(Role(user.role))
    except ValueError:
        return []


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate(db, body.email, body.password)
    if user is None:
        raise HTTPException(status_code=401, detail="invalid_credentials")

    organization = db.get(Organization, user.organization_id)
    session = auth_service.create_session(db, user, organization)
    return LoginResponse(
        token=str(session.id),
        expires_at=session.expires_at,
        user=CurrentUserResponse.from_model(user, _permissions_for(user)),
    )


@router.post("/logout", status_code=204)
def logout(authorization: str | None = Header(None), db: Session = Depends(get_db)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[len("bearer ") :].strip()
        if token:
            auth_service.revoke_session_for_token(db, token)
    return None


@router.get("/me", response_model=CurrentUserResponse)
def me(user: User = Depends(get_current_user)):
    return CurrentUserResponse.from_model(user, _permissions_for(user))


@router.post(
    "/setup-owner",
    response_model=CurrentUserResponse,
    dependencies=[Depends(require_permission(Permission.ORGANISATION_MANAGE))],
)
def setup_owner(
    body: SetupOwnerRequest,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    """The real fix for "how do I sign in if I never created an
    account": the bootstrapped Owner's password only ever existed as a
    one-time line in the deploy log (organization_service.py), with no
    self-service way to retrieve or reset it. Anyone who already holds
    the Operator Key -- which `require_permission` treats as a full
    Owner-equivalent bypass everywhere else in this platform -- can use
    that same trust to set the Owner's real email and password here,
    once, or again later if the password is ever lost. This is
    deliberately not a "create a brand new user" endpoint: it only ever
    updates the one bootstrapped Owner row, never creates a second one.
    """
    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="password_too_short")

    owner = db.scalar(
        select(User).where(User.organization_id == organization.id, User.role == Role.OWNER.value)
    )
    if owner is None:
        raise HTTPException(status_code=404, detail="owner_not_found")

    email_taken = db.scalar(
        select(User).where(
            User.organization_id == organization.id,
            User.email == body.email,
            User.id != owner.id,
        )
    )
    if email_taken is not None:
        raise HTTPException(status_code=409, detail="email_already_exists")

    owner.email = body.email
    owner.password_hash = auth_service.hash_password(body.password)
    owner.must_reset_password = False
    db.commit()
    db.refresh(owner)
    return CurrentUserResponse.from_model(owner, _permissions_for(owner))
