"""Effect: the outcome a RuntimePolicy declares for the Intents its
conditions match.

The same three-outcome contract the Runtime Authority Engine already
enforces at evaluation time (ARCHITECTURE.md's ALLOW/DENY/HUMAN_REVIEW),
renamed to match this module's own naming (REQUIRE_HUMAN_REVIEW is more
explicit as a *declared authoring intent* than HUMAN_REVIEW is; the
engine's own outcome vocabulary is unaffected by this, see
RUNTIME_POLICY_LANGUAGE.md for how the two relate).
"""

from enum import Enum


class Effect(str, Enum):
    ALLOW = "allow"
    DENY = "deny"
    REQUIRE_HUMAN_REVIEW = "require_human_review"
