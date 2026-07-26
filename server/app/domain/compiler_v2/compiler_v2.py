"""Compiler V2's orchestration: RuntimePolicy list -> validated -> Rego
generated -> assembled into one PolicyBundle, or a CompilerDiagnostics
explaining exactly why not. Never raises for a normal compilation
failure; see compiler_errors.py.

This module owns the one thing DOMAIN_ABSTRACTION.md scoped as
"adapter-owned": which action names are valid. It does so through an
injectable Vocabulary rather than a hardcoded list, so the compiler
itself stays domain-agnostic even though its one shipped default
(FINANCIAL_VOCABULARY) is not. This is the concrete implementation of
DOMAIN_REFACTOR_PLAN.md's item 2 and item 3, scoped to what this phase
actually needs.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from app.domain.runtime_policy.conditions import Operator
from app.domain.runtime_policy.runtime_policy import RuntimePolicy
from app.domain.runtime_policy.validators import validate as validate_runtime_policy

from app.domain.compiler_v2.bundle_builder import PolicyBundle, build_bundle
from app.domain.compiler_v2.compiler_errors import (
    CONFLICTING_POLICY_STRUCTURE,
    INVALID_ACTION,
    INVALID_RESOURCE,
    INVALID_RUNTIME_POLICY,
    CompilerDiagnostics,
    CompilerError,
)

_NUMERIC_OPERATORS = {Operator.LTE, Operator.GTE, Operator.LT, Operator.GT}


class Vocabulary(Protocol):
    """What a domain adapter must answer for Compiler V2 to validate
    actions against it (DOMAIN_ABSTRACTION.md). Deliberately minimal: this
    phase does not implement field-vocabulary validation, only action
    validation, since that's the only vocabulary check this directive's
    validation list actually asks for."""

    def is_valid_action(self, action: str) -> bool: ...


@dataclass(frozen=True)
class FinancialVocabulary:
    """Today's actual KNOWN_SCOPES (scope_vocabulary.py), reused here
    rather than re-invented, so this default reflects the one real
    adapter that exists rather than a guess at what it should contain."""

    known_actions: frozenset[str] = frozenset(
        {"vendor_payment", "purchase_order_create", "wire_transfer"}
    )

    def is_valid_action(self, action: str) -> bool:
        return action in self.known_actions


FINANCIAL_VOCABULARY = FinancialVocabulary()


@dataclass(frozen=True)
class CompileResult:
    bundle: PolicyBundle | None
    diagnostics: CompilerDiagnostics

    @property
    def ok(self) -> bool:
        return self.diagnostics.ok and self.bundle is not None


def _validate_policy_against_vocabulary(
    policy: RuntimePolicy, vocabulary: Vocabulary
) -> list[CompilerError]:
    errors: list[CompilerError] = []
    if not vocabulary.is_valid_action(policy.scope.action):
        errors.append(
            CompilerError(
                code=INVALID_ACTION,
                message=f"'{policy.scope.action}' is not a recognized action for this domain",
                policy_id=policy.id,
                path="scope.action",
            )
        )
    if policy.scope.resource is not None and not policy.scope.resource.strip():
        errors.append(
            CompilerError(
                code=INVALID_RESOURCE,
                message="scope.resource, if present, must not be blank",
                policy_id=policy.id,
                path="scope.resource",
            )
        )
    return errors


def _numeric_conflicts(policies: list[RuntimePolicy]) -> list[CompilerError]:
    """Bounded, honest conflict detection (POLICY_COMPILER_V2.md): not a
    general theorem prover. Two named, practical checks only:

    1. Same (principal, action), both constrain the same field with a
       numeric operator, different values: flagged, since two different
       limits for what's nominally the same scope is ambiguous.
    2. Same (principal, action), both constrain the same field with `==`,
       different values: flagged, since no real Intent could satisfy
       both simultaneously.

    Every other combination (different fields, three-or-more-way
    interactions, anything requiring real boolean satisfiability) is
    explicitly out of scope, not silently treated as "no conflict" by
    omission, named here and in COMPILER_V2_ARCHITECTURE.md.
    """
    errors: list[CompilerError] = []
    by_scope: dict[tuple[str, str], list[RuntimePolicy]] = {}
    for p in policies:
        by_scope.setdefault((p.scope.principal, p.scope.action), []).append(p)

    for (principal, action), group in by_scope.items():
        if len(group) < 2:
            continue
        for i, p1 in enumerate(group):
            for p2 in group[i + 1 :]:
                errors.extend(_pairwise_conflicts(p1, p2, principal, action))

    return errors


def _pairwise_conflicts(
    p1: RuntimePolicy, p2: RuntimePolicy, principal: str, action: str
) -> list[CompilerError]:
    errors: list[CompilerError] = []
    for c1 in p1.conditions.all:
        for c2 in p2.conditions.all:
            if c1.field != c2.field:
                continue
            if c1.operator in _NUMERIC_OPERATORS and c2.operator == c1.operator:
                if c1.value != c2.value:
                    errors.append(
                        _conflict_error(p1, p2, principal, action, c1.field, c1.value, c2.value)
                    )
            elif c1.operator == Operator.EQ and c2.operator == Operator.EQ:
                if c1.value != c2.value:
                    errors.append(
                        _conflict_error(p1, p2, principal, action, c1.field, c1.value, c2.value)
                    )
    return errors


def _conflict_error(p1, p2, principal, action, field_name, v1, v2) -> CompilerError:
    return CompilerError(
        code=CONFLICTING_POLICY_STRUCTURE,
        message=(
            f"policies '{p1.id}' and '{p2.id}' both apply to principal '{principal}' "
            f"action '{action}' and constrain '{field_name}' with conflicting values "
            f"({v1!r} vs {v2!r})"
        ),
        policy_id=p1.id,
        path=field_name,
    )


def compile_bundle(
    policies: list[RuntimePolicy],
    bundle_id: str,
    bundle_version: int,
    vocabulary: Vocabulary = FINANCIAL_VOCABULARY,
    now: datetime | None = None,
) -> CompileResult:
    """The only entry point this package expects callers to use. Always
    returns a CompileResult; bundle is None whenever diagnostics has any
    error. Runs, in order: RuntimePolicy structural validation (reused
    from Phase 1, not reimplemented), vocabulary validation (action,
    resource), conflict detection, then, only if all of that is clean,
    Rego generation and bundle assembly."""
    errors: list[CompilerError] = []

    for policy in policies:
        result = validate_runtime_policy(policy)
        if not result.ok:
            for e in result.errors:
                errors.append(
                    CompilerError(
                        code=INVALID_RUNTIME_POLICY,
                        message=f"{e.code}: {e.message}",
                        policy_id=policy.id,
                        path=e.field,
                    )
                )
        errors.extend(_validate_policy_against_vocabulary(policy, vocabulary))

    errors.extend(_numeric_conflicts(policies))

    if errors:
        return CompileResult(bundle=None, diagnostics=CompilerDiagnostics(errors=tuple(errors)))

    bundle = build_bundle(policies, bundle_id=bundle_id, bundle_version=bundle_version, now=now)
    return CompileResult(bundle=bundle, diagnostics=CompilerDiagnostics())
