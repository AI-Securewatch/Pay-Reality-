from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.agent import CreatePrincipalRequest, PrincipalResponse
from app.security import verify_operator_key
from app.services import agent_service

router = APIRouter(prefix="/v1/principals", tags=["principals"])


@router.post(
    "", response_model=PrincipalResponse, status_code=201, dependencies=[Depends(verify_operator_key)]
)
def create_principal(body: CreatePrincipalRequest, db: Session = Depends(get_db)):
    principal = agent_service.create_principal(db, name=body.name)
    return principal


@router.get("", response_model=list[PrincipalResponse])
def list_principals(db: Session = Depends(get_db)):
    return agent_service.list_principals(db)
