from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Policy


def list_policies(db: Session) -> list[Policy]:
    return list(db.scalars(select(Policy).order_by(Policy.version.desc())))
