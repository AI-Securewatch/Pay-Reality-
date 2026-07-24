from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

# connect_timeout bounds how long a connection attempt can hang before
# failing: without it, a database that's down or unreachable (not just
# rejecting connections) can make every request, including /health/ready,
# hang indefinitely instead of failing fast.
engine = create_engine(
    settings.database_url,
    future=True,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 5},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
