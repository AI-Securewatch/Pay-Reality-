"""Condition language, V1: a flat, non-nested "all of these must hold" set.

No OR, no nested logic, no scripting, no loops. This is deliberate, not an
omission (see RUNTIME_POLICY_LANGUAGE.md): it keeps every RuntimePolicy
something a compiler can translate deterministically and something a
human reviewer can read top to bottom without mentally executing it.

Pure data, no validation logic. Whether a Condition or ConditionSet is
actually well-formed is entirely validators.py's job; these dataclasses
never raise for a value that's merely wrong, only accept whatever they're
given and let validation report it structurally.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Operator(str, Enum):
    LTE = "<="
    GTE = ">="
    EQ = "=="
    NEQ = "!="
    LT = "<"
    GT = ">"
    IN = "in"


@dataclass(frozen=True)
class Condition:
    """One comparison: <field> <operator> <value>.

    `field` is a dot-path (e.g. "vendor.approved") into whatever an
    Intent carries. Which dot-paths and value types are actually
    meaningful is owned by the active domain adapter
    (DOMAIN_ABSTRACTION.md), not by this module: this module only knows
    the shape of a condition, never its vocabulary.
    """

    field: str
    operator: Operator
    value: Any


@dataclass(frozen=True)
class ConditionSet:
    """V1 supports exactly one grouping: `all` (logical AND).

    No `any` (OR), no nesting a ConditionSet inside another, no negation.
    Adding those later is an additive language version
    (POLICY_LANGUAGE_SPEC.md's own versioning discipline), not a change
    to this module's shape.
    """

    all: tuple[Condition, ...] = field(default_factory=tuple)
