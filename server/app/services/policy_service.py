import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Authority, Constraint, Mandate, Policy
from app.domain.compiler.compiler import (
    CompilationConflictError,
    CompiledAuthority,
    compile_authorities,
    to_utc_iso,
)
from app.opa_client import HttpOpaClient


class NoApprovedAuthoritiesError(Exception):
    pass


class PolicyNotFoundError(Exception):
    pass


class StaticValidationError(Exception):
    """spec 12.4 Stage 7. Raised when the compiled Rego bundle fails to
    load into OPA: compilation must fail closed, Policy stays draft."""


class BundleHashMismatchError(Exception):
    """spec 12.4 Stage 9 / 21.2 "OPA bundle substitution": the prior active
    Policy must remain active if the newly-activated bundle can't be
    confirmed loaded correctly."""


def compile_document(db: Session, document_id: uuid.UUID) -> Policy:
    """spec 12.4 Stage 6-8: compile -> static validation -> version
    assignment, as one call. Raises CompilationConflictError (caller should
    map to 422) or NoApprovedAuthoritiesError; neither leaves a Policy row
    behind, since a Policy only gets created once compilation actually
    succeeds and static validation passes.
    """
    approved = list(
        db.scalars(
            select(Authority).where(
                Authority.document_id == document_id, Authority.status == "approved"
            )
        )
    )
    if not approved:
        raise NoApprovedAuthoritiesError(str(document_id))

    compiled_authorities = [
        CompiledAuthority(
            id=str(a.id),
            principal_id=str(a.principal_id),
            scope=a.scope,
            limit_amount=float(a.limit_amount) if a.limit_amount is not None else None,
            currency=a.currency,
            conditions=a.conditions or [],
        )
        for a in approved
    ]

    # Computed up front (spec 12.4 Stage 8 assigns this at the end, but the
    # compiler needs it now to derive version-scoped Mandate ids; see
    # compile_authorities' docstring).
    next_version = (db.scalar(select(func.max(Policy.version))) or 0) + 1

    result = compile_authorities(
        compiled_authorities, policy_version=next_version
    )  # may raise CompilationConflictError

    # spec 12.4 Stage 7: static validation against a scratch OPA package
    # before this bundle is ever eligible for activation. The Rego's
    # `package` declaration (not just the module path) must be renamed
    # for this probe: OPA namespaces default-rule conflicts by package, so
    # validating under the real "payreality.authorization" package would
    # collide with whatever policy is currently active, breaking every
    # compile after the first activation.
    opa = HttpOpaClient()
    staging_id = uuid.uuid4().hex
    staging_package = f"payreality.staging_{staging_id}"
    staging_rego = re.sub(
        r"^package .+$", f"package {staging_package}", result.rego_source, count=1, flags=re.MULTILINE
    )
    try:
        opa.upload_policy(f"payreality_staging_{staging_id}", staging_rego)
    except Exception as e:
        raise StaticValidationError(str(e)) from e
    finally:
        try:
            import httpx

            httpx.delete(
                f"{opa.base_url}/v1/policies/payreality_staging_{staging_id}", timeout=5.0
            )
        except Exception:
            pass  # best-effort cleanup of the scratch module

    policy = Policy(
        version=next_version,
        status="compiled",
        bundle_hash=result.bundle_hash,
        bundle_uri=f"local:mandates_data:{result.bundle_hash}",
        compiled_at=datetime.now(timezone.utc),
    )
    db.add(policy)
    db.flush()

    for m in result.mandates:
        db.add(
            Mandate(
                id=m.id,
                policy_id=policy.id,
                authority_id=m.authority_id,
                principal_id=m.principal_id,
                scope=m.scope,
                max_amount=m.max_amount,
                currency=m.currency,
                review_threshold=m.review_threshold,
                valid_from=m.valid_from,
                valid_to=m.valid_to,
            )
        )
    for c in result.constraints:
        db.add(
            Constraint(id=c.id, mandate_id=c.mandate_id, type=c.type, value=c.value)
        )

    db.commit()
    db.refresh(policy)
    return policy


def _mandates_data_for_policy(db: Session, policy_id: uuid.UUID) -> list[dict]:
    mandates = list(db.scalars(select(Mandate).where(Mandate.policy_id == policy_id)))
    return [
        {
            "id": str(m.id),
            "principal_id": str(m.principal_id),
            "scope": m.scope,
            "max_amount": float(m.max_amount) if m.max_amount is not None else None,
            "currency": m.currency,
            "review_threshold": float(m.review_threshold)
            if m.review_threshold is not None
            else None,
            "valid_from": to_utc_iso(m.valid_from),
            "valid_to": to_utc_iso(m.valid_to),
        }
        for m in mandates
    ]


def activate_policy(db: Session, policy_id: uuid.UUID) -> Policy:
    """spec 12.4 Stage 9 + 14.3/14.4: activation is transactional: the
    prior active Policy is not retired until the new bundle is confirmed
    loaded. Reused verbatim for rollback (spec 14.4): reactivating a
    previously-retired version's id is the same operation."""
    policy = db.get(Policy, policy_id)
    if policy is None:
        raise PolicyNotFoundError(str(policy_id))

    # Recompile the Rego for this policy's mandates (deterministic given the
    # same mandates; see app.domain.compiler) and load it plus the mandate
    # data into OPA before touching any DB status.
    from app.domain.compiler.compiler import REGO_TEMPLATE

    opa = HttpOpaClient()
    mandates_data = _mandates_data_for_policy(db, policy_id)
    try:
        opa.upload_policy("authorization", REGO_TEMPLATE)
        opa.upload_data("mandates", mandates_data)
    except Exception as e:
        raise BundleHashMismatchError(str(e)) from e

    prior_active = db.scalar(select(Policy).where(Policy.status == "active"))
    if prior_active is not None and prior_active.id != policy.id:
        prior_active.status = "retired"
        prior_active.retired_at = datetime.now(timezone.utc)
        db.flush()

    policy.status = "active"
    policy.activated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(policy)
    return policy


def get_active_policy(db: Session) -> Policy | None:
    return db.scalar(select(Policy).where(Policy.status == "active"))


def list_policies(db: Session) -> list[Policy]:
    return list(db.scalars(select(Policy).order_by(Policy.version.desc())))
