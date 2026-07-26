"""AI Authority Builder's service layer
(AI_AUTHORITY_BUILDER_ARCHITECTURE.md): corpus storage, extraction
orchestration across an Authority Graph's eight categories, and
per-category listing/answering. Runtime Policy candidates reuse
services/ai_policy_builder_service.py's promote_candidate,
dismiss_candidate, edit_candidate, and get_candidate completely
unmodified: this module never duplicates that logic, only stores
corpus-derived candidates in the same table those functions already
operate on.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import (
    AuthorityConflict,
    AuthorityCorpus,
    AuthorityCorpusDocument,
    AuthorityGap,
    AuthorityOperation,
    AuthorityPrincipal,
    AuthorityQuestion,
    AuthorityRelationship,
    AuthorityResource,
    PolicyExtractionCandidate,
)
from app.domain.ai_authority_builder.provider import AuthorityGraph, AuthorityGraphExtractionProvider
from app.domain.ai_policy_builder.text_extraction import extract_text
from app.services.ai_policy_builder_service import candidate_to_content


class CorpusNotFoundError(Exception):
    pass


class QuestionNotFoundError(Exception):
    pass


def create_corpus(db: Session, name: str) -> AuthorityCorpus:
    corpus = AuthorityCorpus(id=uuid.uuid4(), name=name, status="uploaded")
    db.add(corpus)
    db.commit()
    db.refresh(corpus)
    return corpus


def add_document(db: Session, corpus: AuthorityCorpus, filename: str, format: str, raw: bytes) -> AuthorityCorpusDocument:
    doc = AuthorityCorpusDocument(
        id=uuid.uuid4(), corpus_id=corpus.id, filename=filename, format=format, content=raw
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def build_corpus_text(documents: list[AuthorityCorpusDocument]) -> str:
    """Concatenates every document's own marked-up text
    (domain/ai_policy_builder/text_extraction.py, reused unchanged) under
    a per-file header, so the model sees the whole corpus as one body of
    evidence rather than analysing documents independently
    (AI_AUTHORITY_BUILDER_ARCHITECTURE.md)."""
    parts = []
    for doc in documents:
        text = extract_text(doc.format, doc.content)
        parts.append(f"=== FILE: {doc.filename} ===\n{text}")
    return "\n\n".join(parts)


def run_extraction(
    db: Session, corpus: AuthorityCorpus, documents: list[AuthorityCorpusDocument], provider: AuthorityGraphExtractionProvider
) -> AuthorityCorpus:
    """AI_AUTHORITY_BUILDER_ARCHITECTURE.md's corpus extraction. On any
    failure, the corpus transitions to failed and the caller may retry
    without re-uploading, the same recovery posture every extraction
    pipeline in this platform already follows. Zero findings in any
    category is a valid outcome, not an error."""
    try:
        corpus_text = build_corpus_text(documents)
        graph: AuthorityGraph = provider.extract(corpus_text)
    except Exception as e:
        corpus.status = "failed"
        corpus.error = str(e)
        db.commit()
        raise

    for policy in graph.policies:
        db.add(
            PolicyExtractionCandidate(
                id=uuid.uuid4(),
                upload_id=None,
                corpus_id=corpus.id,
                content=candidate_to_content(policy),
                confidence=policy.confidence,
                missing_fields=list(policy.missing_fields),
                source_excerpt=policy.source_excerpt,
                source_location=policy.source_location,
                status="pending_review",
            )
        )

    for p in graph.principals:
        db.add(
            AuthorityPrincipal(
                id=uuid.uuid4(), corpus_id=corpus.id, name=p.name, role=p.role, reports_to=p.reports_to,
                confidence=p.confidence, source_excerpt=p.source_excerpt, source_location=p.source_location,
            )
        )

    for r in graph.resources:
        db.add(
            AuthorityResource(
                id=uuid.uuid4(), corpus_id=corpus.id, name=r.name, description=r.description,
                confidence=r.confidence, source_excerpt=r.source_excerpt, source_location=r.source_location,
            )
        )

    for o in graph.operations:
        db.add(
            AuthorityOperation(
                id=uuid.uuid4(), corpus_id=corpus.id, name=o.name, description=o.description,
                confidence=o.confidence, source_excerpt=o.source_excerpt, source_location=o.source_location,
            )
        )

    for rel in graph.relationships:
        db.add(
            AuthorityRelationship(
                id=uuid.uuid4(), corpus_id=corpus.id, kind=rel.kind,
                from_principal=rel.from_principal, to_principal=rel.to_principal,
                description=rel.description, confidence=rel.confidence,
                source_excerpt=rel.source_excerpt, source_location=rel.source_location,
            )
        )

    for c in graph.conflicts:
        db.add(
            AuthorityConflict(
                id=uuid.uuid4(), corpus_id=corpus.id, description=c.description,
                reasoning=c.reasoning, confidence=c.confidence,
            )
        )

    for g in graph.gaps:
        db.add(
            AuthorityGap(
                id=uuid.uuid4(), corpus_id=corpus.id, description=g.description, confidence=g.confidence,
                source_excerpt=g.source_excerpt, source_location=g.source_location,
            )
        )

    for q in graph.questions:
        db.add(
            AuthorityQuestion(
                id=uuid.uuid4(), corpus_id=corpus.id, question=q.question, context=q.context,
            )
        )

    corpus.status = "extracted"
    db.commit()
    db.refresh(corpus)
    return corpus


def list_corpora(db: Session) -> list[AuthorityCorpus]:
    return list(db.scalars(select(AuthorityCorpus).order_by(AuthorityCorpus.created_at.desc())))


def get_corpus(db: Session, corpus_id: uuid.UUID) -> AuthorityCorpus:
    corpus = db.get(AuthorityCorpus, corpus_id)
    if corpus is None:
        raise CorpusNotFoundError(str(corpus_id))
    return corpus


def list_documents(db: Session, corpus_id: uuid.UUID) -> list[AuthorityCorpusDocument]:
    return list(
        db.scalars(select(AuthorityCorpusDocument).where(AuthorityCorpusDocument.corpus_id == corpus_id))
    )


def _list(db: Session, model, corpus_id: uuid.UUID):
    return list(db.scalars(select(model).where(model.corpus_id == corpus_id).order_by(model.created_at.desc())))


def list_principals(db: Session, corpus_id: uuid.UUID) -> list[AuthorityPrincipal]:
    return _list(db, AuthorityPrincipal, corpus_id)


def list_resources(db: Session, corpus_id: uuid.UUID) -> list[AuthorityResource]:
    return _list(db, AuthorityResource, corpus_id)


def list_operations(db: Session, corpus_id: uuid.UUID) -> list[AuthorityOperation]:
    return _list(db, AuthorityOperation, corpus_id)


def list_relationships(db: Session, corpus_id: uuid.UUID) -> list[AuthorityRelationship]:
    return _list(db, AuthorityRelationship, corpus_id)


def list_conflicts(db: Session, corpus_id: uuid.UUID) -> list[AuthorityConflict]:
    return _list(db, AuthorityConflict, corpus_id)


def list_gaps(db: Session, corpus_id: uuid.UUID) -> list[AuthorityGap]:
    return _list(db, AuthorityGap, corpus_id)


def list_questions(db: Session, corpus_id: uuid.UUID) -> list[AuthorityQuestion]:
    return _list(db, AuthorityQuestion, corpus_id)


def answer_question(db: Session, question_id: uuid.UUID, answer: str) -> AuthorityQuestion:
    question = db.get(AuthorityQuestion, question_id)
    if question is None:
        raise QuestionNotFoundError(str(question_id))
    question.answer = answer
    question.answered = True
    db.commit()
    db.refresh(question)
    return question
