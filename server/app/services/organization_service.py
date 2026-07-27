"""Organisation Settings and the Organisation Owner bootstrap.

`ensure_owner_bootstrapped` follows the same "startup hook + idempotent
registration" pattern already used for evidence-key rotation
(`signing_key_service.ensure_current_key_registered`, called from
main.py's lifespan): on every boot, create the one Organisation and its
Owner user if they don't exist yet, and do nothing if they already do.
This is additive -- the existing shared operator key keeps working
completely unchanged; this just gives the platform a first real human
identity to log in as.
"""

import logging
import secrets
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import Organization, User
from app.domain.rbac.permissions import Role
from app.services import auth_service

logger = logging.getLogger("payreality.organization")


def ensure_owner_bootstrapped(db: Session) -> None:
    organization = db.scalar(select(Organization).order_by(Organization.created_at).limit(1))
    if organization is None:
        organization = Organization(name=settings.organization_name)
        db.add(organization)
        db.flush()
        logger.info("organisation_bootstrapped name=%s", organization.name)

    existing_owner = db.scalar(
        select(User).where(
            User.organization_id == organization.id,
            User.role == Role.OWNER.value,
        )
    )
    if existing_owner is not None:
        db.commit()
        return

    password = secrets.token_urlsafe(18)
    owner = User(
        organization_id=organization.id,
        email=settings.owner_email,
        name="Organisation Owner",
        password_hash=auth_service.hash_password(password),
        role=Role.OWNER.value,
        must_reset_password=True,
    )
    db.add(owner)
    db.commit()
    # Logged ONCE, at the moment this row is created -- every subsequent
    # boot finds existing_owner above and returns before reaching here.
    # There is no other channel to deliver this credential yet (no email
    # delivery exists, see NOTIFICATIONS in ORGANISATION_SETTINGS.md), so
    # the deploy log is the real, disclosed retrieval path for now.
    logger.warning(
        "organisation_owner_bootstrapped email=%s password=%s "
        "-- shown ONCE, never logged again. Store it now; "
        "must_reset_password is set so this forces a change on first login.",
        settings.owner_email,
        password,
    )


def get_settings(organization: Organization) -> dict:
    return {
        "name": organization.name,
        "logo_url": organization.logo_url,
        "timezone": organization.timezone,
        "default_currency": organization.default_currency,
        "default_language": organization.default_language,
        **organization.settings,
    }


_ORGANIZATION_COLUMNS = {"name", "logo_url", "timezone", "default_currency", "default_language"}


def update_settings(db: Session, organization: Organization, updates: dict) -> Organization:
    """Fields with their own column get set directly; everything else
    (Security/Runtime Authority/Notifications/Audit tab fields) is merged
    into the JSONB settings blob, never overwritten wholesale, so
    updating one tab's fields never clobbers another's."""
    merged_extra = dict(organization.settings)
    for key, value in updates.items():
        if key in _ORGANIZATION_COLUMNS:
            setattr(organization, key, value)
        else:
            merged_extra[key] = value
    organization.settings = merged_extra
    organization.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(organization)
    return organization


def get_integrations_status() -> dict:
    """Real state only. Azure OpenAI and AWS Bedrock have zero integration
    code in this codebase today -- reporting them as "configuration
    required" (never "connected") is the honest status until an adapter
    for either actually exists."""
    return {
        "anthropic": "connected" if settings.anthropic_api_key else "configuration_required",
        "azure_openai": "configuration_required",
        "aws_bedrock": "configuration_required",
        "opa": "connected" if _opa_reachable() else "disconnected",
        "postgresql": "connected" if _database_reachable() else "disconnected",
    }


def _database_reachable() -> bool:
    from sqlalchemy import text

    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
    finally:
        db.close()


def _opa_reachable() -> bool:
    from app.opa_client import HttpOpaClient

    try:
        return HttpOpaClient().health()
    except Exception:
        return False


def get_health_status() -> dict:
    """Reuses the same live checks as /health/ready rather than a second,
    independent notion of "healthy" -- Runtime Authority and the Evidence
    Engine have no separate health probe of their own (they're this
    process, backed by this database), so their status is honestly
    derived from the database check, not fabricated separately. The
    Compiler is a pure in-process module with no external dependency, so
    it has no failure mode a health check could observe here."""
    database_ok = _database_reachable()
    opa_ok = _opa_reachable()
    anthropic_configured = bool(settings.anthropic_api_key)

    return {
        "runtime_authority": "healthy" if database_ok else "offline",
        "evidence_engine": "healthy" if database_ok else "offline",
        "opa": "healthy" if opa_ok else "offline",
        "compiler": "healthy",
        "database": "healthy" if database_ok else "offline",
        "anthropic": "healthy" if anthropic_configured else "warning",
    }
