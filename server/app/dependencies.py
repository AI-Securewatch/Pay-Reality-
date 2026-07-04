import uuid

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.models import Agent
from app.db.session import get_db
from app.domain.auth.signature import verify_request_signature
from app.services import agent_service


async def verify_agent_signature(
    request: Request,
    x_payreality_key_id: str = Header(...),
    x_payreality_signature: str = Header(...),
    db: Session = Depends(get_db),
) -> Agent:
    """spec Section 19 / 21.2: every Intent submission must be signed by the
    Agent's active Certificate over the raw request body. Returns the
    resolved Agent so route handlers never see an unauthenticated request."""
    try:
        certificate_id = uuid.UUID(x_payreality_key_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="invalid_key_id")

    certificate = agent_service.get_active_certificate(db, certificate_id)
    if certificate is None:
        raise HTTPException(status_code=401, detail="unknown_or_inactive_certificate")

    body = await request.body()
    if not verify_request_signature(body, x_payreality_signature, certificate.public_key):
        raise HTTPException(status_code=401, detail="invalid_signature")

    agent = db.get(Agent, certificate.agent_id)
    if agent is None:
        raise HTTPException(status_code=401, detail="agent_not_found")
    return agent
