from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db.models import Organization, User
from app.db.session import get_db
from app.dependencies import get_current_user
from app.domain.rbac.permissions import Role, permissions_for_role
from app.schemas.auth import CurrentUserResponse, LoginRequest, LoginResponse
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
