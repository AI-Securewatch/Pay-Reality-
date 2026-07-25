"""Constraints: qualifiers on a RuntimePolicy beyond its match conditions.

A Condition (conditions.py) is evaluated against an incoming Intent's
fields at decision time. A Constraint is a property of the policy itself,
declared at authoring time, that shapes how the policy may be used
regardless of what any single Intent contains.
"""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass(frozen=True)
class Constraints:
    delegated_by: str | None = None
    expires: datetime | None = None
    # Every decision produces Evidence unconditionally today (see
    # PRODUCT.md / ARCHITECTURE.md); this field exists so a RuntimePolicy
    # can eventually express an exception to that, but nothing reads or
    # enforces it yet (see RUNTIME_POLICY_LANGUAGE.md's migration path).
    # Defaults to True to match today's actual unconditional behavior.
    evidence_required: bool = True
    risk_level: RiskLevel | None = None
