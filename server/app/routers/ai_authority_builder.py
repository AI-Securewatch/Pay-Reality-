import logging
import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import (
    AuthorityConflict,
    AuthorityCorpus,
    AuthorityGap,
    AuthorityOperation,
    AuthorityPrincipal,
    AuthorityQuestion,
    AuthorityRelationship,
    AuthorityResource,
)
from app.db.session import get_db
from app.domain.ai_authority_builder.claude_provider import ClaudeAuthorityGraphExtractionProvider
from app.domain.ai_authority_builder.fake_provider import FakeAuthorityGraphExtractionProvider
from app.domain.ai_policy_builder.text_extraction import UnsupportedFormatError, detect_format
from app.schemas.ai_authority_builder import (
    AnswerQuestionRequest,
    ConflictResponse,
    CorpusResponse,
    GapResponse,
    GraphSummaryResponse,
    OperationResponse,
    PrincipalResponse,
    ProviderStatusResponse,
    QuestionResponse,
    RelationshipResponse,
    ResourceResponse,
)
from app.security import verify_operator_key
from app.services import ai_authority_builder_service as svc
from app.services.ai_authority_builder_service import CorpusNotFoundError, QuestionNotFoundError

router = APIRouter(prefix="/v1/ai-authority-builder", tags=["ai-authority-builder"])


def _provider():
    if settings.anthropic_api_key:
        return ClaudeAuthorityGraphExtractionProvider()
    return FakeAuthorityGraphExtractionProvider()


def _corpus_to_response(corpus: AuthorityCorpus, document_count: int) -> CorpusResponse:
    return CorpusResponse(
        corpus_id=str(corpus.id),
        name=corpus.name,
        status=corpus.status,
        error=corpus.error,
        document_count=document_count,
        created_at=corpus.created_at,
    )


def _principal_to_response(p: AuthorityPrincipal) -> PrincipalResponse:
    return PrincipalResponse(
        id=str(p.id), name=p.name, role=p.role, reports_to=p.reports_to, confidence=p.confidence,
        source_excerpt=p.source_excerpt, source_location=p.source_location,
    )


def _resource_to_response(r: AuthorityResource) -> ResourceResponse:
    return ResourceResponse(
        id=str(r.id), name=r.name, description=r.description, confidence=r.confidence,
        source_excerpt=r.source_excerpt, source_location=r.source_location,
    )


def _operation_to_response(o: AuthorityOperation) -> OperationResponse:
    return OperationResponse(
        id=str(o.id), name=o.name, description=o.description, confidence=o.confidence,
        source_excerpt=o.source_excerpt, source_location=o.source_location,
    )


def _relationship_to_response(r: AuthorityRelationship) -> RelationshipResponse:
    return RelationshipResponse(
        id=str(r.id), kind=r.kind, from_principal=r.from_principal, to_principal=r.to_principal,
        description=r.description, confidence=r.confidence,
        source_excerpt=r.source_excerpt, source_location=r.source_location,
    )


def _conflict_to_response(c: AuthorityConflict) -> ConflictResponse:
    return ConflictResponse(id=str(c.id), description=c.description, reasoning=c.reasoning, confidence=c.confidence)


def _gap_to_response(g: AuthorityGap) -> GapResponse:
    return GapResponse(
        id=str(g.id), description=g.description, confidence=g.confidence,
        source_excerpt=g.source_excerpt, source_location=g.source_location,
    )


def _question_to_response(q: AuthorityQuestion) -> QuestionResponse:
    return QuestionResponse(id=str(q.id), question=q.question, context=q.context, answered=q.answered, answer=q.answer)


@router.get("/status", response_model=ProviderStatusResponse)
def get_status():
    """Whether this deployment currently has a real Anthropic key
    configured, so the frontend can be honest with users about whether
    they're looking at real extraction or illustrative sample output."""
    return ProviderStatusResponse(ai_enabled=bool(settings.anthropic_api_key))


@router.post("/corpora", response_model=CorpusResponse, status_code=201, dependencies=[Depends(verify_operator_key)])
async def create_corpus(files: list[UploadFile], name: str = Form(...), db: Session = Depends(get_db)):
    """AI_AUTHORITY_BUILDER_ARCHITECTURE.md: every file in `files` is
    treated as one Authority Corpus and analyzed together, never
    document-by-document. Extraction runs synchronously, the same
    choice every extraction pipeline in this platform already makes."""
    corpus = svc.create_corpus(db, name=name)

    documents = []
    for file in files:
        try:
            format = detect_format(file.filename or "", file.content_type)
        except UnsupportedFormatError:
            raise HTTPException(status_code=422, detail=f"unsupported_format: {file.filename}")
        raw = await file.read()
        documents.append(svc.add_document(db, corpus, filename=file.filename or "document", format=format, raw=raw))

    try:
        svc.run_extraction(db, corpus, documents, _provider())
    except Exception:
        logging.getLogger("payreality.ai_authority_builder").exception(
            "extraction_failed corpus_id=%s", corpus.id
        )

    return _corpus_to_response(corpus, len(documents))


