import io
import uuid

from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Authority, Document, Principal
from app.domain.extraction.provider import ExtractionProvider


def _extract_text_by_page(pdf_bytes: bytes) -> list[str]:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    return [page.extract_text() or "" for page in reader.pages]


def store_document(db: Session, name: str, pdf_bytes: bytes) -> Document:
    """spec 12.4 Stage 1: store the byte-identical artifact, never
    transformed. Returns a Document row with status=extraction_pending;
    extraction happens as a separate step (run_extraction) so an upload
    always succeeds/fails independently of the (possibly flaky) model call.
    """
    document = Document(
        id=uuid.uuid4(),
        name=name,
        content=pdf_bytes,
        status="extraction_pending",
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def _find_or_create_principal(db: Session, name: str, document_id: uuid.UUID) -> Principal:
    """spec 8.2 Principal lifecycle: "Created when a DoA document is
    onboarded and a named role/individual is identified." Matched by exact
    name; Phase 1 has no principal-merging/fuzzy-matching UI."""
    existing = db.scalar(select(Principal).where(Principal.name == name))
    if existing is not None:
        return existing
    principal = Principal(name=name, source_document_id=document_id)
    db.add(principal)
    db.flush()
    return principal


def run_extraction(db: Session, document: Document, provider: ExtractionProvider) -> Document:
    """spec 12.4 Stage 2+3. On any failure, the document transitions to
    extraction_failed and the caller may retry without re-uploading (spec
    12.4 Stage 2's recovery strategy); callers should not let an exception
    here propagate as a 500 without first persisting that transition."""
    try:
        pages = _extract_text_by_page(document.content)
        candidates = provider.extract(pages)
    except Exception:
        document.status = "extraction_failed"
        db.commit()
        raise

    for candidate in candidates:
        principal = _find_or_create_principal(db, candidate.principal_name, document.id)
        authority = Authority(
            document_id=document.id,
            principal_id=principal.id,
            scope=candidate.scope,
            limit_amount=candidate.limit_amount,
            currency=candidate.currency,
            conditions=candidate.conditions,
            source_excerpt=candidate.source_excerpt,
            source_page=candidate.source_page,
            status="pending_review",
            extracted_limit_amount=candidate.limit_amount,
            extracted_currency=candidate.currency,
            extracted_conditions=candidate.conditions,
        )
        db.add(authority)

    # spec 12.4 Stage 2 recovery: zero extractable claims is a valid, not an
    # error, outcome.
    document.status = "extracted"
    db.commit()
    db.refresh(document)
    return document


def get_document(db: Session, document_id: uuid.UUID) -> Document | None:
    return db.get(Document, document_id)


def list_documents(db: Session) -> list[Document]:
    return list(db.scalars(select(Document)))
