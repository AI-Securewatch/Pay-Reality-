import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Agent, Certificate, Principal


class PrincipalNotFoundError(Exception):
    pass


def create_principal(db: Session, name: str) -> Principal:
    principal = Principal(name=name)
    db.add(principal)
    db.commit()
    db.refresh(principal)
    return principal


def list_principals(db: Session) -> list[Principal]:
    return list(db.scalars(select(Principal)))


def create_agent(
    db: Session,
    name: str,
    acting_for_principal_id: uuid.UUID,
    public_key: str,
    owner: str | None = None,
    description: str | None = None,
) -> tuple[Agent, Certificate]:
    """spec 19.4 + 10.4 (Registration -> Activation): registering an Agent
    with a public key immediately provisions its first active Certificate --
    Phase 1 has no separate "certificate issuance" step since there's no
    interactive CSR flow yet, just a caller-supplied public key."""
    principal = db.get(Principal, acting_for_principal_id)
    if principal is None:
        raise PrincipalNotFoundError(str(acting_for_principal_id))

    agent = Agent(
        name=name,
        acting_for_principal_id=acting_for_principal_id,
        owner=owner,
        description=description,
        status="active",
    )
    db.add(agent)
    db.flush()  # assign agent.id without committing yet

    certificate = Certificate(agent_id=agent.id, public_key=public_key, status="active")
    db.add(certificate)
    db.commit()
    db.refresh(agent)
    db.refresh(certificate)
    return agent, certificate


def list_agents_with_active_certificate(db: Session) -> list[tuple[Agent, Certificate | None]]:
    """Each Agent paired with its active Certificate (spec 10.3: exactly one
    Certificate is active per Agent at a time) so callers -- e.g. the Live
    UI's agent-signing-key lookup -- always see a real certificate_id, not
    just at creation time."""
    agents = list(db.scalars(select(Agent)))
    certs_by_agent = {
        c.agent_id: c
        for c in db.scalars(select(Certificate).where(Certificate.status == "active"))
    }
    return [(a, certs_by_agent.get(a.id)) for a in agents]


def get_active_certificate(db: Session, certificate_id: uuid.UUID) -> Certificate | None:
    cert = db.get(Certificate, certificate_id)
    if cert is None or cert.status != "active":
        return None
    return cert
