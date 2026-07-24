import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Authority

KNOWN_CURRENCIES = frozenset({"USD", "EUR", "GBP", "CAD", "AUD", "JPY"})


class AuthorityNotFoundError(Exception):
    pass


class AuthorityNotPendingReviewError(Exception):
    pass


@dataclass(frozen=True)
class AuthorityWithFlags:
    authority: Authority
    validation_flags: list[str]


def _compute_flags(authority: Authority, all_pending: list[Authority]) -> list[str]:
    """spec 12.4 Stage 4: advisory flags shown to the reviewer, never used
    to auto-reject (spec 12.4 Stage 4's recovery strategy)."""
    flags: list[str] = []
    if authority.limit_amount is not None and authority.limit_amount < 0:
        flags.append("negative_amount")
    if authority.currency and authority.currency.upper() not in KNOWN_CURRENCIES:
        flags.append("unrecognized_currency")
    for other in all_pending:
        if other.id == authority.id:
            continue
        if (
            other.principal_id == authority.principal_id
            and other.scope == authority.scope
            and other.status == "approved"
        ):
            flags.append(f"duplicate_of:{other.id}")
    return flags


def list_authorities_for_review(
    db: Session, document_id: uuid.UUID | None = None, status: str | None = None
) -> list[AuthorityWithFlags]:
    stmt = select(Authority)
    if document_id is not None:
        stmt = stmt.where(Authority.document_id == document_id)
    if status is not None:
        stmt = stmt.where(Authority.status == status)
    authorities = list(db.scalars(stmt))

    # Flags are computed against all approved authorities system-wide, not
    # just the current filtered set, so duplicate detection works across
    # documents (spec 12.4 Stage 4's "unknown_principal"/"duplicate_of"
    # examples aren't scoped to a single document).
    all_approved = list(db.scalars(select(Authority).where(Authority.status == "approved")))

    return [
        AuthorityWithFlags(authority=a, validation_flags=_compute_flags(a, all_approved))
        for a in authorities
    ]


def approve_authority(
    db: Session,
    authority_id: uuid.UUID,
    reviewer_id: str,
    edits: dict | None = None,
) -> Authority:
    """spec 13.4: approval, with or without edits, is the only path to
    compilation eligibility. Edited values overwrite the fields used for
    compilation; extracted_* columns retain the original values untouched
    (spec 13.7's audit requirement)."""
    authority = db.get(Authority, authority_id)
    if authority is None:
        raise AuthorityNotFoundError(str(authority_id))
    if authority.status != "pending_review":
        raise AuthorityNotPendingReviewError(authority.status)

    if edits:
        for field in ("limit_amount", "currency", "conditions", "scope"):
            if field in edits:
                setattr(authority, field, edits[field])

    authority.status = "approved"
    authority.reviewer_id = reviewer_id
    from datetime import datetime, timezone

    authority.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(authority)
    return authority


def reject_authority(
    db: Session, authority_id: uuid.UUID, reviewer_id: str, rejection_reason: str
) -> Authority:
    """spec 13.5: rejected records are retained, never deleted, so the full
    extraction-to-disposition history stays reconstructable."""
    authority = db.get(Authority, authority_id)
    if authority is None:
        raise AuthorityNotFoundError(str(authority_id))
    if authority.status != "pending_review":
        raise AuthorityNotPendingReviewError(authority.status)

    authority.status = "rejected"
    authority.reviewer_id = reviewer_id
    authority.rejection_reason = rejection_reason
    from datetime import datetime, timezone

    authority.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(authority)
    return authority
