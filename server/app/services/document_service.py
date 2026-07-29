from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Document


def list_documents(db: Session) -> list[Document]:
    return list(db.scalars(select(Document)))
