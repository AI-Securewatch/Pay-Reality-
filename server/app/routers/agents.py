from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.agent import AgentResponse, CreateAgentRequest
from app.security import verify_operator_key
from app.services import agent_service
from app.services.agent_service import PrincipalNotFoundError

router = APIRouter(prefix="/v1/agents", tags=["agents"])


def _to_response(agent, certificate=None) -> AgentResponse:
    return AgentResponse(
        id=agent.id,
        certificate_id=certificate.id if certificate else None,
        name=agent.name,
        acting_for_principal_id=agent.acting_for_principal_id,
        status=agent.status,
        owner=agent.owner,
        description=agent.description,
        created_at=agent.created_at,
    )


@router.post(
    "", response_model=AgentResponse, status_code=201, dependencies=[Depends(verify_operator_key)]
)
def create_agent(body: CreateAgentRequest, db: Session = Depends(get_db)):
    try:
        agent, certificate = agent_service.create_agent(
            db,
            name=body.name,
            acting_for_principal_id=body.acting_for_principal_id,
            public_key=body.public_key,
            owner=body.owner,
            description=body.description,
        )
    except PrincipalNotFoundError:
        raise HTTPException(status_code=404, detail="principal_not_found")
    return _to_response(agent, certificate)


@router.get("", response_model=list[AgentResponse])
def list_agents(db: Session = Depends(get_db)):
    return [_to_response(a, cert) for a, cert in agent_service.list_agents_with_active_certificate(db)]
