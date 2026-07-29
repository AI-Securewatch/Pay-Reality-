"""Whether two RuntimePolicies could both match the same real Intent.

Supersedes compiler_v2.py's original "same field, same operator, different
value" heuristic (POLICY_COMPILER_V2.md's original scoping, written before
this compiler existed, assumed general cross-field conflict detection was
SMT-solver territory and explicitly scoped it out). That assumption held
for an unrestricted condition language; it doesn't hold for the one
RuntimePolicy actually has. ConditionSet is flat-AND-only and every
Condition names exactly one field (conditions.py: "No `any` (OR), no
nesting... no cross-field relations expressible at all"). Because fields
are never related to each other, "can P1 and P2's conditions both hold for
some input" decomposes exactly into "is P1's constraint on field F jointly
satisfiable with P2's constraint on field F, for every field either one
touches" -- an interval-intersection check per field, not a satisfiability
search over their combination. That makes this exact for every operator
except `contains`/`exists`, which have no interval structure to reason
about; those fall back to "assume it can overlap," the same fail-closed
default this compiler already uses for structural conflicts (never
silently treated as no-conflict by omission).

This module answers one question only -- policies_can_jointly_match --
and knows nothing about CompilerError/diagnostics; compiler_v2.py owns
turning "yes, they can" into a reported conflict.
"""

from dataclasses import dataclass, field

from app.domain.runtime_policy.conditions import Condition, Operator
from app.domain.runtime_policy.runtime_policy import RuntimePolicy

_INCONCLUSIVE_OPERATORS = {Operator.CONTAINS, Operator.EXISTS}

_Bound = tuple[object, bool] | None  # (value, inclusive) or None meaning unbounded


@dataclass(frozen=True)
class _FieldConstraint:
    lo: _Bound = None
    hi: _Bound = None
    eq: object = None
    neq: frozenset = field(default_factory=frozenset)
    in_set: frozenset | None = None
    inconclusive: bool = False


def _tighter_lo(a: _Bound, b: _Bound) -> _Bound:
    if a is None:
        return b
    if b is None:
        return a
    av, ai = a
    bv, bi = b
    if av > bv:
        return a
    if bv > av:
        return b
    return (av, ai and bi)


def _tighter_hi(a: _Bound, b: _Bound) -> _Bound:
    if a is None:
        return b
    if b is None:
        return a
    av, ai = a
    bv, bi = b
    if av < bv:
        return a
    if bv < av:
        return b
    return (av, ai and bi)


def _build_field_constraint(conditions: list[Condition]) -> _FieldConstraint:
    lo: _Bound = None
    hi: _Bound = None
    eq = None
    neq: set = set()
    in_set: frozenset | None = None
    inconclusive = False

    for c in conditions:
        if c.operator == Operator.LTE:
            hi = _tighter_hi(hi, (c.value, True))
        elif c.operator == Operator.LT:
            hi = _tighter_hi(hi, (c.value, False))
        elif c.operator == Operator.GTE:
            lo = _tighter_lo(lo, (c.value, True))
        elif c.operator == Operator.GT:
            lo = _tighter_lo(lo, (c.value, False))
        elif c.operator == Operator.EQ:
            eq = c.value if eq is None else eq
        elif c.operator == Operator.NEQ:
            neq.add(c.value)
        elif c.operator == Operator.IN:
            try:
                values = frozenset(c.value)
            except TypeError:
                inconclusive = True
                continue
            in_set = values if in_set is None else (in_set & values)
        elif c.operator in _INCONCLUSIVE_OPERATORS:
            inconclusive = True
        else:
            # A future Operator this module has no case for: fail safe,
            # not silent, matching every other "unknown" branch in this
            # compiler (rego_generator.generate_condition_expression
            # raises for the same reason).
            inconclusive = True

    return _FieldConstraint(lo=lo, hi=hi, eq=eq, neq=frozenset(neq), in_set=in_set, inconclusive=inconclusive)


def _fields_can_overlap(c1: _FieldConstraint, c2: _FieldConstraint) -> bool:
    """Could a single value for this one field satisfy both constraints?"""
    if c1.inconclusive or c2.inconclusive:
        return True

    lo = _tighter_lo(c1.lo, c2.lo)
    hi = _tighter_hi(c1.hi, c2.hi)

    if c1.eq is not None and c2.eq is not None and c1.eq != c2.eq:
        return False
    for eq in (c1.eq, c2.eq):
        if eq is not None:
            lo = _tighter_lo(lo, (eq, True))
            hi = _tighter_hi(hi, (eq, True))

    if c1.in_set is not None and c2.in_set is not None and not (c1.in_set & c2.in_set):
        return False

    if lo is not None and hi is not None:
        lo_val, lo_incl = lo
        hi_val, hi_incl = hi
        if lo_val > hi_val:
            return False
        if lo_val == hi_val:
            if not (lo_incl and hi_incl):
                return False
            if lo_val in c1.neq or lo_val in c2.neq:
                return False

    return True


def _scopes_can_overlap(p1: RuntimePolicy, p2: RuntimePolicy) -> bool:
    if p1.scope.principal != p2.scope.principal:
        return False
    if p1.scope.action != p2.scope.action:
        return False
    if p1.scope.agent is not None and p2.scope.agent is not None and p1.scope.agent != p2.scope.agent:
        return False
    if p1.scope.resource is not None and p2.scope.resource is not None and p1.scope.resource != p2.scope.resource:
        return False
    return True


def policies_can_jointly_match(p1: RuntimePolicy, p2: RuntimePolicy) -> bool:
    """True means some real Intent could satisfy both policies' scope and
    conditions at once -- a genuine ambiguity worth surfacing, regardless
    of whether the two policies' effects agree (compiler_v2.py's existing
    precedent already flags two `allow` policies with different amount
    caps for the same scope: same effect, still ambiguous authoring).
    False is a proof, not a guess, for every operator except
    contains/exists (see module docstring)."""
    if not _scopes_can_overlap(p1, p2):
        return False

    touched_fields = {c.field for c in p1.conditions.all} | {c.field for c in p2.conditions.all}
    for field_name in touched_fields:
        c1 = _build_field_constraint([c for c in p1.conditions.all if c.field == field_name])
        c2 = _build_field_constraint([c for c in p2.conditions.all if c.field == field_name])
        if not _fields_can_overlap(c1, c2):
            return False

    return True