@router.get("/corpora", response_model=list[CorpusResponse])
def list_corpora(db: Session = Depends(get_db)):
    return [_corpus_to_response(c, len(svc.list_documents(db, c.id))) for c in svc.list_corpora(db)]


@router.get("/corpora/{corpus_id}", response_model=CorpusResponse)
def get_corpus(corpus_id: uuid.UUID, db: Session = Depends(get_db)):
    try:
        corpus = svc.get_corpus(db, corpus_id)
    except CorpusNotFoundError:
        raise HTTPException(status_code=404, detail="corpus_not_found")
    return _corpus_to_response(corpus, len(svc.list_documents(db, corpus_id)))


@router.get("/corpora/{corpus_id}/summary", response_model=GraphSummaryResponse)
def get_summary(corpus_id: uuid.UUID, db: Session = Depends(get_db)):
    """Counts only, matching AI_AUTHORITY_BUILDER_ARCHITECTURE.md's own
    example. Runtime Policy candidates are counted via the AI Policy
    Builder's own list_candidates(corpus_id=...), not a duplicated
    query."""
    from app.services import ai_policy_builder_service as policy_svc

    return GraphSummaryResponse(
        policy_count=len(policy_svc.list_candidates(db, corpus_id=corpus_id)),
        principal_count=len(svc.list_principals(db, corpus_id)),
        resource_count=len(svc.list_resources(db, corpus_id)),
        operation_count=len(svc.list_operations(db, corpus_id)),
        relationship_count=len(svc.list_relationships(db, corpus_id)),
        conflict_count=len(svc.list_conflicts(db, corpus_id)),
        gap_count=len(svc.list_gaps(db, corpus_id)),
        question_count=len(svc.list_questions(db, corpus_id)),
    )


@router.get("/corpora/{corpus_id}/principals", response_model=list[PrincipalResponse])
def get_principals(corpus_id: uuid.UUID, db: Session = Depends(get_db)):
    return [_principal_to_response(p) for p in svc.list_principals(db, corpus_id)]


@router.get("/corpora/{corpus_id}/resources", response_model=list[ResourceResponse])
def get_resources(corpus_id: uuid.UUID, db: Session = Depends(get_db)):
    return [_resource_to_response(r) for r in svc.list_resources(db, corpus_id)]


@router.get("/corpora/{corpus_id}/operations", response_model=list[OperationResponse])
def get_operations(corpus_id: uuid.UUID, db: Session = Depends(get_db)):
    return [_operation_to_response(o) for o in svc.list_operations(db, corpus_id)]


@router.get("/corpora/{corpus_id}/relationships", response_model=list[RelationshipResponse])
def get_relationships(corpus_id: uuid.UUID, db: Session = Depends(get_db)):
    return [_relationship_to_response(r) for r in svc.list_relationships(db, corpus_id)]


@router.get("/corpora/{corpus_id}/conflicts", response_model=list[ConflictResponse])
def get_conflicts(corpus_id: uuid.UUID, db: Session = Depends(get_db)):
    return [_conflict_to_response(c) for c in svc.list_conflicts(db, corpus_id)]


@router.get("/corpora/{corpus_id}/gaps", response_model=list[GapResponse])
def get_gaps(corpus_id: uuid.UUID, db: Session = Depends(get_db)):
    return [_gap_to_response(g) for g in svc.list_gaps(db, corpus_id)]


@router.get("/corpora/{corpus_id}/questions", response_model=list[QuestionResponse])
def get_questions(corpus_id: uuid.UUID, db: Session = Depends(get_db)):
    return [_question_to_response(q) for q in svc.list_questions(db, corpus_id)]


@router.post(
    "/questions/{question_id}/answer",
    response_model=QuestionResponse,
    dependencies=[Depends(verify_operator_key)],
)
def answer_question(question_id: uuid.UUID, body: AnswerQuestionRequest, db: Session = Depends(get_db)):
    try:
        question = svc.answer_question(db, question_id, body.answer)
    except QuestionNotFoundError:
        raise HTTPException(status_code=404, detail="question_not_found")
    return _question_to_response(question)
